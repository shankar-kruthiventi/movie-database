// BC-24..BC-28 (Movie Atlas step 5): windowed poster grid + IntersectionObserver sentinel.
// TMDB is mocked with 40 generated pages of 20 movies (e2e/helpers.js mocks everything else), so the tests can
// scroll through 25 pages (500 tiles). Thresholds are deliberately generous and documented where they are used:
//   MAX_TILES  120   mounted .poster-container at any sampled moment (needs ~100 at 1920 px wide, ~10 on a phone)
//   POS_TOL    1 px  tile position vs the "all tiles rendered" formula (flex layout snaps to 1/64 px)
//   JUMP_TOL   0.5px scroll offset change that is not caused by the user
//   HEAP       JS heap growth between 5 and 25 pages is only loosely bounded (GC timing makes it noisy)
const { test, expect, open, openListViaNav, pageParams } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;

const MAX_TILES = 120;
const POS_TOL = 1;
const PAGE_SIZE = 20;
const KEY = 'movie-atlas-theme';

const movieFor = (i) => {
  const p = Math.floor(i / PAGE_SIZE) + 1;
  const j = i % PAGE_SIZE;
  const id = 1000 + (p - 1) * PAGE_SIZE + j;
  return { id, title: `popular p${p} movie ${j}`, src: `https://image.tmdb.org/t/p/w500/poster${id}.jpg` };
};

/** 40 pages x 20 movies for /movie/popular (registered after mockAll, so it wins). Logs like mockAll. */
async function manyPages(page, app) {
  await page.route(/https:\/\/api\.themoviedb\.org\/3\/movie\/popular\?/, async (route) => {
    const url = new URL(route.request().url());
    const pg = Number(url.searchParams.get('page') || 1);
    const { api_key, ...safe } = Object.fromEntries(url.searchParams.entries());
    app.api.push({ path: '/movie/popular', params: safe, hasKey: !!api_key, url: 'REDACTED' });
    const results = Array.from({ length: PAGE_SIZE }, (_, j) => {
      const m = movieFor((pg - 1) * PAGE_SIZE + j);
      return { id: m.id, original_title: m.title, title: m.title, poster_path: `/poster${m.id}.jpg`, overview: 'o', vote_average: 7, release_date: '2020-01-01' };
    });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ page: pg, total_pages: 40, results }) });
  });
}

/** One read of everything the tests assert on. */
const snapshot = (page) =>
  page.evaluate(() => {
    const content = document.querySelector('.scroll-content');
    const section = document.querySelector('section[data-scrollbar]');
    const grid = document.querySelector('.movieList-container');
    const cRect = content.getBoundingClientRect();
    const offset = -new DOMMatrix(getComputedStyle(content).transform).m42;
    const viewH = section.getBoundingClientRect().height;
    const tiles = Array.from(document.querySelectorAll('.poster-container')).map((t) => {
      const r = t.getBoundingClientRect();
      const img = t.querySelector('img');
      return {
        id: Number(t.id), docTop: r.top - cRect.top, left: r.left, w: r.width, h: r.height,
        alt: img.getAttribute('alt'), src: img.getAttribute('src'),
        loaded: img.complete && img.naturalWidth > 0,
        placeholder: getComputedStyle(img).backgroundColor,
      };
    });
    return {
      offset, viewH,
      scrollHeight: content.scrollHeight,
      total: grid ? Number(grid.dataset.total || tiles.length) : 0,
      tiles,
      nodes: document.getElementsByTagName('*').length,
      imgsWithSrc: document.querySelectorAll('.poster[src]').length,
    };
  });

/** Waits until the scroll offset has not moved for `ms`. */
async function settle(page, ms = 500) {
  let last = -1, since = Date.now();
  for (let i = 0; i < 200; i++) {
    const { offset } = await snapshot(page);
    if (Math.abs(offset - last) > 0.01) { last = offset; since = Date.now(); }
    else if (Date.now() - since >= ms) return offset;
    await page.waitForTimeout(50);
  }
  throw new Error('scroll never settled');
}

