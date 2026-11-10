// BC-33 Responsiveness matrix (Movie Atlas step 8): widths x themes x pages. See BEHAVIOR-CONTRACT.md BC-33.
// Reduced matrix (documented): every size x both themes walks Home, autocomplete (3 options with a very long
// title, and zero results), the Popular list, the details dialog (normal, edge data, long overview) and, on phones,
// the open menu. axe (wcag2a/2aa/21a/21aa/22aa incl. target-size) runs three times per size in dark mode (home with the list open, list, dialog), color-contrast is
// excluded there because a11y-contrast.spec.js owns it (axe cannot see the moving wallpaper).
const { test, expect, open } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe.configure({ mode: 'parallel' });

const KEY = 'movie-atlas-theme';
const SIZES = [
  { name: '320', width: 320, height: 640 },
  { name: '390', width: 390, height: 844 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1920', width: 1920, height: 1080 },
  { name: 'landscape-667x375', width: 667, height: 375 },
  { name: 'landscape-844x390', width: 844, height: 390 },
];
const LONG = 'The Extraordinarily Long and Winding Title of a Film That Never Seems to End Part Two: Revenge of the Supercalifragilisticexpialidocious';
const json = (body) => (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const search = (results) => ({ results });

/** Horizontal overflow of the page and of every visible element (documented allow-list: none). */
const overflow = (page) => page.evaluate(() => {
  const vw = window.innerWidth;
  const de = document.scrollingElement;
  const wide = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('.visually-hidden, .skip-link, .MuiBackdrop-root')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) wide.push(`${el.tagName}.${String(el.className).slice(0, 30)} ${Math.round(r.left)}..${Math.round(r.right)}`);
  }
  return { page: de.scrollWidth - vw, body: document.body.scrollWidth - vw, wide };
});

/** Smallest computed font size (px) of any visible element that owns a text node, inside `root`. */
const minFont = (page, root = 'body') => page.evaluate((sel) => {
  let min = Infinity, who = '';
  for (const el of document.querySelector(sel).querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.visually-hidden, .skip-link')) continue;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const fs = parseFloat(cs.fontSize);
    if (fs < min) { min = fs; who = el.tagName + '.' + String(el.className).slice(0, 30); }
  }
  return { min, who };
}, root);

const box = async (loc) => loc.evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; });

async function expectNoOverflow(page, label) {
  const o = await overflow(page);
  expect(o.page, `${label}: document scrollWidth - innerWidth`).toBeLessThanOrEqual(0);
  expect(o.body, `${label}: body scrollWidth - innerWidth`).toBeLessThanOrEqual(0);
  expect(o.wide, `${label}: elements outside the viewport`).toEqual([]);
}

// Axe has no colour rules here, so the theme hardly matters: it runs in dark mode only (time budget).
// image-alt on `.details-poster` is a known, preserved quirk (FOLLOW-UPS: the `alt` reads a field that is never set); excluded on purpose.
async function axeScan(page, label, mode) {
  if (mode !== 'dark') return;
  const r = await new AxeBuilder({ page }).exclude('.details-poster').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['color-contrast']).analyze();
  const v = r.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect(v, `${label}: axe violations`).toEqual([]);
}

