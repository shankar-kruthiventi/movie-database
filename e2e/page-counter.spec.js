// BC-32 (owner decision 2026-11-08): the page counter (BC-05) is reset when the category changes. Each category
// starts again at page 1 (the page-1 load) and continues with 2, 3, .. once each, in order; nothing of the
// previous category reaches the new list. Mocked TMDB (fixtures: 8 pages of 20 per category, total_pages 8).
//
// Phases: Popular -> Top rated -> Now playing -> Popular, at desktop (1280x800) and tablet (900x1000, BC-10
// quirk) widths, dark and light. Tablet, first load: unchanged BC-10 pattern (1, 1, five 2, then 7, 8).
// Tablet, later switches: the five auto-clicks still fire when the new list view mounts; their requests are for
// the previous category (stale closure, as before) and their responses never reach the new category's list.
//
// Follow-up A (2026-11-09, owner-approved): the SAME category reloaded after its list has grown (Popular scrolled
// deep, Home, Popular again) also restarts the counter at 2: page 1, then 2, 3, .. once each, nothing skipped.
// On the first load (initial Popular, then the nav click) the counter is untouched, BC-10 as above.
const { test, expect, open, apiCalls, pageParams } = require('./helpers');

const KEY = 'movie-atlas-theme';
const PATH = { popular: '/movie/popular', top_rated: '/movie/top_rated', now_playing: '/movie/now_playing' };
const LABEL = { popular: 'Popular Movies', top_rated: 'Top Rated Movies', now_playing: 'Now Playing' };
const PAGES = 8;
const PAGE_SIZE = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const seq = (from, to) => Array.from({ length: to - from + 1 }, (_, k) => String(from + k));

const total = (page) => page.locator('.movieList-container').getAttribute('data-total').then(Number);
const link = (page, category) => page.locator('.header-container a', { hasText: LABEL[category] });

async function start(page, mode) {
  await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
  const loaded = page.waitForResponse((r) => /movie\/popular\?/.test(r.url()));
  await open(page, '/home');
  await loaded;
  await page.waitForTimeout(150);
}

/** Wheels down until the list holds all pages (the prefetch is distance based: with a long list it waits for the scroll). */
async function scrollToFill(page, viewport, want = PAGES * PAGE_SIZE) {
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  const deadline = Date.now() + 40000;
  while ((await total(page)) < want) {
    if (Date.now() > deadline) throw new Error(`list stuck at ${await total(page)} tiles`);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
  }
}

/** Mounted posters that do NOT belong to `category` (fixtures are titled "<category> p<page> movie <j>"). */
const foreign = (page, category) =>
  page.evaluate((c) => Array.from(document.querySelectorAll('.poster')).map((i) => i.getAttribute('alt')).filter((a) => !a.startsWith(c + ' p')), category);