/** Wheels down until the list holds `pages` pages. Records per-sample stats and the offset on every frame. */
async function scrollThrough(page, pages, { stats } = {}) {
  const vp = page.viewportSize();
  await page.mouse.move(vp.width / 2, vp.height / 2);
  const target = pages * PAGE_SIZE;
  const deadline = Date.now() + 150000;
  for (;;) {
    const s = await snapshot(page);
    if (stats) {
      stats.maxTiles = Math.max(stats.maxTiles, s.tiles.length);
      stats.maxNodes = Math.max(stats.maxNodes, s.nodes);
      stats.maxImgs = Math.max(stats.maxImgs, s.imgsWithSrc);
      stats.heights.push(s.scrollHeight);
    }
    if (s.total >= target) return s;
    if (Date.now() > deadline) throw new Error(`stuck at ${s.total} tiles`);
    await page.mouse.wheel(0, 3000);
    await page.waitForTimeout(250);
  }
}

const newStats = () => ({ maxTiles: 0, maxNodes: 0, maxImgs: 0, heights: [] });

/** Frame-by-frame offset log, to detect jumps that no wheel event caused. */
const startOffsetLog = (page) =>
  page.evaluate(() => {
    window.__offsets = [];
    const content = document.querySelector('.scroll-content');
    const tick = () => {
      window.__offsets.push(-new DOMMatrix(getComputedStyle(content).transform).m42);
      window.__raf = requestAnimationFrame(tick);
    };
    tick();
  });
const stopOffsetLog = (page) =>
  page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__offsets; });

/** Every mounted tile sits exactly where it would with all tiles rendered, and maps to the right movie. */
function expectGeometry(s, ref) {
  for (const t of s.tiles) {
    const row = Math.floor(t.id / ref.cols);
    expect(Math.abs(t.docTop - (ref.top0 + row * ref.pitch)), `tile ${t.id} top`).toBeLessThanOrEqual(POS_TOL);
    if (ref.strict) {
      const m = movieFor(t.id);
      expect(t.alt).toBe(m.title);
      expect(t.src).toBe(m.src);
    } else {
      // BC-10 quirk widths: the page sequence differs (page 7 follows page 2), so only check alt and src agree.
      expect(t.alt).toMatch(/^popular p\d+ movie \d+$/);
      expect(t.src).toBe(`https://image.tmdb.org/t/p/w500/poster${1000 + (Number(t.alt.match(/p(\d+)/)[1]) - 1) * PAGE_SIZE + Number(t.alt.match(/movie (\d+)/)[1])}.jpg`);
    }
  }
  const ids = s.tiles.map((t) => t.id);
  expect(new Set(ids).size, 'no duplicate tiles').toBe(ids.length);
  for (let i = 1; i < ids.length; i++) expect(ids[i], 'ascending contiguous').toBe(ids[i - 1] + 1);
}

/** Reference geometry from the first load (all 20 tiles mounted). */
const reference = (s) => {
  const first = s.tiles[0];
  const cols = s.tiles.filter((t) => Math.abs(t.docTop - first.docTop) < 0.5).length;
  const second = s.tiles.find((t) => t.docTop - first.docTop > 1);
  return { cols, top0: first.docTop, pitch: second ? second.docTop - first.docTop : first.h, strict: true };
};

/** Tiles that overlap the viewport must be mounted and not blank. */
function expectNoBlank(s, ref) {
  const mounted = new Set(s.tiles.map((t) => t.id));
  for (let i = 0; i < s.total; i++) {
    const top = ref.top0 + Math.floor(i / ref.cols) * ref.pitch;
    const inView = top + ref.pitch > s.offset + 1 && top < s.offset + s.viewH - 1;
    if (inView) expect(mounted.has(i), `tile ${i} is in the viewport but not mounted`).toBe(true);
  }
}

