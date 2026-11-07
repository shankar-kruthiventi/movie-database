// BC-19 light/dark mode (Movie Atlas step 3). Dark is the default; the choice lives in localStorage; the system scheme is ignored.
const { test, expect, open, openListViaNav } = require('./helpers');
const { parseColor } = require('./contrast-helpers');

const KEY = 'movie-atlas-theme';
const themeOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const rgb = (s) => parseColor(s).slice(0, 3).join(',');
const bgOf = (page, sel) => page.locator(sel).evaluate((el) => getComputedStyle(el).backgroundColor);
const toggle = (page, name) => page.getByRole('button', { name });

test('BC-19 default is dark (today\'s look), header colours and toggle name', async ({ page }) => {
  await open(page, '/home');
  expect(await themeOf(page)).toBe('dark');
  expect(rgb(await bgOf(page, '.header-view'))).toBe('33,37,45'); // #21252d
  await expect(page.locator('.header-container h1')).toHaveCSS('color', 'rgb(100, 220, 176)'); // #64dcb0
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expect(toggle(page, 'Switch to light mode')).toBeVisible();
  await expect(toggle(page, 'Switch to dark mode')).toHaveCount(0);
});

test('BC-19 toggle switches to light, updates the accessible name, and persists across reload', async ({ page }) => {
  await open(page, '/home');
  await toggle(page, 'Switch to light mode').click();
  expect(await themeOf(page)).toBe('light');
  await expect(toggle(page, 'Switch to dark mode')).toBeVisible();
  expect(rgb(await bgOf(page, '.header-view'))).toBe('255,255,255');
  await expect(page.locator('.header-container h1')).toHaveCSS('color', 'rgb(11, 122, 90)'); // #0b7a5a
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('light');
  await page.reload();
  expect(await themeOf(page)).toBe('light');
  await expect(toggle(page, 'Switch to dark mode')).toBeVisible();
  await toggle(page, 'Switch to dark mode').click();
  expect(await themeOf(page)).toBe('dark');
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark');
  await page.reload();
  expect(await themeOf(page)).toBe('dark');
});

test('BC-19 the stored choice is applied before the app bundle runs (no flash)', async ({ page, app }) => {
  await page.addInitScript((k) => { try { localStorage.setItem(k, 'light'); } catch (e) { /* ignore */ } }, KEY);
  await page.route('**/static/js/**', (route) => route.abort()); // app never starts: only index.html's inline script can set the theme
  await page.goto('/movie-database/#/home');
  expect(await themeOf(page)).toBe('light');
  await expect(page.locator('#root')).toBeEmpty();
  app.consoleErrors.length = 0; // the aborted bundle requests are logged as console errors on purpose
});

test('BC-19 works with localStorage blocked: dark default, toggle works for the page view, nothing persists', async ({ page, app }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await open(page, '/home');
  await expect(page.locator('.header-container h1')).toHaveText('MOVIE ATLAS');
  expect(await themeOf(page)).toBe('dark');
  await toggle(page, 'Switch to light mode').click();
  expect(await themeOf(page)).toBe('light');
  await expect(toggle(page, 'Switch to dark mode')).toBeVisible();
  await page.reload();
  expect(await themeOf(page)).toBe('dark'); // not persisted, and no crash
  await expect(page.locator('.home-contianer')).toBeVisible();
  expect(app.consoleErrors).toEqual([]);
});

test.describe('system colour scheme is ignored', () => {
  test.describe('system dark', () => {
    test.use({ colorScheme: 'dark' });
    test('stored light still wins, nothing stored gives dark', async ({ page }) => {
      await open(page, '/home');
      expect(await themeOf(page)).toBe('dark');
      await page.evaluate((k) => localStorage.setItem(k, 'light'), KEY);
      await page.reload();
      expect(await themeOf(page)).toBe('light');
    });
  });
  test.describe('system light', () => {
    test.use({ colorScheme: 'light' });
    test('nothing stored gives dark', async ({ page }) => {
      await open(page, '/home');
      expect(await themeOf(page)).toBe('dark');
    });
  });
});

