const { test, expect, open, apiCalls, pageParams } = require('./helpers');

test('BC-15 desktop header: MOVIE ATLAS + 4 links; Popular/Top Rated/Now Playing also fetch page 1', async ({ page, app }) => {
  await open(page, '/home');
  await expect(page.locator('.header-container h1')).toHaveText('MOVIE ATLAS');
  await expect(page.locator('.header-container a h3')).toHaveText(['Home', 'Popular Movies', 'Top Rated Movies', 'Now Playing']);
  await expect(page.locator('.header-mobile-container')).toBeHidden();
  const link = (t) => page.locator('.header-container a', { hasText: t });
  await expect.poll(() => apiCalls(app, '/movie/popular').length).toBe(1);
  await link('Home').click(); // no fetch for Home
  await link('Popular Movies').click();
  await expect.poll(() => apiCalls(app, '/movie/popular').length).toBe(2);
  await link('Top Rated Movies').click();
  await expect.poll(() => apiCalls(app, '/movie/top_rated').length).toBe(1);
  await link('Now Playing').click();
  await expect.poll(() => apiCalls(app, '/movie/now_playing').length).toBe(1);
  expect(pageParams(app, '/movie/top_rated')).toEqual(['1']);
  expect(pageParams(app, '/movie/now_playing')).toEqual(['1']);
  expect(apiCalls(app, '/movie/popular').length).toBe(2);
});

test.describe('mobile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('BC-15 mobile header: label shows current section, hamburger toggles #myLinks, choosing updates label, fetches (not Home) and hides menu', async ({ page, app }) => {
    await open(page, '/home');
    await expect(page.locator('.header-container')).toBeHidden();
    await expect(page.locator('#home span')).toHaveText('Home');
    await expect(page.locator('#myLinks')).toBeHidden();
    const burger = page.locator('.header-mobile-container a.icon');
    await burger.click();
    await expect(page.locator('#myLinks')).toBeVisible();
    await burger.click();
    await expect(page.locator('#myLinks')).toBeHidden();
    await burger.click();
    await expect(page.locator('#myLinks a')).toHaveText(['Home', 'Popular Movies', 'Top Rated Movies', 'Now Playing']);
    await page.locator('#myLinks a', { hasText: 'Top Rated Movies' }).click();
    await expect(page.locator('#home span')).toHaveText('Top Rated Movies');
    await expect(page.locator('#myLinks')).toBeHidden();
    await expect.poll(() => apiCalls(app, '/movie/top_rated').length).toBe(1);
    await expect(page).toHaveURL(/#\/top_rated$/);
    await burger.click();
    await page.locator('#myLinks a', { hasText: 'Now Playing' }).click();
    await expect(page.locator('#home span')).toHaveText('Now Playing');
    await expect.poll(() => apiCalls(app, '/movie/now_playing').length).toBe(1);
    await burger.click();
    await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
    await expect(page.locator('#home span')).toHaveText('Popular Movies');
    await expect.poll(() => apiCalls(app, '/movie/popular').length).toBe(2);
    const popularCalls = apiCalls(app, '/movie/popular').length;
    await burger.click();
    await page.locator('#myLinks a', { hasText: 'Home' }).click();
    await expect(page.locator('#home span')).toHaveText('Home');
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.locator('#myLinks')).toBeHidden();
    expect(apiCalls(app, '/movie/popular').length).toBe(popularCalls); // Home does not fetch
  });

  test('BC-16 responsive: mobile breakpoint swaps header containers', async ({ page }) => {
    await open(page, '/home');
    await expect(page.locator('.header-container')).toHaveCSS('display', 'none');
    await expect(page.locator('.header-mobile-container')).toHaveCSS('display', 'block');
  });
});

test('BC-16 responsive: desktop layout uses the desktop header container', async ({ page }) => {
  await open(page, '/home');
  await expect(page.locator('.header-container')).toHaveCSS('display', 'flex');
  await expect(page.locator('.header-mobile-container')).toHaveCSS('display', 'none');
});
