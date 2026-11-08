// BC-31 (Movie Atlas step 5b, owner decision 2026-11-08): the user never sees empty or loading tiles at the
// bottom of the list while scrolling. Next page is prefetched by an IntersectionObserver sentinel (3 viewport
// heights ahead, no debounce), posters beyond the mounted window are pre-warmed, and the windowing overscan is
// asymmetric (more below when scrolling down) and velocity aware.
//
// TMDB is mocked with ARTIFICIAL LATENCY on the page API (300-800 ms) and on poster images (100-400 ms), both
// deterministic per URL. A requestAnimationFrame sampler runs inside the page during the scroll and records, per
// frame, whether a tile intersecting the viewport is blank (img not complete / naturalWidth 0), whether rows that
// should be mounted are missing (a bare spacer inside the viewport), and whether the end-of-list sentinel is inside
// the viewport while more pages remain.
//
// Thresholds (all deliberate):
//   BLANK_VISIBLE_FRAMES 0   wheel steps (2.4 viewport heights per second): not one frame with a blank, missing or
//                            starved tile inside the viewport after the cold start.
//   COLD_START_MS        3500 first screen incl. the Home load (page + posters) = api latency + poster latency + a frame; nothing can
//                            be prefetched before the first request, so sampling starts once the first screen has
//                            loaded and the cold start itself only has to finish within api max 800 + img max 400 +
//                            a generous margin for CI jitter.
//   LAND_MS              1000 after a fast flick has landed (offset unchanged for 100 ms) the viewport must be
//                            filled within one poster latency (400) + decode + jitter. While a fling is in flight
//                            faster than the poster latency, tiles cannot be loaded in time by any strategy (the
//                            target is only known when the wheel event arrives); those frames are REPORTED
//                            (PERF31 lines) but not asserted.
//   MAX_TILES            120 same bound as BC-24 (mounted tiles and img[src]).
const { test, expect, open, pageParams } = require('./helpers');

const MAX_TILES = 120;
const PAGE_SIZE = 20;
const KEY = 'movie-atlas-theme';
const COLD_START_MS = 3500;
const LAND_MS = 1000;
const API_MS = [300, 800];
const IMG_MS = [100, 400];

const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const delayFor = (key, [lo, hi]) => lo + (hash(key) % (hi - lo + 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const movieFor = (i) => {
  const p = Math.floor(i / PAGE_SIZE) + 1;
  const j = i % PAGE_SIZE;
  const id = 1000 + (p - 1) * PAGE_SIZE + j;
  return { id, title: `popular p${p} movie ${j}`, src: `https://image.tmdb.org/t/p/w500/poster${id}.jpg` };
};

/**
 * Latency + scripted failures on top of mockAll (routes registered later win). Options:
 *   totalPages   pages in the mocked list (default 40); `emptyBeyond` answers pages past it with `results: []`
 *                (and no total_pages) instead of reporting total_pages on every page.
 *   failures     { [page]: n } the first n requests of that page answer 500
 * Returns { times: [{page, at}], imgRequests: Map<url, n> }.
 */
async function slowNetwork(page, app, { totalPages = 40, emptyBeyond = false, failures = {}, api = API_MS, img = IMG_MS } = {}) {
  const t0 = Date.now();
  const info = { times: [], imgRequests: new Map() };
  const failLeft = { ...failures };
  await page.route(/https:\/\/api\.themoviedb\.org\/3\/movie\/popular\?/, async (route) => {
    const url = new URL(route.request().url());
    const pg = Number(url.searchParams.get('page') || 1);
    const { api_key, ...safe } = Object.fromEntries(url.searchParams.entries());
    app.api.push({ path: '/movie/popular', params: safe, hasKey: !!api_key, url: 'REDACTED' });
    info.times.push({ page: pg, at: Date.now() - t0 });
    await sleep(delayFor(`api${pg}${info.times.length % 3}`, api));
    const headers = { 'access-control-allow-origin': '*' };
    if (failLeft[pg] > 0) {
      failLeft[pg] -= 1;
      return route.fulfill({ status: 500, contentType: 'application/json', headers, body: JSON.stringify({ status_code: 11, status_message: 'Internal error' }) });
    }
    const beyond = pg > totalPages;
    const results = beyond ? [] : Array.from({ length: PAGE_SIZE }, (_, j) => {
      const m = movieFor((pg - 1) * PAGE_SIZE + j);
      return { id: m.id, original_title: m.title, title: m.title, poster_path: `/poster${m.id}.jpg`, overview: 'o', vote_average: 7, release_date: '2020-01-01' };
    });
    const body = emptyBeyond ? { page: pg, results } : { page: pg, total_pages: totalPages, results };
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify(body) });
  });
  await page.route('https://image.tmdb.org/**', async (route) => {
    const u = route.request().url();
    info.imgRequests.set(u, (info.imgRequests.get(u) || 0) + 1);
    await sleep(delayFor(u, img));
    await route.fallback();
  });
  return info;
}