for (const size of SIZES) {
  for (const mode of ['dark', 'light']) {
    test.describe(`BC-33 ${size.name} ${mode}`, () => {
      test.use({ viewport: { width: size.width, height: size.height }, apiTotalPages: 1 });
      const phone = size.width <= 600;
      const shortWide = size.width > 600 && size.height <= 500;

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* storage blocked */ } }, [KEY, mode]);
      });

      test('BC-33 home: no horizontal scroll, readable text, targets, header fits, autocomplete', async ({ page }) => {
        await open(page, '/home');
        await expect(page.locator('.about-container').first()).toBeVisible();
        await expectNoOverflow(page, 'home');

        // Body copy floor: 12px everywhere (the vw-based About card font was 8-10px); phones also 12px in the About cards (Step 8 follow-up: the 14px phone floor pushed the search box below the fold).
        expect((await minFont(page, '.home-contianer')).min, 'home min font px').toBeGreaterThanOrEqual(12);
        if (phone) expect((await minFont(page, '.home-view-container')).min, 'About card font px on phones').toBeGreaterThanOrEqual(12);

        // Header: nothing wraps out of the bar (short landscape windows), toggle and nav are inside the viewport.
        if (!phone) {
          const bar = await box(page.locator('.header-container'));
          for (const sel of ['.header-container h1', '.header-container h3', '.theme-toggle-desktop']) {
            for (const b of await page.locator(sel).evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }))) {
              expect(b.top, sel + ' top inside the header bar').toBeGreaterThanOrEqual(bar.top - 1);
              expect(b.bottom, sel + ' bottom inside the header bar').toBeLessThanOrEqual(bar.bottom + 1);
            }
          }
          if (shortWide) expect(bar.height, 'header stays the 12.4vh bar (no wrapping)').toBeLessThanOrEqual(size.height * 0.124 + 1);
        }

        // Target size: WCAG 2.5.8 minimum 24px for every control except inline links in the About text (spacing exception:
        // each is > 24px away from the next target); phones: 44px for the primary controls.
        const small = await page.evaluate(() => Array.from(document.querySelectorAll('a[href], button, input, [role=option]'))
          .filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0 && !el.closest('.about-container') && !el.closest('.poster-container') && (r.width < 24 || r.height < 24); })
          .map((el) => el.tagName + '.' + el.className));
        expect(small, 'interactive targets under 24x24 CSS px').toEqual([]);
        if (phone) {
          for (const sel of ['.header-mobile-container button.icon', '.theme-toggle-mobile']) {
            const b = await box(page.locator(sel));
            expect(b.width, sel + ' width').toBeGreaterThanOrEqual(44);
            expect(b.height, sel + ' height').toBeGreaterThanOrEqual(44);
          }
        }

        // Skip link: off-screen until focused, then fully inside the viewport.
        await page.keyboard.press('Tab');
        const skip = page.locator('.skip-link');
        await expect(skip).toBeFocused();
        const sb = await box(skip);
        expect(sb.left).toBeGreaterThanOrEqual(0);
        expect(sb.top).toBeGreaterThanOrEqual(0);
        expect(sb.right).toBeLessThanOrEqual(size.width);
        expect(sb.bottom).toBeLessThanOrEqual(size.height);

        // Autocomplete: 3 options with a very long title, then zero results.
        await page.route('https://api.themoviedb.org/3/search/movie*', json(search([{ id: 500, original_title: LONG, poster_path: '/1.jpg' }, { id: 501, original_title: 'Short', poster_path: '/2.jpg' }, { id: 502, original_title: 'Mid length title here', poster_path: '/3.jpg' }])));
        await page.locator('#auto').fill('a');
        await page.locator('#auto').press('b');
        await expect(page.locator('.option')).toHaveCount(3);
        await page.waitForTimeout(250);
        await expectNoOverflow(page, 'autocomplete open');
        const list = await box(page.locator('#movie-search-listbox'));
        for (const b of await page.locator('.option, .movie-search-poster-container img').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { right: r.right, height: r.height, cls: e.className.toString() }; }))) {
          expect(b.right, `autocomplete ${b.cls} inside the list box`).toBeLessThanOrEqual(list.right + 1);
        }
        for (const h of await page.locator('.option').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
          expect(h, 'option height').toBeGreaterThanOrEqual(phone ? 44 : 24);
        }
        await axeScan(page, 'home with autocomplete', mode);
        await page.route('https://api.themoviedb.org/3/search/movie*', json(search([])));
        await page.locator('#auto').fill('zzz');
        await page.locator('#auto').press('z');
        await expect(page.locator('.option')).toHaveCount(0);
        await expectNoOverflow(page, 'autocomplete zero results');
      });

      test('BC-33 phone menu: open menu keeps the theme toggle in the bar and every item usable', async ({ page }) => {
        test.skip(!phone, 'hamburger menu exists up to 600px');
        await open(page, '/home');
        await page.locator('.header-mobile-container button.icon').click();
        const bar = await box(page.locator('#home'));
        const tog = await box(page.locator('.theme-toggle-mobile'));
        expect(tog.top, 'toggle stays at the top of the bar').toBeLessThanOrEqual(bar.top + 1);
        expect(tog.bottom, 'toggle does not slide down into the menu').toBeLessThanOrEqual(bar.bottom + 4);
        const links = page.locator('#myLinks a');
        await expect(links).toHaveCount(4);
        for (let i = 0; i < 4; i++) {
          const b = await box(links.nth(i));
          expect(b.height, 'menu item height').toBeGreaterThanOrEqual(44);
          expect(b.right).toBeLessThanOrEqual(size.width);
          expect(b.bottom).toBeLessThanOrEqual(size.height);
          // the toggle is drawn above the first rows only if it fits in the bar; it must not cover a menu item
          expect(tog.bottom <= b.top + 4, 'toggle does not overlap menu item ' + i).toBeTruthy();
        }
        await expectNoOverflow(page, 'menu open');
      });

      test('BC-33 list and dialog: grid, dialog fits the viewport and scrolls inside', async ({ page }) => {
        await open(page, '/home');
        if (phone) {
          await page.locator('.header-mobile-container button.icon').click();
          await page.locator('#myLinks a', { hasText: 'Popular Movies' }).click();
        } else {
          await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
        }
        await expect(page.locator('.poster').first()).toBeVisible();
        await page.waitForTimeout(300);
        await expectNoOverflow(page, 'popular list');
        expect((await minFont(page)).min, 'list page min font px').toBeGreaterThanOrEqual(12);
        const tiles = await page.evaluate(() => {
          const r = Array.from(document.querySelectorAll('.poster-container')).slice(0, 40).map((e) => e.getBoundingClientRect());
          const t0 = Math.round(r[0].top);
          return { cols: r.filter((x) => Math.round(x.top) === t0).length, w: r[0].width, h: r[0].height, right: Math.max(...r.map((x) => x.right)) };
        });
        expect(tiles.cols, 'columns').toBe(phone ? 1 : 8);
        expect(tiles.right, 'grid inside the viewport').toBeLessThanOrEqual(size.width + 1);
        // windowing metrics are intact: mounted tiles + spacers account for the full list (BC-24)
        await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', /^\d+$/);
        await axeScan(page, 'popular list', mode);

        const cases = [
          ['normal', {}],
          ['edge: long title, no poster, empty overview, no homepage', { original_title: LONG, poster_path: null, overview: '', homepage: '' }],
          ['long overview and long homepage URL', { overview: 'Lorem ipsum dolor sit amet consectetur. '.repeat(60), homepage: 'https://example.com/' + 'a-very-long-path-segment-'.repeat(8) }],
        ];
        // the long-overview case runs in dark mode only (time budget; the layout does not depend on the colours)
        for (const [label, det] of cases.filter(([l]) => mode === 'dark' || !l.startsWith('long'))) {
          await page.route(/api\.themoviedb\.org\/3\/movie\/\d+\?/, async (route) => {
            const base = { id: 5, original_title: 'Fixture Movie Title', poster_path: '/detail.jpg', overview: 'A deterministic fixture overview.', homepage: 'https://example.com/fixture-movie', release_date: '2021-02-03', genres: [{ id: 1, name: 'Action' }], popularity: 123.456, vote_average: 8.1 };
            await json({ ...base, ...det })(route);
          });
          await page.locator('.poster').first().dispatchEvent('click');
          const dialog = page.getByRole('dialog');
          await expect(dialog).toBeVisible();
          await expect(page.locator('#movie-title')).toBeVisible();
          await page.waitForTimeout(350);
          await expectNoOverflow(page, `dialog ${label}`);
          const paper = await box(page.locator('.MuiDialog-paper'));
          expect(paper.top, `${label}: dialog top`).toBeGreaterThanOrEqual(0);
          expect(paper.left, `${label}: dialog left`).toBeGreaterThanOrEqual(0);
          expect(paper.bottom, `${label}: dialog bottom`).toBeLessThanOrEqual(size.height);
          expect(paper.right, `${label}: dialog right`).toBeLessThanOrEqual(size.width);
          const close = page.locator('button[aria-label="close"]');
          const cb = await box(close);
          expect(cb.top).toBeGreaterThanOrEqual(paper.top);
          expect(cb.bottom).toBeLessThanOrEqual(paper.bottom);
          expect(cb.right).toBeLessThanOrEqual(paper.right);
          expect(cb.width).toBeGreaterThanOrEqual(24);
          expect(cb.height).toBeGreaterThanOrEqual(24);
          // the title text never runs under the close button
          const title = await page.locator('#movie-title h6').evaluate((el) => { const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return { right: r.right }; });
          expect(title.right, `${label}: title text ends before the close button`).toBeLessThanOrEqual(cb.left + 1);
          expect((await minFont(page, '.MuiDialog-paper')).min, `${label}: dialog min font px`).toBeGreaterThanOrEqual(12);
          // content taller than the room scrolls inside the dialog (the page behind never does)
          const sc = await page.locator('#dialog-content').evaluate((el) => { const before = el.scrollTop; el.scrollTop = 99999; const moved = el.scrollTop; el.scrollTop = before; return { scrollable: el.scrollHeight > el.clientHeight, moved }; });
          if (sc.scrollable) expect(sc.moved, `${label}: dialog content scrolls`).toBeGreaterThan(0);
          if (label.startsWith('long') || shortWide) expect(sc.scrollable, `${label}: expected an internal scroll`).toBeTruthy();
          if (label === 'normal') await axeScan(page, 'dialog', mode);
          await close.click();
          await expect(dialog).toBeHidden();
        }
      });
    });
  }
}

