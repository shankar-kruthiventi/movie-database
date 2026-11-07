// BC-21 contrast regression (WCAG 2.2 AA) in both modes: axe color-contrast on Home, a list page and the open
// dialog, plus pixel measurements for text/borders drawn on the wallpaper photo (axe cannot evaluate those).
const { test, expect, open, openListViaNav } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;
const { ratio, parseColor, worstAgainstRegions } = require('./contrast-helpers');

const KEY = 'movie-atlas-theme';
const MODES = ['dark', 'light'];

async function contrastViolations(page, include) {
  let b = new AxeBuilder({ page }).withRules(['color-contrast']);
  if (include) b = b.include(include);
  const r = await b.analyze();
  return r.violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(' ')} :: ${n.any.map((a) => a.message).join('; ')}`));
}

for (const mode of MODES) {
  test.describe(`${mode} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
    });

    test(`BC-21 axe color-contrast: Home (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      expect(await contrastViolations(page)).toEqual([]);
    });

    test(`BC-21 axe color-contrast: Popular list (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await openListViaNav(page, 'Popular Movies');
      expect(await contrastViolations(page)).toEqual([]);
    });

    test(`BC-21 axe color-contrast: open details dialog (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await openListViaNav(page, 'Popular Movies');
      await page.locator('.poster').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400); // dialog fade-in
      expect(await contrastViolations(page, '[role="dialog"]')).toEqual([]);
    });

    test(`BC-21 axe color-contrast: mobile menu open (${mode})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await open(page, '/home');
      await page.locator('.header-mobile-container button.icon').click();
      await expect(page.locator('#myLinks')).toBeVisible();
      expect(await contrastViolations(page, '.header-view')).toEqual([]);
    });

    test(`BC-21 wallpaper pairs measured from pixels: heading >= 3:1, card border, search input border and focus ring (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      await page.mouse.move(0, 0);
      const results = {};

      // heading: large text (>= 24px) needs 3:1 against the worst background pixel behind the glyph box
      const heading = page.locator('.find-text');
      const hbox = await heading.evaluate((el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        return r.getBoundingClientRect().toJSON();
      });
      const hfg = parseColor(await heading.evaluate((el) => getComputedStyle(el).color)).slice(0, 3);
      await heading.evaluate((el) => { el.style.color = 'transparent'; });
      const h = await worstAgainstRegions(page, hfg, [{ x: hbox.x, y: hbox.y, width: hbox.width, height: hbox.height }]);
      await heading.evaluate((el) => { el.style.color = ''; });
      results.heading = h.worst;
      expect(h.worst, 'heading vs wallpaper').toBeGreaterThanOrEqual(3);

      // About card border: border colour vs the wallpaper just outside the card (1px border, needs 3:1)
      const card = (await page.locator('.about-container').first().boundingBox());
      const cardBorder = parseColor(await page.locator('.about-container').first().evaluate((el) => getComputedStyle(el).borderTopColor)).slice(0, 3);
      const band = (b, d) => [
        { x: b.x - d - 1, y: b.y - d - 1, width: b.width + 2 * d + 2, height: 1 },
        { x: b.x - d - 1, y: b.y + b.height + d, width: b.width + 2 * d + 2, height: 1 },
      ];
      const c = await worstAgainstRegions(page, cardBorder, band(card, 1));
      results.cardBorder = c.worst;
      expect(c.worst, 'card border vs wallpaper').toBeGreaterThanOrEqual(3);

      // Search input: border colour vs wallpaper outside it; then its focus ring vs the same wallpaper
      const input = page.locator('#auto');
      const ibox = await input.boundingBox();
      const iborder = parseColor(await input.evaluate((el) => getComputedStyle(el).borderTopColor)).slice(0, 3);
      const fill = parseColor(await input.evaluate((el) => getComputedStyle(el).backgroundColor)).slice(0, 3);
      const outside = band(ibox, 1);
      const ib = await worstAgainstRegions(page, iborder, outside);
      const ifill = await worstAgainstRegions(page, fill, outside);
      results.inputBorder = ib.worst;
      results.inputFill = ifill.worst;
      // boundary of the control: either its border or its fill must separate it from the page by 3:1
      expect(Math.max(ib.worst, ifill.worst), 'input boundary vs wallpaper').toBeGreaterThanOrEqual(3);
      const ringBands = [
        { x: ibox.x - 4, y: ibox.y - 4, width: ibox.width + 8, height: 2 },
        { x: ibox.x - 4, y: ibox.y + ibox.height + 2, width: ibox.width + 8, height: 2 },
      ];
      const ringColor = parseColor(await input.evaluate((el) => { el.focus(); return getComputedStyle(el).outlineColor; })).slice(0, 3);
      await input.evaluate((el) => el.blur());
      const ring = await worstAgainstRegions(page, ringColor, ringBands);
      results.inputRing = ring.worst;
      expect(ring.worst, 'input focus ring vs wallpaper').toBeGreaterThanOrEqual(3);
      // placeholder on the input fill
      const ph = parseColor(await input.evaluate((el) => getComputedStyle(el, '::placeholder').color)).slice(0, 3);
      results.placeholder = ratio(ph, fill);
      expect(results.placeholder).toBeGreaterThanOrEqual(4.5);

      console.log(`[contrast ${mode}] ` + Object.entries(results).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' '));
    });
  });
}