/** Starts the in-page frame sampler. `more` = pages that can still be loaded (sentinel in view is then a gap). */
const startSampler = (page, { maxPages }) =>
  page.evaluate(({ maxPages: mp, pageSize }) => {
    const section = document.querySelector('section[data-scrollbar]');
    const content = document.querySelector('.scroll-content');
    const s = { frames: 0, blankFrames: 0, gapFrames: 0, trace: [], badVisible: 0, badMargin: 0, starved: 0, movingBad: 0, restingBad: 0, worstRestingMs: 0,
      worstBadMs: 0, maxTiles: 0, maxImgs: 0, maxNodes: 0, maxTotal: 0, firstBadAt: -1 };
    let restingSince = -1, badSince = -1, lastOffset = -1, lastMove = performance.now();
    const t0 = performance.now();
    const tick = () => {
      const now = performance.now();
      const rect = section.getBoundingClientRect();
      const offset = -new DOMMatrix(getComputedStyle(content).transform).m42;
      if (Math.abs(offset - lastOffset) > 0.01) lastMove = now;
      lastOffset = offset;
      const moving = now - lastMove < 100;
      const margin = 0.5 * rect.height;
      let blankVisible = 0, blankMargin = 0;
      const tiles = document.querySelectorAll('.poster-container');
      for (const t of tiles) {
        const r = t.getBoundingClientRect();
        if (r.bottom > rect.top && r.top < rect.bottom + margin) {
          const img = t.querySelector('img');
          if (!img || !(img.complete && img.naturalWidth > 0)) {
            if (r.top < rect.bottom && r.bottom > rect.top) blankVisible += 1; else blankMargin += 1;
          }
        }
      }
      // a bare spacer inside the viewport (or margin) means rows that should be mounted are not
      const spacers = document.querySelectorAll('.list-spacer');
      const total = Number(document.querySelector('.movieList-container')?.dataset.total || 0);
      let gapVisible = 0;
      const top = spacers[0]?.getBoundingClientRect(), bottom = spacers[1]?.getBoundingClientRect();
      if (top && top.height > 1 && top.bottom > rect.top + 1 && top.top < rect.bottom) gapVisible += 1;
      if (bottom && bottom.height > 1 && bottom.top < rect.bottom - 1 && bottom.bottom > rect.top) gapVisible += 1;
      const sentinel = document.querySelector('.list-sentinel')?.getBoundingClientRect();
      const starved = !!sentinel && sentinel.top < rect.bottom && total < mp * pageSize && total > 0;
      const bad = blankVisible > 0 || gapVisible > 0 || starved;
      s.frames += 1;
      if (blankVisible > 0 || gapVisible > 0) s.badVisible += 1;
      if (blankVisible > 0) s.blankFrames += 1;
      if (gapVisible > 0) s.gapFrames += 1;
      if (bad && s.trace.length < 400 && s.frames % 6 === 0) s.trace.push([Math.round(now - t0), Math.round(offset), blankVisible, gapVisible, starved ? 1 : 0, total]);
      if (blankMargin > 0) s.badMargin += 1;
      if (starved) s.starved += 1;
      if (bad) {
        if (s.firstBadAt < 0) s.firstBadAt = Math.round(now - t0);
        if (moving) s.movingBad += 1; else s.restingBad += 1;
        if (badSince < 0) badSince = now;
        s.worstBadMs = Math.max(s.worstBadMs, now - badSince);
      } else badSince = -1;
      if (bad && !moving) {
        if (restingSince < 0) restingSince = now;
        s.worstRestingMs = Math.max(s.worstRestingMs, now - restingSince);
      } else restingSince = -1;
      s.maxTiles = Math.max(s.maxTiles, tiles.length);
      s.maxImgs = Math.max(s.maxImgs, document.querySelectorAll('.poster[src]').length);
      s.maxNodes = Math.max(s.maxNodes, document.getElementsByTagName('*').length);
      s.maxTotal = Math.max(s.maxTotal, total);
      window.__sampler = s;
      window.__samplerRaf = requestAnimationFrame(tick);
    };
    tick();
  }, { maxPages, pageSize: PAGE_SIZE });

