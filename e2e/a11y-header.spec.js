// BC-20 header keyboard navigation (Movie Atlas step 3): Tab order, visible focus, skip link, mobile menu semantics.
const { test, expect, open } = require('./helpers');
const { ratio, parseColor, effectiveBackground } = require('./contrast-helpers');

const KEY = 'movie-atlas-theme';
const MODES = ['dark', 'light'];

const active = (page) => page.evaluate(() => {
  const el = document.activeElement;
  return el ? { tag: el.tagName, id: el.id, cls: el.className && el.className.toString(), text: (el.getAttribute('aria-label') || el.textContent || '').trim() } : null;
});
const tabTo = async (page, n = 1) => { for (let i = 0; i < n; i++) await page.keyboard.press('Tab'); };
async function setMode(page, mode) {
  await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
}

/** Focus indicator of the focused element: >= 2px solid ring with >= 3:1 against what it is drawn on. */
async function expectVisibleRing(page, { backdrop = 'parent' } = {}) {
  const el = page.locator(':focus');
  const ring = await el.evaluate((n) => {
    const cs = getComputedStyle(n);
    return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor, offset: parseFloat(cs.outlineOffset), focusVisible: n.matches(':focus-visible') };
  });
  expect(ring.focusVisible, 'element matches :focus-visible').toBe(true);
  expect(ring.style).not.toBe('none');
  expect(ring.width).toBeGreaterThanOrEqual(2);
  const fg = parseColor(ring.color).slice(0, 3);
  // inset rings (negative offset) are drawn on the element itself, outset rings on what is behind it
  const bg = await effectiveBackground(el, { includeSelf: ring.offset < 0 || backdrop === 'self' });
  expect(bg.image).toBe(false);
  const r = ratio(fg, bg.rgb);
  expect(r, `focus ring ${ring.color} on ${bg.rgb}`).toBeGreaterThanOrEqual(3);
}

