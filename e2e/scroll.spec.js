const { test, expect, openListViaNav, open, pageParams } = require('./helpers');

test('BC-09 infinite scroll: scroll -> 600ms debounce -> IntersectionObserver -> one extra page request', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  await expect(page.locator('.poster')).toHaveCount(20);
  expect(pageParams(app, '/movie/popular')).toEqual(['1', '1']);
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 3000);
  // debounce is 600 ms: nothing yet shortly after the scroll
  await page.waitForTimeout(250);
  expect(pageParams(app, '/movie/popular')).toEqual(['1', '1']);
  await expect.poll(() => pageParams(app, '/movie/popular'), { timeout: 5000 }).toEqual(['1', '1', '2']);
  await expect(page.locator('.poster')).toHaveCount(40);
  await page.waitForTimeout(1500);
  expect(pageParams(app, '/movie/popular')).toEqual(['1', '1', '2']);
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
    // 1 initial + 1 from the nav click (fetchData) + 5 auto-clicked appends (stale closure: all ask page=2)
    await expect.poll(() => pageParams(app, '/movie/popular').length).toBe(7);
    expect(pageParams(app, '/movie/popular')).toEqual(['1', '1', '2', '2', '2', '2', '2']);
  });
});

test('BC-10 no auto-click outside 768-1024px (desktop 1280)', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.waitForTimeout(500);
  expect(app.logs.filter((l) => l === 'clicked')).toHaveLength(0);
  expect(pageParams(app, '/movie/popular')).toEqual(['1', '1']);
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
