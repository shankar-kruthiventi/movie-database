const { test, expect, openListViaNav, open, pageParams } = require('./helpers');

// Step 5b (owner decision 2026-11-08, supersedes the 600 ms debounce trigger): the next page is prefetched when the
// sentinel is within 3 viewport heights of the viewport, without any scroll and without a debounce. The old
// assertions ("no request within 250 ms of a wheel", "page=1,1,2 after one wheel", "no request without scroll")
// pinned the old trigger and are replaced by the equivalent facts below (docs/migration/DECISIONS.md, Step 5b).
const consecutiveFrom = (params, first) => params.map(Number).every((p, k) => p === first + k);

test('BC-09 infinite scroll (step 5b): prefetch via the sentinel observer, no debounce, each page once and in order', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  expect(pageParams(app, '/movie/popular').slice(0, 2)).toEqual(['1', '1']);
  // no scroll needed: the short first page is within the prefetch distance, so pages are requested on their own
  await expect.poll(() => pageParams(app, '/movie/popular').length, { timeout: 5000 }).toBeGreaterThanOrEqual(3);
  await page.waitForTimeout(1500);
  const settled = pageParams(app, '/movie/popular');
  expect(consecutiveFrom(settled.slice(2), 2), 'pages 2..n once each, in order').toBe(true);
  const total = Number(await page.locator('.movieList-container').getAttribute('data-total'));
  expect(total).toBe((settled.length - 1) * 20); // list length (step 5: .poster is only the mounted window)
  // a wheel moves the sentinel into the margin: the next page is requested at once (the old 600 ms debounce is gone)
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 3000);
  await expect.poll(() => pageParams(app, '/movie/popular').length, { timeout: 500 }).toBeGreaterThan(settled.length);
  await page.waitForTimeout(1500);
  expect(consecutiveFrom(pageParams(app, '/movie/popular').slice(2), 2)).toBe(true);
});

test.describe('tablet 900x1000', () => {
  test.use({ viewport: { width: 900, height: 1000 } });

  test('BC-10 on mount of a list view at 768-1024px width Show More is auto-clicked 5 times (logs "clicked")', async ({ page, app }) => {
    await open(page, '/home');
    await expect(page.locator('.home-contianer')).toBeVisible();
    await expect.poll(() => pageParams(app, '/movie/popular')).toEqual(['1']);
    await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
    await expect(page.locator('.poster').first()).toBeVisible();
    await expect.poll(() => app.logs.filter((l) => l === 'clicked').length).toBe(5);
    // 1 initial + 1 from the nav click (fetchData) + 5 auto-clicked appends (stale closure: all ask page=2).
    // Step 5b: the prefetch is held back until those appends changed the list, then continues from page 7.
    await expect.poll(() => pageParams(app, '/movie/popular').length).toBeGreaterThanOrEqual(7);
    expect(pageParams(app, '/movie/popular').slice(0, 7)).toEqual(['1', '1', '2', '2', '2', '2', '2']);
    await page.waitForTimeout(1500);
    expect(consecutiveFrom(pageParams(app, '/movie/popular').slice(7), 7)).toBe(true);
  });
});

test('BC-10 no auto-click outside 768-1024px (desktop 1280)', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.waitForTimeout(500);
  expect(app.logs.filter((l) => l === 'clicked')).toHaveLength(0);
  // step 5b: no auto-click, so no stale page=2 burst; only the prefetch's pages 2, 3.. in order may follow
  const params = pageParams(app, '/movie/popular');
  expect(params.slice(0, 2)).toEqual(['1', '1']);
  expect(consecutiveFrom(params.slice(2), 2)).toBe(true);
});

for (const [width, expectClicks] of [[767, 0], [768, 5], [1024, 5], [1025, 0]]) {
  test.describe(`width ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    test(`BC-10 boundary: ${expectClicks} auto-clicks at ${width}px`, async ({ page, app }) => {
      await open(page, '/home');
      await expect.poll(() => pageParams(app, '/movie/popular')).toEqual(['1']);
      await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
      await expect(page.locator('.poster').first()).toBeVisible();
      await page.waitForTimeout(500);
      expect(app.logs.filter((l) => l === 'clicked')).toHaveLength(expectClicks);
    });
  });
}
