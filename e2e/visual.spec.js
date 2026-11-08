const { test, expect, open, openListViaNav } = require('./helpers');

// Step 5b: this spec is not about the next-page prefetch; it pins a single-page list (total_pages 1) so the prefetch requests nothing and every assertion below is the original one.
test.use({ apiTotalPages: 1 });

const VIEWPORTS = { desktop: { width: 1280, height: 800 }, tablet: { width: 900, height: 1000 }, mobile: { width: 390, height: 844 } };

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
  test.describe(`visual ${name}`, () => {
    test.use({ viewport });

    test(`screenshot Home ${name}`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      await settle(page);
      await expect(page).toHaveScreenshot(`home-${name}.png`);
    });

    test(`screenshot Popular list ${name}`, async ({ page }) => {
      await goList(page, name);
      await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', name === 'tablet' ? '40' : '20'); // tablet: 5x auto-click settled
      await settle(page);
      await expect(page).toHaveScreenshot(`popular-${name}.png`);
    });

    test(`screenshot details dialog ${name}`, async ({ page }) => {
      await goList(page, name);
      await settle(page);
      await page.locator('.poster').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(500);
      await settle(page);
      await expect(page).toHaveScreenshot(`dialog-${name}.png`);
    });
  });
}