const stopSampler = (page) =>
  page.evaluate(() => {
    cancelAnimationFrame(window.__samplerRaf);
    const s = window.__sampler;
    return { ...s, worstBadMs: Math.round(s.worstBadMs), worstRestingMs: Math.round(s.worstRestingMs) };
  });

const state = (page) =>
  page.evaluate(() => {
    const section = document.querySelector('section[data-scrollbar]');
    const content = document.querySelector('.scroll-content');
    const grid = document.querySelector('.movieList-container');
    const tiles = Array.from(document.querySelectorAll('.poster-container')).map((t) => {
      const img = t.querySelector('img');
      return { id: Number(t.id), alt: img.getAttribute('alt'), src: img.getAttribute('src'), top: t.getBoundingClientRect().top - content.getBoundingClientRect().top, loaded: img.complete && img.naturalWidth > 0 };
    });
    return {
      offset: -new DOMMatrix(getComputedStyle(content).transform).m42,
      viewH: section.getBoundingClientRect().height,
      scrollHeight: content.scrollHeight,
      total: Number(grid?.dataset.total || 0),
      tiles,
      nodes: document.getElementsByTagName('*').length,
    };
  });

/** Home first; waits for its (slow) page-1 load, so the list is not empty (BC-07) when the link is clicked. */
async function openHome(page) {
  const loaded = page.waitForResponse((r) => /movie\/popular\?/.test(r.url()));
  await open(page, '/home');
  await loaded;
  await page.waitForTimeout(150);
}

/** Opens Popular through the header (list mounts with data already loaded) at the current viewport width. */
async function openPopular(page, mode) {
  await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
  await openHome(page);
  if (page.viewportSize().width <= 600) {
    await page.locator('.header-mobile-container button.icon').click();
    await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
  } else {
    await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
  }
  await page.locator('.poster').first().waitFor();
}

const allLoaded = (page) => page.waitForFunction(() =>
  Array.from(document.querySelectorAll('.poster')).every((i) => i.complete && i.naturalWidth > 0));

/** Wheel steps of `stepVh` viewport heights every `gapMs` until `done(state)`. */
async function wheelSteps(page, { stepVh = 0.12, gapMs = 50, done, maxMs = 120000 }) {
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);
  const deadline = Date.now() + maxMs;
  for (let i = 0; ; i++) {
    if (i % 4 === 0) {
      const s = await state(page);
      if (done(s)) return s;
      if (Date.now() > deadline) throw new Error(`scroll did not finish: ${s.total} tiles at offset ${Math.round(s.offset)}`);
    }
    await page.mouse.wheel(0, Math.round(stepVh * vp.height));
    await page.waitForTimeout(gapMs);
    // Measurement of the pre-5b build only (E2E_SCROLL_PAUSE=1): its 600 ms debounce needs a pause to fire at all.
    if (process.env.E2E_SCROLL_PAUSE && i % 10 === 9) await page.waitForTimeout(750);
  }
}

