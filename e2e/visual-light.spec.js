// Light-mode baselines (Movie Atlas step 3). Dark baselines live in visual.spec.js.
const { test, expect, open, openListViaNav } = require('./helpers');

const VIEWPORTS = { desktop: { width: 1280, height: 800 }, mobile: { width: 390, height: 844 } };

async function settle(page) {
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete && i.naturalWidth > 0));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
}
const goList = async (page, name) => {
  if (name === 'mobile') {
    await open(page, '/home');
    await page.locator('.header-mobile-container button.icon').click();
    await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
    await page.locator('.poster').first().waitFor();
  } else {
    await openListViaNav(page, 'Popular Movies');
  }
};

for (const [name, viewport] of Object.entries(VIEWPORTS)) {
  test.describe(`visual light ${name}`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => { try { localStorage.setItem('movie-atlas-theme', 'light'); } catch (e) { /* about:blank */ } });
    });

    test(`screenshot light Home ${name}`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`home-light-${name}.png`);
    });

    test(`screenshot light Popular list ${name}`, async ({ page }) => {
      await goList(page, name);
      await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', '20');
      await settle(page);
      await expect(page).toHaveScreenshot(`popular-light-${name}.png`);
    });

    test(`screenshot light details dialog ${name}`, async ({ page }) => {
      await goList(page, name);
      await settle(page);
      await page.locator('.poster').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(500);
      await settle(page);
      await expect(page).toHaveScreenshot(`dialog-light-${name}.png`);
    });
  });
}