for (const mode of ['dark', 'light']) {
  for (const [name, viewport, tablet] of [['desktop 1280x800', { width: 1280, height: 800 }, false], ['tablet 900x1000', { width: 900, height: 1000 }, true]]) {
    test.describe(`BC-32 ${mode} ${name}`, () => {
      test.use({ viewport });
      test.setTimeout(90000);

      test('Popular -> Top rated -> Now playing -> Popular: each category restarts at page 1 then 2..8, once each, in order', async ({ page, app }) => {
        await start(page, mode);
        let previous = null;
        let round = 0;
        for (const category of ['popular', 'top_rated', 'now_playing', 'popular']) {
          const mark = Object.fromEntries(Object.keys(PATH).map((c) => [c, apiCalls(app, PATH[c]).length]));
          await link(page, category).click();
          await page.locator('.poster').first().waitFor();
          const mine = () => pageParams(app, PATH[category]).slice(mark[category]);
          // The first Popular (nav click after the initial load, which is request #1 and is not in `mine`):
          // desktop 1, 2..8; tablet the BC-10 pattern 1, five 2, then the prefetch continues from 7.
          const first = round === 0;
          const expected = first && tablet ? ['1', '2', '2', '2', '2', '2', '7', '8'] : ['1', ...seq(2, PAGES)];
          // tablet first load: 40 tiles from the quirk + 7, 8 need no scroll; every other list is walked to its end
          if (!(first && tablet)) await scrollToFill(page, viewport);
          await expect.poll(() => mine(), { timeout: 20000, message: `${category} requests` }).toEqual(expected);
          // BC-10 first load: five stale appends of page 2 onto the 20 tiles = 40, then pages 7 and 8
          await expect.poll(() => total(page), { timeout: 10000 }).toBe(first && tablet ? 4 * PAGE_SIZE : PAGES * PAGE_SIZE);
          // scroll the list: nothing more is requested, nothing of another category appears
          await page.mouse.move(viewport.width / 2, viewport.height / 2);
          for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 500); await page.waitForTimeout(40); }
          await page.waitForTimeout(600);
          expect(mine()).toEqual(expected);
          expect(await foreign(page, category)).toEqual([]);
          // tablet: the five auto-clicks of a later switch request the PREVIOUS category (stale closure, BC-10);
          // nothing else is requested for any other category
          for (const other of Object.keys(PATH)) {
            if (other === category) continue;
            const extra = pageParams(app, PATH[other]).slice(mark[other]);
            if (tablet && other === previous) expect(extra, `${other} stale auto-click requests`).toHaveLength(5);
            else expect(extra, `${other} requests`).toEqual([]);
          }
          previous = category;
          round += 1;
        }
        expect(app.consoleErrors).toEqual([]);
        if (tablet) expect(app.logs.filter((l) => l === 'clicked')).toHaveLength(5 * 4);
      });

      test('a previous category response that arrives late (delayed) is discarded', async ({ page, app }) => {
        // Popular page 4 is held until Top rated has loaded; then it is released. It must not append.
        let release;
        const gate = new Promise((r) => { release = r; });
        let held = 0;
        // desktop: page 3 (prefetch 2, 3, ..); tablet: the BC-10 quirk requests 2 x5 and then 7, so page 7 is the first one "beyond" it
        const heldPage = tablet ? 7 : 3;
        await page.route((url) => url.hostname === 'api.themoviedb.org' && url.pathname === '/3/movie/popular' && url.searchParams.get('page') === String(heldPage), async (route) => {
          held += 1;
          await gate;
          await route.fallback();
        });
        await start(page, mode);
        await link(page, 'popular').click();
        await page.locator('.poster').first().waitFor();
        await expect.poll(() => held, { timeout: 15000 }).toBeGreaterThan(0);
        await link(page, 'top_rated').click();
        await expect.poll(async () => (await page.locator('.poster').first().getAttribute('alt')) ?? '', { timeout: 10000 }).toMatch(/^top_rated p1 movie 0/);
        release();
        await page.waitForTimeout(1200);
        // the new category's list is untouched by the late popular page 4 and fills 1..8 in order
        await scrollToFill(page, viewport);
        expect(await foreign(page, 'top_rated')).toEqual([]);
        expect(pageParams(app, PATH.top_rated)).toEqual(['1', ...seq(2, PAGES)]);
        // scrolling to the end shows only Top rated titles
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 900); await page.waitForTimeout(30); }
        await page.waitForTimeout(500);
        expect(await foreign(page, 'top_rated')).toEqual([]);
        expect(await total(page)).toBe(PAGES * PAGE_SIZE);
      });
    });
  }
}

test('BC-32 a stale page-1 response (two quick category clicks, the first answers last) does not replace the newer list', async ({ page, app }) => {
  let release;
  const gate = new Promise((r) => { release = r; });
  await start(page, 'dark');
  await link(page, 'popular').click();
  await page.locator('.poster').first().waitFor();
  await page.route(/https:\/\/api\.themoviedb\.org\/3\/movie\/top_rated\?.*page=1(&|$)/, async (route) => { await gate; await route.fallback(); });
  await link(page, 'top_rated').click();
  await link(page, 'now_playing').click();
  await expect.poll(async () => (await page.locator('.poster').first().getAttribute('alt')) ?? '', { timeout: 10000 }).toMatch(/^now_playing p1 movie 0/);
  release();
  await sleep(800);
  await expect(page.locator('.poster').first()).toHaveAttribute('alt', 'now_playing p1 movie 0');
  await scrollToFill(page, { width: 1280, height: 800 });
  expect(await foreign(page, 'now_playing')).toEqual([]);
  expect(pageParams(app, PATH.now_playing)).toEqual(['1', ...seq(2, PAGES)]);
});