/**
 * Cold start: the first screen needs a page + posters, and the prefetch buffer ahead of it needs more pages (api latency each,
 * two at a time). The scripted scroll starts once that initial burst is over (no new page request for 1.6 s, longer than the
 * slowest mocked page), which is the "first load" tolerance of BC-31: a user who scrolls within the first seconds on a slow
 * network can outrun the first pages; nothing can be prefetched before the first request.
 */
async function waitForBuffer(page, app) {
  let last = -1, since = Date.now();
  for (let i = 0; i < 400; i++) {
    const n = pageParams(app, '/movie/popular').length;
    if (n !== last) { last = n; since = Date.now(); } else if (Date.now() - since > 1600) break;
    await page.waitForTimeout(100);
  }
  await allLoaded(page);
}

async function settle(page, ms = 600) {
  let last = -1, since = Date.now();
  for (let i = 0; i < 300; i++) {
    const { offset } = await state(page);
    if (Math.abs(offset - last) > 0.01) { last = offset; since = Date.now(); }
    else if (Date.now() - since >= ms) return;
    await page.waitForTimeout(50);
  }
  throw new Error('scroll never settled');
}

/** Pages must be requested once each and in order (BC-25), apart from the BC-10 stale-closure burst. */
const expectOnceInOrder = (app, { quirk = false } = {}) => {
  const params = pageParams(app, '/movie/popular');
  const expected = quirk ? ['1', '1', '2', '2', '2', '2', '2'] : ['1', '1'];
  expect(params.slice(0, expected.length), 'first requests').toEqual(expected);
  const rest = params.slice(expected.length).map(Number);
  const first = quirk ? 7 : 2;
  // Requests are issued in page order (at most two in flight; the list commits them in order).
  expect(rest, 'one request per page, in order, no gap, no duplicate').toEqual(rest.map((_, k) => first + k));
  return params.length - expected.length;
};

const perf = (name, summary) => console.log(`PERF31 ${name} ${JSON.stringify(summary)}`);