test.describe('BC-24..28 windowed list', () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ page, app }) => {
    await manyPages(page, app);
  });

  test('BC-24 mounted tiles, DOM nodes and images stay bounded across 25 pages while the scroll height keeps growing', async ({ page, app }, testInfo) => {
    await openListViaNav(page, 'Popular Movies');
    await expect(page.locator('.poster')).toHaveCount(PAGE_SIZE);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const { metrics } = await cdp.send('Performance.getMetrics');
      return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
    };
    const stats = newStats();
    const at5 = await scrollThrough(page, 5, { stats });
    const heap5 = await heap();
    const at25 = await scrollThrough(page, 25, { stats });
    await settle(page);
    const heap25 = await heap();
    const end = await snapshot(page);

    // Measurement line used for the before/after comparison in docs/migration/DECISIONS.md.
    const report = {
      pages: 25, total: end.total, mountedTiles: end.tiles.length, maxMountedTiles: stats.maxTiles, domNodes: end.nodes,
      maxDomNodes: stats.maxNodes, imgsWithSrc: end.imgsWithSrc, scrollHeight: end.scrollHeight,
      heapMB5: +(heap5.JSHeapUsedSize / 1048576).toFixed(1), heapMB25: +(heap25.JSHeapUsedSize / 1048576).toFixed(1),
      cdpNodes5: heap5.Nodes, cdpNodes25: heap25.Nodes,
    };
    console.log('PERF ' + JSON.stringify(report));
    await testInfo.attach('perf.json', { body: JSON.stringify(report, null, 2), contentType: 'application/json' });

    expect(end.total).toBeGreaterThanOrEqual(500);
    expect(stats.maxTiles, 'mounted tiles').toBeLessThan(MAX_TILES);
    expect(stats.maxImgs, 'img elements with a src').toBeLessThan(MAX_TILES);
    // 25 pages of DOM would be >4000 nodes in tiles alone; windowed it stays near the 5-page figure.
    expect(stats.maxNodes - at5.nodes, 'DOM nodes added between 5 and 25 pages').toBeLessThan(300);
    // The scroll height grows with every page (the spacer stands in for the unmounted rows) and never shrinks.
    for (let i = 1; i < stats.heights.length; i++) expect(stats.heights[i]).toBeGreaterThanOrEqual(stats.heights[i - 1] - 1);
    expect(at25.scrollHeight).toBeGreaterThan(at5.scrollHeight * 3.5);
    // Loose heap bound (GC timing): growth from page 5 to 25 stays under 25 MB and the heap under 150 MB.
    expect(heap25.JSHeapUsedSize - heap5.JSHeapUsedSize).toBeLessThan(25 * 1048576);
    expect(heap25.JSHeapUsedSize).toBeLessThan(150 * 1048576);
    expect(app.consoleErrors).toEqual([]);
  });

  test('BC-25 the next page is requested once per page, only after a scroll (600 ms debounce) with the sentinel near the viewport', async ({ page, app }) => {
    await openListViaNav(page, 'Popular Movies');
    await page.waitForTimeout(1500);
    // no scroll, no request: the sentinel being near the viewport alone does not load a page (BC-09)
    expect(pageParams(app, '/movie/popular')).toEqual(['1', '1']);
    await scrollThrough(page, 25);
    await settle(page);
    await page.waitForTimeout(1500);
    const loaded = (await snapshot(page)).total / PAGE_SIZE; // may overshoot 25 by a page already in flight
    expect(loaded).toBeGreaterThanOrEqual(25);
    const expected = ['1', '1', ...Array.from({ length: loaded - 1 }, (_, k) => String(k + 2))];
    expect(pageParams(app, '/movie/popular'), 'one request per page, in order, no duplicates').toEqual(expected);

    // Back at the top the sentinel is far away: scrolling there must not request anything.
    await page.mouse.wheel(0, -1000000);
    await settle(page);
    await page.mouse.wheel(0, 300);
    await settle(page);
    await page.waitForTimeout(1500);
    expect(pageParams(app, '/movie/popular')).toEqual(expected);
  });

  test('BC-26 scrolling to the bottom and back shows exactly the first-load tiles (same movies, order, images, no re-fetch)', async ({ page, app }) => {
    await openListViaNav(page, 'Popular Movies');
    await expect(page.locator('.poster')).toHaveCount(PAGE_SIZE);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    const first = await snapshot(page);
    const ref = reference(first);
    expectGeometry(first, ref);
    const initial = first.tiles.map(({ id, alt, src }) => ({ id, alt, src }));

    await scrollThrough(page, 25);
    await settle(page);
    const bottom = await snapshot(page);
    expectGeometry(bottom, ref);
    expect(bottom.tiles.some((t) => t.id < 20), 'first tiles are unmounted at the bottom').toBe(false);
    const requests = app.api.length;

    await page.mouse.wheel(0, -1000000);
    await settle(page);
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
    const back = await snapshot(page);
    expect(back.offset).toBeLessThan(1);
    expect(back.tiles.slice(0, PAGE_SIZE).map(({ id, alt, src }) => ({ id, alt, src }))).toEqual(initial);
    expect(back.tiles[0].docTop).toBeCloseTo(first.tiles[0].docTop, 0);
    expectGeometry(back, ref);
    expect(back.total).toBeGreaterThanOrEqual(500);
    expect(app.api.length, 'scrolling back needs no request').toBe(requests);
  });

  test('BC-27 no scroll jump when tiles mount/unmount or a page is appended', async ({ page, app }) => {
    await openListViaNav(page, 'Popular Movies');
    const first = await snapshot(page);
    const ref = reference(first);
    await page.mouse.move(640, 400);

    // (a) scrolling down through 6 pages: the per-frame offset never goes backwards and tiles never move.
    await startOffsetLog(page);
    await scrollThrough(page, 6);
    await settle(page);
    const offsets = await stopOffsetLog(page);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i], `frame ${i} jumped back`).toBeGreaterThanOrEqual(offsets[i - 1] - 0.5);
    expectGeometry(await snapshot(page), ref);

    // (b) appending a page while stationary changes neither the offset nor the position of a visible tile.
    const before = await snapshot(page);
    const anchor = before.tiles.find((t) => t.docTop >= before.offset && t.docTop < before.offset + before.viewH);
    await page.locator('.next-button').dispatchEvent('click');
    await expect.poll(async () => (await snapshot(page)).total).toBe(before.total + PAGE_SIZE);
    await page.waitForTimeout(300);
    const after = await snapshot(page);
    expect(Math.abs(after.offset - before.offset)).toBeLessThanOrEqual(0.5);
    const same = after.tiles.find((t) => t.id === anchor.id);
    expect(same, 'anchor tile still mounted').toBeTruthy();
    expect(Math.abs(same.docTop - anchor.docTop)).toBeLessThanOrEqual(POS_TOL);
    expect(after.scrollHeight).toBeGreaterThan(before.scrollHeight);

    // (c) scrolling up by small steps (tiles unmount at the bottom, mount at the top): the offset follows the wheel
    // monotonically and every tile stays on its row position.
    await startOffsetLog(page);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, -400);
      await page.waitForTimeout(120);
      expectGeometry(await snapshot(page), ref);
    }
    await settle(page);
    const up = await stopOffsetLog(page);
    for (let i = 1; i < up.length; i++) expect(up[i], `frame ${i} jumped forward`).toBeLessThanOrEqual(up[i - 1] + 0.5);
  });

  test('BC-28 no blank tile once scrolling stops after fast scrolls; tiles show their placeholder until the image has loaded', async ({ page, app }) => {
    await openListViaNav(page, 'Popular Movies');
    const first = await snapshot(page);
    const ref = reference(first);
    await scrollThrough(page, 12);
    await page.mouse.move(640, 400);
    for (const delta of [-2500, 4000, -9000, 6000, -1500, 2500]) {
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(90);
    }
    await settle(page);
    const s = await snapshot(page);
    expectNoBlank(s, ref);
    expectGeometry(s, ref);
    for (const t of s.tiles) {
      expect(t.placeholder, `tile ${t.id} has a placeholder background`).not.toBe('rgba(0, 0, 0, 0)');
      expect(Math.abs(t.h - ref.pitch)).toBeLessThanOrEqual(POS_TOL); // same size with or without the image
    }
    await expect.poll(async () => (await snapshot(page)).tiles.every((t) => t.loaded), { timeout: 10000 }).toBe(true);
    // decoding is async so an image never blocks painting of the tile
    expect(await page.locator('.poster').first().getAttribute('decoding')).toBe('async');
  });

  test('BC-29 tiles show the pointer cursor', async ({ page }) => {
    await openListViaNav(page, 'Popular Movies');
    const poster = page.locator('.poster').first();
    await poster.hover();
    expect(await poster.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
  });

  test('BC-24 spacers and sentinel are inert (aria-hidden, not focusable, no extra tab stops)', async ({ page }) => {
    await openListViaNav(page, 'Popular Movies');
    const info = await page.evaluate(() => ({
      spacers: Array.from(document.querySelectorAll('.list-spacer')).map((e) => [e.getAttribute('aria-hidden'), e.children.length, e.tabIndex]),
      sentinel: [document.querySelector('.list-sentinel').getAttribute('aria-hidden'), document.querySelector('.list-sentinel').tabIndex],
      focusable: document.querySelectorAll('.movieList-container a[href], .movieList-container input, .movieList-container button, .movieList-container [tabindex]:not([tabindex="-1"])').length,
    }));
    expect(info.spacers).toEqual([['true', 0, -1], ['true', 0, -1]]);
    expect(info.sentinel).toEqual(['true', -1]);
    expect(info.focusable).toBe(0);
  });
});