// ---- Follow-up A: same category, grown list ----
const homeLink = (page) => page.locator('.header-container a', { hasText: /^Home$/ }).first();

/** Opens Popular, wheels until the pipeline has asked for page `deep` (counter >= deep + 1), goes Home. Returns the request count to mark. */
async function growThenHome(page, app, viewport, tablet, deep = 6) {
  await start(page, 'dark');
  await link(page, 'popular').click();
  await page.locator('.poster').first().waitFor();
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  const deadline = Date.now() + 40000;
  while (Math.max(...pageParams(app, PATH.popular).map(Number)) < deep) {
    if (Date.now() > deadline) throw new Error('never requested page ' + deep + ': ' + pageParams(app, PATH.popular).join());
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(400);
  await homeLink(page).click();
  await expect(page.locator('.home-contianer')).toBeVisible();
  return apiCalls(app, PATH.popular).length;
}

for (const mode of ['dark', 'light']) {
  for (const [name, viewport, tablet] of [['desktop 1280x800', { width: 1280, height: 800 }, false], ['tablet 900x1000', { width: 900, height: 1000 }, true]]) {
    test.describe(`BC-32 Follow-up A ${mode} ${name}`, () => {
      test.use({ viewport });
      test.setTimeout(90000);

      for (const quick of [false, true]) {
        test(`Popular scrolled deep -> Home -> Popular ${quick ? 'double-clicked quickly' : 'again'}: page 1 then 2, 3, .. once each, in order, none skipped (${mode})`, async ({ page, app }) => {
          await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
          const mark = await growThenHome(page, app, viewport, tablet);
          expect(pageParams(app, PATH.popular).length, 'the first pass reached the deep pages').toBeGreaterThanOrEqual(6);
          if (quick) await link(page, 'popular').evaluate((el) => { el.click(); el.click(); }); // both clicks in the same task: the second one is certainly sent before the first answer
          else await link(page, 'popular').click();
          await page.locator('.poster').first().waitFor();
          await expect.poll(async () => (await page.locator('.poster').first().getAttribute('alt')) ?? '').toMatch(/^popular p1 movie 0/);
          // tablet: the mount-time stale auto-clicks (BC-10) request the render closure's page; they are the only extras
          // and never reach the list. Everything else must be: 1 (x clicks), then 2..8 in order.
          try {
            await scrollToFill(page, viewport);
          } catch (e) {
            // Old behaviour (counter not restarted): pages 2..5 are never requested, so the list cannot fill. Say so.
            throw new Error(`pages requested after the click: [${pageParams(app, PATH.popular).slice(mark).join(',')}], expected 1 then 2..${PAGES} in order (${e.message})`);
          }
          await page.waitForTimeout(600);
          const mine = pageParams(app, PATH.popular).slice(mark);
          const clicks = quick ? 2 : 1;
          const pipelinePages = mine.filter((p, i) => !(tablet && p !== '1' && mine.indexOf(p) !== mine.lastIndexOf(p)));
          const ordered = pipelinePages.filter((p) => p !== '1');
          expect(mine.filter((p) => p === '1'), 'page-1 requests').toHaveLength(clicks);
          if (!tablet) expect(mine, 'requests after the click').toEqual([...Array(clicks).fill('1'), ...seq(2, PAGES)]);
          else expect(ordered.slice(-(PAGES - 1)), 'pipeline pages in order').toEqual(seq(2, PAGES));
          expect(await total(page)).toBe(PAGES * PAGE_SIZE);
          expect(await foreign(page, 'popular')).toEqual([]);
          // titles are "popular p<page> movie <j>": the mounted tiles never go back to an earlier page (no foreign or repeated page)
          const pagesShown = await page.evaluate(() => Array.from(document.querySelectorAll('.poster')).map((i) => Number(i.getAttribute('alt').match(/ p(\d+) /)[1])));
          for (let i = 1; i < pagesShown.length; i++) expect(pagesShown[i] - pagesShown[i - 1], 'page order in the list').toBeGreaterThanOrEqual(0);
          expect(app.consoleErrors).toEqual([]);
        });
      }
    });
  }
}