test('BC-19 desktop toggle is the last header item, after Now Playing; mobile toggle is hidden on desktop', async ({ page }) => {
  await open(page, '/home');
  const items = page.locator('.header-container > *');
  await expect(items).toHaveCount(6);
  await expect(items.last()).toHaveClass(/theme-toggle-desktop/);
  const now = await page.locator('.header-container a', { hasText: 'Now Playing' }).boundingBox();
  const btn = await page.locator('.theme-toggle-desktop').boundingBox();
  expect(btn.x).toBeGreaterThan(now.x + now.width - 1);
  expect(btn.x + btn.width).toBeLessThanOrEqual(1280);
  await expect(page.locator('.theme-toggle-mobile')).toBeHidden();
});

test('BC-19 light mode: wallpaper is the same image with a white wash, cards stay opaque white with dark text', async ({ page }) => {
  await page.addInitScript((k) => { try { localStorage.setItem(k, 'light'); } catch (e) { /* about:blank */ } }, KEY);
  await open(page, '/home');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toMatch(/^linear-gradient\(rgba\(255, 255, 255, 0\.8\), rgba\(255, 255, 255, 0\.8\)\), url\(.*collection\.[\w-]+\.jpg.*\)$/);
  const card = page.locator('.about-container').first();
  await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(card).toHaveCSS('color', 'rgb(26, 31, 38)');
});

test('BC-19 dark mode wallpaper has no wash (same image)', async ({ page }) => {
  await open(page, '/home');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundImage);
  expect(bg).toMatch(/^none, url\(.*collection\.[\w-]+\.jpg.*\)$/); // first layer is the wash: none in dark
});

test('BC-19 poster list and Show More follow the mode', async ({ page }) => {
  await open(page, '/home');
  await openListViaNav(page, 'Popular Movies');
  expect(rgb(await bgOf(page, '.movieList-container'))).toBe('0,0,0');
  await toggle(page, 'Switch to light mode').click();
  expect(rgb(await bgOf(page, '.movieList-container'))).toBe('243,245,247'); // #f3f5f7
  await expect(page.locator('.next-button')).toHaveCSS('color', 'rgb(197, 17, 98)'); // #c51162
  await toggle(page, 'Switch to dark mode').click();
  await expect(page.locator('.next-button')).toHaveCSS('color', 'rgb(245, 0, 87)'); // #f50057 (v4 pin)
});

test('BC-19 details dialog follows the mode (dark: today\'s white title bar over #2d2626)', async ({ page }) => {
  await open(page, '/home');
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  expect(rgb(await dialog.evaluate((el) => getComputedStyle(el).backgroundColor))).toBe('255,255,255');
  expect(rgb(await bgOf(page, '#dialog-content'))).toBe('45,38,38'); // #2d2626
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await toggle(page, 'Switch to light mode').click();
  await page.locator('.poster').first().click();
  await expect(dialog).toBeVisible();
  expect(rgb(await bgOf(page, '#dialog-content'))).toBe('246,248,250'); // #f6f8fa
  await expect(page.locator('#dialog-content')).toHaveCSS('color', 'rgb(26, 31, 38)');
});

test.describe('mobile 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('BC-19 mobile: toggle sits in the header bar next to the hamburger, desktop one hidden', async ({ page }) => {
    await open(page, '/home');
    await expect(page.locator('.theme-toggle-desktop')).toBeHidden();
    const burger = await page.locator('.header-mobile-container button.icon').boundingBox();
    const btn = page.locator('.theme-toggle-mobile');
    await expect(btn).toBeVisible();
    const box = await btn.boundingBox();
    expect(box.x).toBeGreaterThan(burger.x + burger.width);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeLessThan(burger.y + burger.height);
    await btn.click();
    expect(await themeOf(page)).toBe('light');
    await expect(page.getByRole('button', { name: 'Switch to dark mode' })).toBeVisible();
    // choosing a menu item keeps the mode
    await page.locator('.header-mobile-container button.icon').click();
    await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
    expect(await themeOf(page)).toBe('light');
  });
});

test.describe('narrowest desktop layout 601x800', () => {
  test.use({ viewport: { width: 601, height: 800 } });
  test('BC-19 the desktop toggle stays inside the viewport and does not overlap Now Playing', async ({ page }) => {
    await open(page, '/home');
    const btn = await page.locator('.theme-toggle-desktop').boundingBox();
    const now = await page.locator('.header-container a', { hasText: 'Now Playing' }).boundingBox();
    expect(btn.x + btn.width).toBeLessThanOrEqual(601);
    expect(btn.x).toBeGreaterThanOrEqual(now.x + now.width - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= 601)).toBe(true);
  });
});
