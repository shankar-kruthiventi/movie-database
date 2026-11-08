// BC-23 Home wallpaper pan (CSS only): a fixed ::before layer on <body> that animates its transform.
// Runs on Chromium (default project) AND WebKit (projects "webkit" and "webkit-mobile" in playwright.config.js).
const { test, expect, open } = require('./helpers');

const KEY = 'movie-atlas-theme';
const MODES = ['dark', 'light'];

const layer = (page) => page.evaluate(() => {
  const cs = getComputedStyle(document.body, '::before');
  return {
    content: cs.content, position: cs.position, pointerEvents: cs.pointerEvents, zIndex: cs.zIndex,
    backgroundImage: cs.backgroundImage, animationName: cs.animationName, animationPlayState: cs.animationPlayState,
    transform: cs.transform, width: cs.width, height: cs.height, backfaceVisibility: cs.backfaceVisibility,
  };
});
const matrix = (t) => (t.match(/matrix(?:3d)?\(([^)]+)\)/) || [0, ''])[1].split(',').map(Number);

for (const mode of MODES) {
  test.describe(`${mode} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
    });

    test(`BC-23 the wallpaper is a fixed, click-through layer behind the page with the photo (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      const l = await layer(page);
      expect(l.content).toMatch(/^"?"?$/);
      expect(l.position).toBe('fixed');
      expect(l.zIndex).toBe('-1');
      expect(l.pointerEvents).toBe('none');
      expect(l.backgroundImage).toMatch(/url\(.*collection\.[\w-]+\.jpg.*\)/);
      expect(l.backgroundImage.startsWith('linear-gradient(')).toBe(mode === 'light'); // white wash only in light mode
      const vp = page.viewportSize();
      expect(parseFloat(l.width)).toBeCloseTo(vp.width, 0);
      expect(parseFloat(l.height)).toBeGreaterThanOrEqual(vp.height - 1); // 100lvh/100vh: at least the viewport
      // the body itself no longer paints the photo (it would double-draw and sit under the layer)
      expect(await page.evaluate(() => getComputedStyle(document.body).backgroundImage)).toBe('none');
    });

    test(`BC-23 the layer is animating: animation-name is set and the transform moves between two samples (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await expect(page.locator('.home-contianer')).toBeVisible();
      const l = await layer(page);
      expect(l.animationName).toBe('wallpaper-pan');
      expect(l.animationPlayState).toBe('running');
      const running = await page.evaluate(() => document.getAnimations().some((a) => a.animationName === 'wallpaper-pan' && a.playState === 'running'));
      expect(running).toBe(true);
      const first = matrix((await layer(page)).transform);
      await page.waitForTimeout(1500);
      const second = matrix((await layer(page)).transform);
      expect(first.length).toBeGreaterThanOrEqual(6);
      expect(second).not.toEqual(first);
      // the zoomed-in photo always overhangs the viewport: scale 1.3 with a 10% shift never shows an edge
      expect(first[0]).toBeCloseTo(1.3, 1);
    });

    test(`BC-23 the click-through layer does not block the page: the search input takes focus and typing works (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await page.locator('#auto').click();
      await expect(page.locator('#auto')).toBeFocused();
      await page.locator('#auto').pressSequentially('bat');
      await expect(page.locator('#auto')).toHaveValue('bat');
    });

    test.describe('reduced motion', () => {
      test.use({ reducedMotion: 'reduce' });
      test(`BC-23 prefers-reduced-motion: no animation, static unzoomed photo (${mode})`, async ({ page }) => {
        await open(page, '/home');
        await expect(page.locator('.home-contianer')).toBeVisible();
        const l = await layer(page);
        expect(l.animationName).toBe('none');
        expect(l.transform).toBe('none');
        expect(l.backgroundImage).toMatch(/collection\.[\w-]+\.jpg/);
        expect(await page.evaluate(() => document.getAnimations().filter((a) => a.animationName === 'wallpaper-pan').length)).toBe(0);
      });
    });
  });
}