test.describe('BC-31 prefetch and no empty tiles (latency mocked)', () => {
  test.setTimeout(180000);

  test('BC-31 a, b, c, d: wheel steps through 25 pages with api 300-800 ms and posters 100-400 ms', async ({ page, app }, testInfo) => {
    const net = await slowNetwork(page, app);
    const nav0 = Date.now();
    await openPopular(page, 'dark');
    await allLoaded(page);
    const coldMs = Date.now() - nav0;
    await waitForBuffer(page, app);
    const first = await state(page);
    const firstTiles = first.tiles.slice(0, PAGE_SIZE).map(({ id, alt, src }) => ({ id, alt, src }));
    const cols = first.tiles.filter((t) => Math.abs(t.top - first.tiles[0].top) < 0.5).length;
    const rows0 = Math.ceil(first.total / cols);
    const pitch = first.tiles.find((t) => t.top - first.tiles[0].top > 1).top - first.tiles[0].top;
    const chrome = first.scrollHeight - rows0 * pitch; // everything that is not tile rows (padding, button area)

    await startSampler(page, { maxPages: 40 });
    const end = await wheelSteps(page, { done: (s) => s.total >= 25 * PAGE_SIZE });
    await settle(page);
    const sampler = await stopSampler(page);
    const final = await state(page);
    const requestsPerPage = Object.fromEntries(Object.entries(pageParams(app, '/movie/popular').reduce((m, p) => ({ ...m, [p]: (m[p] || 0) + 1 }), {})));
    perf('wheel-1280', { coldMs, ...sampler, trace: undefined, domNodes: final.nodes, scrollHeight: final.scrollHeight, total: final.total, requestsPerPage });
    if (process.env.E2E_TRACE) console.log('TRACE ' + JSON.stringify(sampler.trace) + ' API ' + JSON.stringify(net.times.map((t) => [t.page, t.at])));
    await testInfo.attach('perf31-wheel.json', { body: JSON.stringify({ coldMs, ...sampler }, null, 2), contentType: 'application/json' });

    // (a) nothing blank / missing / starved in the viewport after the cold start
    expect(coldMs, 'cold start (first screen)').toBeLessThan(COLD_START_MS);
    expect(sampler.badVisible, 'frames with a blank or missing tile in the viewport').toBe(0);
    expect(sampler.starved, 'frames with the list end inside the viewport while pages remain').toBe(0);
    // (b) every page once, in order
    const extra = expectOnceInOrder(app);
    expect(end.total).toBeGreaterThanOrEqual(25 * PAGE_SIZE);
    expect(extra + 1, 'pages requested so far').toBeGreaterThanOrEqual(25);
    // (c) memory stays bounded and the scroll height equals the all-rendered layout
    expect(sampler.maxTiles, 'mounted tiles').toBeLessThan(MAX_TILES);
    expect(sampler.maxImgs, 'img[src]').toBeLessThan(MAX_TILES);
    expect(sampler.maxNodes - first.nodes, 'DOM nodes added').toBeLessThan(400);
    expect(Math.abs(final.scrollHeight - (chrome + Math.ceil(final.total / cols) * pitch)), 'scroll height vs all-rendered layout').toBeLessThanOrEqual(1);
    // no page requested twice (also for the posters: a tile mounts at most a few times, never per frame)
    expect(Math.max(...Object.values(requestsPerPage).slice(2))).toBe(1);
    // (d) back at the top: the first load's tiles
    await page.mouse.wheel(0, -1000000);
    await settle(page);
    await allLoaded(page);
    const back = await state(page);
    expect(back.offset).toBeLessThan(1);
    expect(back.tiles.slice(0, PAGE_SIZE).map(({ id, alt, src }) => ({ id, alt, src }))).toEqual(firstTiles);
    expect(net.times.length).toBe(pageParams(app, '/movie/popular').length);
  });

  test('BC-31 a, b: fast flicks (2000 px every 700 ms) fill the viewport within one poster latency of landing', async ({ page, app }, testInfo) => {
    await slowNetwork(page, app);
    await openPopular(page, 'dark');
    await allLoaded(page);
    await waitForBuffer(page, app);
    await startSampler(page, { maxPages: 40 });
    const vp = page.viewportSize();
    await page.mouse.move(vp.width / 2, vp.height / 2);
    for (let i = 0; i < 40; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(700);
      if ((await state(page)).total >= 25 * PAGE_SIZE) break;
    }
    await settle(page);
    await page.waitForTimeout(500);
    const sampler = await stopSampler(page);
    const final = await state(page);
    perf('flick-1280', { ...sampler, total: final.total, requests: pageParams(app, '/movie/popular').length });
    await testInfo.attach('perf31-flick.json', { body: JSON.stringify(sampler, null, 2), contentType: 'application/json' });
    expect(sampler.worstRestingMs, 'blank / starved time after a flick has landed').toBeLessThan(LAND_MS);
    expect(sampler.maxTiles).toBeLessThan(MAX_TILES);
    expect(sampler.maxImgs).toBeLessThan(MAX_TILES);
    expectOnceInOrder(app);
    expect(final.tiles.every((t) => t.loaded)).toBe(true);
  });

  test('BC-31 f: a 500 mid-scroll is retried with backoff, no tight loop, no duplicate or skipped page', async ({ page, app }) => {
    const net = await slowNetwork(page, app, { failures: { 5: 2 } });
    await openPopular(page, 'dark');
    await allLoaded(page);
    await wheelSteps(page, { done: (s) => s.total >= 8 * PAGE_SIZE, maxMs: 90000 });
    const attempts = net.times.filter((t) => t.page === 5).map((t) => t.at);
    expect(attempts.length, 'page 5 asked for 3 times (2 failures, 1 success)').toBe(3);
    // backoff: >= ~1 s after the first failure, >= ~2 s after the second (timing from request start, minus latency jitter)
    expect(attempts[1] - attempts[0], 'first retry waits').toBeGreaterThan(900);
    expect(attempts[2] - attempts[1], 'second retry waits longer').toBeGreaterThan(1900);
    // while page 5 was failing at most one page beyond it (6, requested together with 5) was asked for; nothing further
    const order = net.times.map((t) => t.page);
    expect(order.slice(0, order.lastIndexOf(5) + 1).filter((p) => p > 6)).toEqual([]);
    // every page other than 1 (initial + nav click) and 5 (two failures + success) was requested exactly once
    const params = pageParams(app, '/movie/popular').map(Number);
    const counts = new Map();
    for (const p of params) counts.set(p, (counts.get(p) || 0) + 1);
    for (const [p, n] of counts) expect(n, `page ${p} requests`).toBe(p === 1 ? 2 : p === 5 ? 3 : 1);
    expect([...counts.keys()].sort((a, b) => a - b), 'no skipped page').toEqual([...counts.keys()].map((_, k) => k + 1));
    // the browser logs one console error per failed HTTP response; these two are the scripted ones
    const unexpected = app.consoleErrors.filter((e) => !/status of 500/.test(e));
    expect(unexpected).toEqual([]);
    app.consoleErrors.length = 0;
  });

  test('BC-31 f2: a network failure (aborted request) is retried too', async ({ page, app }) => {
    let abortsLeft = 2;
    await slowNetwork(page, app);
    await page.route(/https:\/\/api\.themoviedb\.org\/3\/movie\/popular\?.*page=4(&|$)/, async (route) => {
      if (abortsLeft > 0) { abortsLeft -= 1; return route.abort('failed'); }
      return route.fallback();
    });
    await openPopular(page, 'dark');
    await allLoaded(page);
    await wheelSteps(page, { done: (s) => s.total >= 6 * PAGE_SIZE, maxMs: 90000 });
    expect(abortsLeft).toBe(0);
    const params = pageParams(app, '/movie/popular').map(Number);
    expect(params.filter((p) => p === 4), 'page 4 is requested once by the app after the aborted ones').toHaveLength(1);
    // pages are requested up to two at a time, so the order of requests may interleave; each page exactly once, none skipped
    const rest = params.filter((p) => p > 1).sort((x, y) => x - y);
    expect(rest).toEqual(rest.map((_, k) => k + 2));
    app.consoleErrors.length = 0; // aborted requests log "Failed to load resource"
  });

  for (const emptyBeyond of [false, true]) {
    test(`BC-31 g: end of results stops the requests (${emptyBeyond ? 'empty page after the last' : 'total_pages reached'})`, async ({ page, app }) => {
      await slowNetwork(page, app, { totalPages: 6, emptyBeyond });
      await openPopular(page, 'dark');
      await allLoaded(page);
      await wheelSteps(page, { done: (s) => s.total >= 6 * PAGE_SIZE, maxMs: 60000 });
      await page.waitForTimeout(500);
      const before = pageParams(app, '/movie/popular').length;
      // keep scrolling at the bottom and wait longer than the longest backoff step would take to matter
      for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(100); }
      await page.waitForTimeout(4000);
      const params = pageParams(app, '/movie/popular').map(Number);
      expect(params.length, 'no request after the end').toBe(before);
      expect(Math.max(...params)).toBeLessThanOrEqual(emptyBeyond ? 8 : 6); // empty variant (no total_pages): at most the two requests in flight probe past the last page
      expect((await state(page)).total).toBe(6 * PAGE_SIZE);
    });
  }

  test.describe('tablet 900x1000 (BC-10 quirk)', () => {
    test.use({ viewport: { width: 900, height: 1000 } });
    test('BC-31 BC-10 interplay: the five auto-clicks keep their request pattern, the prefetch continues from page 7', async ({ page, app }) => {
      await slowNetwork(page, app);
      await openHome(page);
      await expect(page.locator('.home-contianer')).toBeVisible();
      await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
      await page.locator('.poster').first().waitFor();
      await expect.poll(() => app.logs.filter((l) => l === 'clicked').length).toBe(5);
      await expect.poll(() => pageParams(app, '/movie/popular').length, { timeout: 15000 }).toBeGreaterThanOrEqual(7);
      await page.waitForTimeout(3000);
      const params = pageParams(app, '/movie/popular');
      // the BC-10 pattern is exactly as before (initial, nav click, five stale page=2 requests) ...
      expect(params.slice(0, 7)).toEqual(['1', '1', '2', '2', '2', '2', '2']);
      // ... and the prefetch, held back until the five appends changed the list, continues the numbering from 7
      const rest = params.slice(7).map(Number);
      expect(rest.length).toBeGreaterThan(0);
      expect(rest).toEqual(rest.map((_, k) => 7 + k));
      expect(app.logs.filter((l) => l === 'clicked')).toHaveLength(5);
    });
  });
});