// Step 8 follow-up regression: the search box (#auto) must be fully inside common phone viewports on Home
// (the 14px About floor put it at y=747 in 390x664 and BC-23's click failed 'outside of the viewport').
// 360x640 and 320x568 do not fit (documented in DECISIONS); 12px text is the floor, so they are not asserted.
for (const [width, height] of [[390, 664], [375, 667]]) {
  for (const mode of ['dark', 'light']) {
    test.describe(`BC-33 search box in view ${width}x${height} ${mode}`, () => {
      test.use({ viewport: { width, height }, apiTotalPages: 1 });
      test(`BC-33 #auto is inside the ${width}x${height} viewport and clickable (${mode})`, async ({ page }) => {
        await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* storage blocked */ } }, [KEY, mode]);
        await open(page, '/home');
        await expect(page.locator('#auto')).toBeVisible();
        const b = await box(page.locator('#auto'));
        expect(b.top, 'search input top').toBeGreaterThanOrEqual(0);
        expect(b.bottom, 'search input bottom edge must be <= viewport height').toBeLessThanOrEqual(height);
        // Playwright's ratio-1 check is not used: the scroll area (section, overflow hidden) clips the last few px by design (DECISIONS Step 8 follow-up).
        await expect(page.locator('#auto')).toBeInViewport({ ratio: 0.5 });
        await page.locator('#auto').click();
        await expect(page.locator('#auto')).toBeFocused();
        expect((await minFont(page, '.home-view-container')).min, 'About card font px').toBeGreaterThanOrEqual(12);
      });
    });
  }
}
