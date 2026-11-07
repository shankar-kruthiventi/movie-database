// BC-22 Home search autocomplete: accessible combobox (WAI-ARIA APG editable combobox, list autocomplete),
// keyboard model, click/tap outside, focus indicator, live region. Both themes. (Movie Atlas step 4)
const { test, expect, open, apiCalls } = require('./helpers');
const AxeBuilder = require('@axe-core/playwright').default;
const { ratio, parseColor } = require('./contrast-helpers');

const KEY = 'movie-atlas-theme';
const MODES = ['dark', 'light'];

const input = (page) => page.locator('#auto');
const options = (page) => page.getByRole('option');
async function typeQuery(page, text = 'bat') {
  await input(page).click();
  await input(page).pressSequentially(text);
  await expect(options(page)).toHaveCount(3);
}
const selected = (page) => page.locator('[role="option"][aria-selected="true"]');

async function axeViolations(page, include) {
  const r = await new AxeBuilder({ page }).include(include).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  return r.violations.flatMap((v) => v.nodes.map((n) => `${v.id} ${n.target.join(' ')} :: ${n.failureSummary}`));
}

for (const mode of MODES) {
  test.describe(`${mode} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(([k, m]) => { try { localStorage.setItem(k, m); } catch (e) { /* about:blank */ } }, [KEY, mode]);
    });

    test(`BC-22 roles, names and attributes (${mode})`, async ({ page }) => {
      await open(page, '/home');
      const box = input(page);
      await expect(box).toHaveAttribute('role', 'combobox');
      await expect(box).toHaveAttribute('aria-autocomplete', 'list');
      await expect(box).toHaveAttribute('aria-expanded', 'false');
      await expect(box).toHaveAttribute('aria-controls', 'movie-search-listbox');
      await expect(box).not.toHaveAttribute('aria-activedescendant', /.*/);
      await expect(page.getByRole('combobox', { name: 'Search for movies here' })).toHaveCount(1);
      await expect(page.getByRole('listbox')).toHaveCount(0);

      await typeQuery(page);
      await expect(box).toHaveAttribute('aria-expanded', 'true');
      const list = page.getByRole('listbox', { name: 'Movie suggestions' });
      await expect(list).toBeVisible();
      await expect(list).toHaveAttribute('id', 'movie-search-listbox');
      const opts = options(page);
      for (let i = 0; i < 3; i++) {
        await expect(opts.nth(i)).toHaveAttribute('id', `movie-search-option-${i}`);
        await expect(opts.nth(i)).toHaveAttribute('aria-selected', 'false');
        await expect(opts.nth(i)).toHaveAccessibleName(`Search Result ${i}`);
      }
      await expect(box).not.toHaveAttribute('aria-activedescendant', /.*/);
      await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(3);
    });

    test(`BC-22 ArrowDown/ArrowUp move the active option and wrap; focus stays in the input; Enter opens details (${mode})`, async ({ page, app }) => {
      await open(page, '/home');
      await typeQuery(page);
      const box = input(page);
      await page.keyboard.press('ArrowDown');
      await expect(box).toHaveAttribute('aria-activedescendant', 'movie-search-option-0');
      await expect(selected(page)).toHaveCount(1);
      await expect(options(page).nth(0)).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(box).toHaveAttribute('aria-activedescendant', 'movie-search-option-2');
      await page.keyboard.press('ArrowDown'); // wraps to first
      await expect(box).toHaveAttribute('aria-activedescendant', 'movie-search-option-0');
      await page.keyboard.press('ArrowUp'); // wraps to last
      await expect(box).toHaveAttribute('aria-activedescendant', 'movie-search-option-2');
      await page.keyboard.press('ArrowUp');
      await expect(box).toHaveAttribute('aria-activedescendant', 'movie-search-option-1');
      await expect(box).toBeFocused();
      // caret is not moved by the arrows (default prevented)
      expect(await box.evaluate((n) => n.selectionStart)).toBe(3);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toBeVisible();
      expect(apiCalls(app, '/movie/501')).toHaveLength(1);
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(box).toHaveAttribute('aria-expanded', 'false');
    });

    test(`BC-22 Enter without an active option does nothing; typing resets the active option; hover sets it (${mode})`, async ({ page, app }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(apiCalls(app, '/movie/500')).toHaveLength(0);
      await options(page).nth(1).hover();
      await expect(input(page)).toHaveAttribute('aria-activedescendant', 'movie-search-option-1');
      await page.keyboard.press('ArrowDown');
      await expect(input(page)).toHaveAttribute('aria-activedescendant', 'movie-search-option-2');
      await page.keyboard.type('m');
      await expect(input(page)).not.toHaveAttribute('aria-activedescendant', /.*/);
      await expect(selected(page)).toHaveCount(0);
    });

    test(`BC-22 ArrowDown/ArrowUp on a closed list with results opens it (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await page.keyboard.press('ArrowDown');
      await expect(input(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(input(page)).toHaveAttribute('aria-activedescendant', 'movie-search-option-0');
      await page.keyboard.press('Escape');
      await page.keyboard.press('ArrowUp');
      await expect(input(page)).toHaveAttribute('aria-activedescendant', 'movie-search-option-2');
    });

    test(`BC-22 Escape closes the popup and keeps the value and focus; Esc with no popup does nothing (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(input(page)).not.toHaveAttribute('aria-activedescendant', /.*/);
      await expect(input(page)).toHaveValue('bat');
      await expect(input(page)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(input(page)).toHaveValue('bat');
      await expect(input(page)).toBeFocused();
    });

    test(`BC-22 Tab closes the popup and moves focus on (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Tab');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
      await expect(input(page)).not.toBeFocused();
      await expect(input(page)).toHaveValue('bat');
    });

    test(`BC-22 click outside, tap outside and focus leaving close the popup; inside input/list does not (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      // pressing inside the list does not close it (and keeps focus in the input)
      const opt = options(page).nth(1);
      const b = await opt.boundingBox();
      await page.mouse.move(b.x + 20, b.y + b.height / 2);
      await page.mouse.down();
      await expect(page.getByRole('listbox')).toBeVisible();
      await expect(input(page)).toBeFocused();
      await page.mouse.up();
      await expect(page.getByRole('dialog')).toBeVisible(); // the click selected it
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // click on the About card (outside)
      await input(page).focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.locator('.about-container').first().click({ position: { x: 5, y: 5 } });
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(input(page)).toHaveAttribute('aria-expanded', 'false');

      // tap (touch pointer) outside
      await input(page).click(); // reopens (toggle)
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.locator('.find-text').dispatchEvent('pointerdown', { pointerType: 'touch', bubbles: true });
      await expect(page.getByRole('listbox')).toHaveCount(0);

      // focus leaving by script (e.g. assistive tech) closes it
      await input(page).click();
      await expect(page.getByRole('listbox')).toBeVisible();
      await page.locator('.about-container a').first().focus();
      await expect(page.getByRole('listbox')).toHaveCount(0);

      // clicking in the input toggles, it does not count as outside
      await input(page).click();
      await expect(page.getByRole('listbox')).toBeVisible();
      await input(page).click();
      await expect(page.getByRole('listbox')).toHaveCount(0);
    });

    test(`BC-22 the outside-click listener is removed when Home unmounts (${mode})`, async ({ page }) => {
      await page.addInitScript(() => {
        const live = new Set();
        window.__live = live;
        const add = document.addEventListener.bind(document);
        const rem = document.removeEventListener.bind(document);
        document.addEventListener = (t, f, o) => { if (t === 'pointerdown') live.add(f); return add(t, f, o); };
        document.removeEventListener = (t, f, o) => { if (t === 'pointerdown') live.delete(f); return rem(t, f, o); };
      });
      await open(page, '/home');
      await expect(input(page)).toBeVisible();
      const mounted = await page.evaluate(() => window.__live.size);
      expect(mounted).toBeGreaterThanOrEqual(1);
      await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
      await page.locator('.poster').first().waitFor();
      expect(await page.evaluate(() => window.__live.size)).toBeLessThan(mounted);
    });

    test(`BC-22 active option indicator: 2px ring >= 3:1 on its own and neighbouring fills, only on the active option (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('ArrowDown');
      const info = await page.evaluate(() => {
        const get = (i) => {
          const el = document.getElementById(`movie-search-option-${i}`);
          const cs = getComputedStyle(el);
          return { style: cs.outlineStyle, w: parseFloat(cs.outlineWidth), c: cs.outlineColor, bg: cs.backgroundColor, off: parseFloat(cs.outlineOffset), text: getComputedStyle(el.querySelector('span')).color };
        };
        return { active: get(0), other: get(1) };
      });
      expect(info.active.style).toBe('solid');
      expect(info.active.w).toBeGreaterThanOrEqual(2);
      expect(info.active.off).toBeLessThan(0); // inset: drawn over the option itself
      expect(info.other.style).toBe('none');
      const ring = parseColor(info.active.c).slice(0, 3);
      const activeBg = parseColor(info.active.bg).slice(0, 3);
      const otherBg = parseColor(info.other.bg).slice(0, 3);
      expect(ratio(ring, activeBg), 'ring vs active fill').toBeGreaterThanOrEqual(3);
      expect(ratio(ring, otherBg), 'ring vs other option fill').toBeGreaterThanOrEqual(3);
      expect(ratio(parseColor(info.active.text).slice(0, 3), activeBg), 'text on active fill').toBeGreaterThanOrEqual(4.5);
      expect(activeBg).not.toEqual(otherBg); // fill is a second cue besides the ring
      // the input itself keeps the global :focus-visible ring
      const f = await input(page).evaluate((n) => ({ fv: n.matches(':focus-visible'), w: parseFloat(getComputedStyle(n).outlineWidth), s: getComputedStyle(n).outlineStyle }));
      expect(f.fv).toBe(true);
      expect(f.s).not.toBe('none');
      expect(f.w).toBeGreaterThanOrEqual(2);
    });

    test(`BC-22 polite live region announces the result count and no results (${mode})`, async ({ page }) => {
      await open(page, '/home');
      const live = page.getByRole('status');
      await expect(live).toHaveAttribute('aria-live', 'polite');
      await expect(live).toHaveText('');
      await typeQuery(page);
      await expect(live).toHaveText('3 results available');
      await page.keyboard.press('Escape');
      await expect(live).toHaveText('');
      // a search with no results
      await page.route('https://api.themoviedb.org/3/search/movie**', (route) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ page: 1, results: [], total_results: 0 }) }));
      await page.reload();
      await input(page).click();
      await input(page).pressSequentially('zzz');
      await expect(live).toHaveText('No results');
      await expect(page.getByRole('listbox')).toHaveCount(0);
      await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
    });

    test(`BC-22 axe (aria validity, names, contrast) on the open popup with an active option (${mode})`, async ({ page }) => {
      await open(page, '/home');
      await typeQuery(page);
      await page.keyboard.press('ArrowDown');
      expect(await axeViolations(page, '.finder')).toEqual([]);
      await page.keyboard.press('Escape');
      expect(await axeViolations(page, '.finder')).toEqual([]);
    });
  });
}