// Same walk at the four widths and both themes (shorter run), plus one 25-page pass per theme at 1280 above.
for (const mode of ['dark', 'light']) {
  for (const [width, height, pages] of [[320, 640, 3], [768, 1024, 6], [1024, 768, 6], [1920, 1080, 6]]) {
    test.describe(`BC-31 ${mode} ${width}x${height}`, () => {
      test.use({ viewport: { width, height } });
      test.setTimeout(240000);

      test(`no empty tile while scrolling ${pages} pages, bounded, same tiles back at the top (${mode}, ${width}px)`, async ({ page, app }) => {
        const quirk = width >= 768 && width <= 1024;
        await slowNetwork(page, app);
        await openPopular(page, mode);
        await allLoaded(page);
        await waitForBuffer(page, app);
        const first = await state(page);
        const firstTiles = first.tiles.slice(0, PAGE_SIZE).map(({ id, alt, src }) => [id, alt, src]);
        await startSampler(page, { maxPages: 40 });
        // scrolled through `pages` pages: that many loaded and the viewport within 5 viewports of the loaded end
        // (the prefetch keeps the end 3+ viewports ahead, and the BC-10 quirk widths start with 40 tiles loaded already)
        const end = await wheelSteps(page, { done: (s) => s.total >= pages * PAGE_SIZE && s.scrollHeight - (s.offset + s.viewH) < 5 * s.viewH, stepVh: width <= 600 ? 0.1 : 0.12 });
        await settle(page);
        const sampler = await stopSampler(page);
        perf(`wheel-${mode}-${width}`, { ...sampler, total: end.total });
        expect(sampler.badVisible, 'blank or missing tile in the viewport').toBe(0);
        expect(sampler.starved, 'list end inside the viewport while pages remain').toBe(0);
        expect(sampler.maxTiles).toBeLessThan(MAX_TILES);
        expect(sampler.maxImgs).toBeLessThan(MAX_TILES);
        expectOnceInOrder(app, { quirk });
        await page.mouse.wheel(0, -1000000);
        await settle(page);
        await allLoaded(page);
        const top = await state(page);
        // same movies, order and images as the first load for every tile mounted in both (the window below the viewport
        // is 0.5 viewport after scrolling up but 1.75 after the first load, so fewer tiles may be mounted at the top)
        const common = Math.min(top.tiles.length, firstTiles.length);
        expect(common).toBeGreaterThan(0);
        expect(top.tiles.slice(0, common).map(({ id, alt, src }) => [id, alt, src])).toEqual(firstTiles.slice(0, common));
      });
    });
  }
}