// Same checks at the four widths and both themes (shorter run: 8 pages).
for (const mode of ['dark', 'light']) {
  for (const [width, height] of [[320, 640], [768, 1024], [1024, 768], [1920, 1080]]) {
    test.describe(`BC-24..28 ${mode} ${width}x${height}`, () => {
      test.use({ viewport: { width, height } });
      test.setTimeout(240000);

      test(`windowed grid is bounded, positioned, not blank and accessible (${mode}, ${width}px)`, async ({ page, app }) => {
        await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
        await manyPages(page, app);
        await open(page, '/home');
        await page.evaluate(() => 0);
        if (width <= 600) {
          await page.locator('.header-mobile-container button.icon').click();
          await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
        } else {
          await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
        }
        await page.locator('.poster').first().waitFor();
        await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
        // 768-1024 px: the preserved BC-10 quirk appends page 2 five times with a stale closure; wait for it to settle.
        await page.waitForTimeout(1000);
        const first = await snapshot(page);
        const ref = { ...reference(first), strict: !(width >= 768 && width <= 1024) };
        const stats = newStats();
        await startOffsetLog(page);
        await scrollThrough(page, 8, { stats });
        await settle(page);
        const offsets = await stopOffsetLog(page);
        for (let i = 1; i < offsets.length; i++) expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1] - 0.5);
        expect(stats.maxTiles).toBeLessThan(MAX_TILES);
        const s = await snapshot(page);
        expectGeometry(s, ref);
        expectNoBlank(s, ref);
        // Scroll to the middle and axe the list (contrast included) in this mode.
        await page.mouse.wheel(0, -3000);
        await settle(page);
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).include('main').analyze();
        expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
        // back at the top: the first load's tiles
        await page.mouse.wheel(0, -1000000);
        await settle(page);
        const top = await snapshot(page);
        expect(top.tiles.slice(0, PAGE_SIZE).map((t) => [t.id, t.alt, t.src])).toEqual(first.tiles.slice(0, PAGE_SIZE).map((t) => [t.id, t.alt, t.src]));
      });
    });
  }
}
