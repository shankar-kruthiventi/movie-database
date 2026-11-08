// BC-30 kebab-case list routes (Movie Atlas step 7). URLs: #/top-rated, #/now-playing. Old #/top_rated and
// #/now_playing redirect (replace). TMDB API paths keep top_rated / now_playing.
const { test, expect, open, apiCalls, pageParams } = require('./helpers');

const KEY = 'movie-atlas-theme';
const ROUTES = [
  { label: 'Top Rated Movies', path: 'top-rated', old: 'top_rated', api: '/movie/top_rated' },
  { label: 'Now Playing', path: 'now-playing', old: 'now_playing', api: '/movie/now_playing' },
];

for (const mode of ['dark', 'light']) {
  test.describe(`BC-30 (${mode})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }, [KEY, mode]);
    });

    for (const r of ROUTES) {
      test(`nav click goes to #/${r.path}, active class follows, API keeps ${r.api} (${mode})`, async ({ page, app }) => {
        await open(page, '/home');
        const link = page.locator('.header-container a', { hasText: r.label });
        await expect(link).toHaveAttribute('href', `#/${r.path}`);
        await link.click();
        await expect(page).toHaveURL(new RegExp(`#/${r.path}$`));
        await expect(link).toHaveClass(/active/);
        await expect(page.locator('.header-container a.active')).toHaveCount(1);
        await expect(page.locator('.poster').first()).toBeVisible();
        await expect(page.locator('.poster').first()).toHaveAttribute('alt', `${r.old} p1 movie 0`);
        expect(pageParams(app, r.api)).toEqual(['1']);
        expect(app.api.filter((c) => /top-rated|now-playing/.test(c.path))).toEqual([]);
      });

      test(`old #/${r.old} typed directly: redirect then BC-07 bounce to #/home, no trap (${mode})`, async ({ page }) => {
        await page.goto('about:blank');
        await open(page, '/' + r.old);
        await expect(page).toHaveURL(/#\/home$/);
        await expect(page.locator('.home-contianer')).toBeVisible();
        await page.goBack(); // both redirects replace: the next entry back is the page before the app
        await expect(page).toHaveURL('about:blank');
      });

      test(`new #/${r.path} typed directly bounces to #/home like the old URLs did (${mode})`, async ({ page }) => {
        await page.goto('about:blank');
        await open(page, '/' + r.path);
        await expect(page).toHaveURL(/#\/home$/);
        await expect(page.locator('.home-contianer')).toBeVisible();
      });

      test(`old #/${r.old} entered inside the running app redirects to #/${r.path}; back is not trapped (${mode})`, async ({ page }) => {
        await open(page, '/home');
        await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
        await expect(page).toHaveURL(/#\/popular$/);
        await expect(page.locator('.poster').first()).toBeVisible();
        await page.evaluate((old) => { window.location.hash = '#/' + old; }, r.old);
        await expect(page).toHaveURL(new RegExp(`#/${r.path}$`));
        // list already loaded (Popular) so MovieList does not bounce; same as the old behaviour for a hash edit
        await expect(page.locator('.poster').first()).toBeVisible();
        expect(await page.evaluate(() => window.location.hash)).toBe(`#/${r.path}`);
        await page.goBack(); // the old URL entry was replaced: back lands on #/popular
        await expect(page).toHaveURL(/#\/popular$/);
      });

      test(`keyboard Enter on the ${r.label} link navigates to #/${r.path} (${mode})`, async ({ page, app }) => {
        await open(page, '/home');
        await expect(page.locator('.home-contianer')).toBeVisible();
        await page.locator('.header-container a', { hasText: r.label }).focus();
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`#/${r.path}$`));
        await expect.poll(() => apiCalls(app, r.api).length).toBe(1);
      });
    }
  });
}

test.describe('mobile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('BC-30 mobile menu links point at the new routes; label text unchanged', async ({ page }) => {
    await open(page, '/home');
    await page.locator('.header-mobile-container button.icon').click();
    const hrefs = await page.locator('#myLinks a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs).toEqual(['#/home', '#/popular', '#/top-rated', '#/now-playing']);
    await expect(page.locator('#myLinks a')).toHaveText(['Home', 'Popular Movies', 'Top Rated Movies', 'Now Playing']);
  });
});
