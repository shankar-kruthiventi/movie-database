const { test, expect, open } = require('./helpers');

test('BC-17 every asset URL resolves under /movie-database/ (production build)', async ({ page }) => {
  const local = [];
  page.on('response', (r) => { if (r.url().startsWith('http://localhost')) local.push({ url: r.url(), status: r.status() }); });
  await open(page, '/home');
  await expect(page.locator('.home-contianer')).toBeVisible();
  await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
  await expect(page.locator('.poster').first()).toBeVisible();
  expect(local.length).toBeGreaterThan(3);
  for (const r of local) {
    expect(new URL(r.url).pathname.startsWith('/movie-database/'), r.url).toBe(true);
    expect(r.status, r.url).toBeLessThan(400);
  }
  const scripts = await page.locator('script[src]').evaluateAll((els) => els.map((e) => new URL(e.src).pathname));
  expect(scripts.length).toBeGreaterThan(0);
  scripts.forEach((s) => expect(s).toMatch(/^\/movie-database\/static\/js\//));
  const css = await page.locator('link[rel=stylesheet][href^="/"]').evaluateAll((els) => els.map((e) => new URL(e.href).pathname));
  expect(css.length).toBeGreaterThan(0);
  css.forEach((s) => expect(s).toMatch(/^\/movie-database\//));
});

test('BC-18 index.html head: title, favicon, apple-touch-icon, manifest, font-awesome 4.7, inline styles/script', async ({ page }) => {
  await open(page, '/home');
  await expect(page).toHaveTitle('Movie Atlas');
  const href = (sel) => page.locator(sel).getAttribute('href');
  expect(await href('link[rel="icon"][href$=".ico"]')).toBe('/movie-database/favicon.ico');
  // 2026-11-08 (step 6b): additive SVG favicon link and a dedicated opaque apple-touch-icon.
  expect(await href('link[rel="icon"][type="image/svg+xml"]')).toBe('/movie-database/favicon.svg');
  expect(await href('link[rel="apple-touch-icon"]')).toBe('/movie-database/apple-touch-icon.png');
  for (const [url, type] of [['/movie-database/favicon.ico', 'image/x-icon'], ['/movie-database/favicon.svg', 'image/svg+xml'], ['/movie-database/apple-touch-icon.png', 'image/png']]) {
    const res = await page.request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()['content-type'], url).toContain(type);
  }
  expect(await href('link[rel="manifest"]')).toBe('/movie-database/manifest.json');
  expect(await href('link[href*="font-awesome"]')).toBe('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css');
  expect(await page.locator('head style').count()).toBeGreaterThan(0);
  expect(await page.locator('head script:not([src])').count()).toBeGreaterThan(0);
  await expect(page.locator('#landscape')).toBeHidden();
  await expect(page.locator('#landscape')).toHaveText('"Please Rotate Device to Portrait Mode"');
  expect(await page.evaluate(() => typeof window.doOnOrientationChange)).toBe('function');
  expect(await page.evaluate(() => document.body.getAttribute('onload'))).toBe('doOnOrientationChange()');
});

test('BC-18 loading the app unregisters stale service workers', async ({ page }) => {
  // register a stale worker from a page that does not run the app
  await page.goto('/movie-database/robots.txt');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/movie-database/e2e-stale-sw.js', { scope: '/movie-database/' });
    await navigator.serviceWorker.ready;
  });
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(1);
  await open(page, '/home');
  await expect(page.locator('.home-contianer')).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), { timeout: 10000 }).toBe(0);
});