for (const mode of MODES) {
  test.describe(`${mode} mode`, () => {
    test.beforeEach(async ({ page }) => setMode(page, mode));

    test(`BC-20 desktop Tab order: skip link, 4 nav links, theme toggle, then the page; every stop has a visible ring (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      const expected = [
        ['Skip to main content', 'A'],
        ['Home', 'A'], ['Popular Movies', 'A'], ['Top Rated Movies', 'A'], ['Now Playing', 'A'],
        [mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode', 'BUTTON'],
      ];
      for (const [text, tag] of expected) {
        await tabTo(page);
        const a = await active(page);
        expect(a.text).toBe(text);
        expect(a.tag).toBe(tag);
        if (text === 'Skip to main content') {
          const ring = await page.locator(':focus').evaluate((n) => ({ w: parseFloat(getComputedStyle(n).outlineWidth), c: getComputedStyle(n).outlineColor, r: n.getBoundingClientRect().toJSON() }));
          expect(ring.w).toBeGreaterThanOrEqual(2);
          // the skip link overlays the header bar: its ring is drawn on the header background
          const bg = await effectiveBackground(page.locator('.header-view'), { includeSelf: true });
          expect(ratio(parseColor(ring.c).slice(0, 3), bg.rgb)).toBeGreaterThanOrEqual(3);
        } else {
          await expectVisibleRing(page);
        }
      }
      await tabTo(page);
      expect((await active(page)).text).toBe('LinkedIn'); // continues into the page content (About links), hidden mobile controls are skipped
    });

    test(`BC-20 skip link is hidden until focused, moves focus to #main-content and keeps the hash route (${mode})`, async ({ page }) => {
      await open(page, '/home');
      const skip = page.getByRole('link', { name: 'Skip to main content' });
      await expect(page.locator('#main-content')).toHaveAttribute('tabindex', '-1');
      expect((await skip.boundingBox()).y + (await skip.boundingBox()).height).toBeLessThan(0); // off-screen
      await tabTo(page);
      await expect(skip).toBeFocused();
      const box = await skip.boundingBox();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
      await expect(page).toHaveURL(/#\/home$/); // HashRouter route untouched
      await tabTo(page);
      expect((await active(page)).text).toBe('LinkedIn'); // next stop is the first control inside the main content
    });

    test(`BC-20 keyboard activation of nav links keeps BC-15 fetch-on-click (${mode})`, async ({ page, app }) => {
      await open(page, '/home');
      await tabTo(page, 3); // skip, Home, Popular
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/#\/popular$/);
      await expect.poll(() => app.api.filter((c) => c.path === '/movie/popular').length).toBe(2);
    });

    test.describe('mobile 390x844', () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test(`BC-20 mobile Tab order, hamburger semantics, Enter/Space/Esc, hidden items not tabbable (${mode})`, async ({ page }) => {
        await open(page, '/home');
        await expect(page.locator('.home-contianer')).toBeVisible();
        const burger = page.locator('.header-mobile-container button.icon');
        await expect(burger).toHaveAttribute('aria-label', 'Menu');
        await expect(burger).toHaveAttribute('aria-expanded', 'false');
        await expect(burger).toHaveAttribute('aria-controls', 'myLinks');
        expect(await burger.evaluate((n) => n.tagName)).toBe('BUTTON');

        // closed menu: skip, hamburger, theme toggle, then straight into the page (no menu links)
        await tabTo(page);
        expect((await active(page)).text).toBe('Skip to main content');
        await tabTo(page);
        await expect(burger).toBeFocused();
        await expectVisibleRing(page);
        await tabTo(page);
        expect((await active(page)).cls).toContain('theme-toggle-mobile');
        await expectVisibleRing(page);
        await tabTo(page);
        expect((await active(page)).text).toBe('LinkedIn');
        const hiddenLinks = await page.locator('#myLinks a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().width));
        expect(hiddenLinks.every((w) => w === 0)).toBe(true); // display:none, so not in the tab order

        // Enter opens
        await burger.focus();
        await page.keyboard.press('Enter');
        await expect(burger).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#myLinks')).toBeVisible();
        // Tab: toggle, then the four menu links in order, each with a visible ring
        await tabTo(page);
        expect((await active(page)).cls).toContain('theme-toggle-mobile');
        for (const t of ['Home', 'Popular Movies', 'Top Rated Movies', 'Now Playing']) {
          await tabTo(page);
          expect((await active(page)).text).toBe(t);
          await expectVisibleRing(page);
        }
        // Esc closes and returns focus to the hamburger
        await page.keyboard.press('Escape');
        await expect(page.locator('#myLinks')).toBeHidden();
        await expect(burger).toHaveAttribute('aria-expanded', 'false');
        await expect(burger).toBeFocused();
        // Space toggles too; Esc from the hamburger itself works
        await page.keyboard.press('Space');
        await expect(burger).toHaveAttribute('aria-expanded', 'true');
        await page.keyboard.press('Space');
        await expect(burger).toHaveAttribute('aria-expanded', 'false');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Escape');
        await expect(page.locator('#myLinks')).toBeHidden();
        await expect(burger).toBeFocused();
        // Esc with the menu closed does nothing
        await page.keyboard.press('Escape');
        await expect(burger).toBeFocused();
        await expect(burger).toHaveAttribute('aria-expanded', 'false');
      });

      test(`BC-20 choosing a menu item with the keyboard updates the label, fetches, closes the menu and refocuses the hamburger (${mode})`, async ({ page, app }) => {
        await open(page, '/home');
        const burger = page.locator('.header-mobile-container button.icon');
        await burger.focus();
        await page.keyboard.press('Enter');
        await tabTo(page, 3); // toggle, Home, Popular
        await page.keyboard.press('Enter');
        await expect(page.locator('#home span')).toHaveText('Popular Movies');
        await expect(page.locator('#myLinks')).toBeHidden();
        await expect(burger).toBeFocused();
        await expect(page).toHaveURL(/#\/popular$/);
        await expect.poll(() => app.api.filter((c) => c.path === '/movie/popular').length).toBe(2);
      });

      test(`BC-20 the #home label is a plain non-interactive label (${mode})`, async ({ page }) => {
        await open(page, '/home');
        const label = page.locator('#home');
        await expect(label).toHaveText('Home');
        expect(await label.evaluate((n) => ({ role: n.getAttribute('role'), tabindex: n.getAttribute('tabindex'), style: n.getAttribute('style'), tag: n.tagName }))).toEqual({ role: null, tabindex: null, style: null, tag: 'DIV' });
        await expect(label).toHaveCSS('cursor', 'auto');
        // never receives focus
        const stops = [];
        for (let i = 0; i < 5; i++) { await tabTo(page); stops.push((await active(page)).id); }
        expect(stops).not.toContain('home');
      });
    });
  });
}
