const { test, expect, open, apiCalls } = require('./helpers');

const enterKey = (loc) => loc.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', charCode: 13, keyCode: 13, bubbles: true })));

test('BC-13 About sections and four external links open in a new tab with rel noopener noreferrer', async ({ page }) => {
  await open(page, '/home');
  await expect(page.locator('.about').nth(0)).toHaveText('About this app');
  await expect(page.locator('.about').nth(1)).toHaveText('About me');
  await expect(page.locator('.about-container').first()).toContainText('Movie City is made using React.');
  await expect(page.locator('.about-container').nth(1)).toContainText('ShankarKruthiventi');
  const expected = {
    LinkedIn: 'https://www.linkedin.com/in/shankarkruthiventi/',
    Github: 'https://github.com/shankar-kruthiventi',
    Facebook: 'https://www.facebook.com/shankar.kruthiventi/',
    Instagram: 'https://www.instagram.com/madhav_kruthiventi/',
  };
  await expect(page.locator('.about-container a')).toHaveCount(4);
  for (const [name, href] of Object.entries(expected)) {
    const a = page.locator('.about-container a', { hasText: name });
    await expect(a).toHaveAttribute('href', href);
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

test('BC-14 every keyup calls GET /3/search/movie?query=<raw>&page=1', async ({ page, app }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await expect.poll(() => apiCalls(app, '/search/movie').length).toBe(3);
  const calls = apiCalls(app, '/search/movie');
  expect(calls.map((c) => c.params.query)).toEqual(['b', 'ba', 'bat']);
  expect(calls.every((c) => c.params.page === '1')).toBe(true);
  await expect(page.locator('#auto')).toHaveValue('bat');
  // query is not URL-encoded: '&' splits the query string
  await page.locator('#auto').fill('');
  const before = apiCalls(app, '/search/movie').length;
  await page.locator('#auto').pressSequentially('x&y');
  await expect.poll(() => apiCalls(app, '/search/movie').slice(before).some((c) => c.url.includes('query=x&y&page=1'))).toBe(true);
  const full = apiCalls(app, '/search/movie').slice(before).find((c) => c.url.includes('query=x&y&page=1'));
  expect(full.url).toBe('https://api.themoviedb.org/3/search/movie?api_key=REDACTED&language=en-US&query=x&y&page=1');
  expect(full.params.query).toBe('x');
  expect(full.params.y).toBe('');
});

test('BC-14 suggestion list shows at most 3 results (title + poster); input click toggles; outside click hides', async ({ page }) => {
  await open(page, '/home');
  const input = page.locator('#auto');
  await input.click();
  await input.pressSequentially('bat');
  const options = page.locator('.autoContainer .option');
  await expect(options).toHaveCount(3);
  await expect(options.nth(0).locator('span')).toHaveText('Search Result 0');
  await expect(options.nth(2).locator('span')).toHaveText('Search Result 2');
  await expect(options.nth(0).locator('img.movie-search-poster')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/s0.jpg');
  // input click toggles the list
  await input.click();
  await expect(page.locator('.autoContainer')).toHaveCount(0);
  await input.click();
  await expect(page.locator('.autoContainer')).toBeVisible();
  // click outside hides
  await page.locator('.find-text').click();
  await expect(page.locator('.autoContainer')).toHaveCount(0);
});

test('BC-14 quirk: open list with no options renders a literal 0', async ({ page }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await expect(page.locator('#auto').locator('xpath=..')).toHaveText('0');
});

test('BC-14 click on a suggestion loads details, opens the dialog and hides the list', async ({ page, app }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await page.locator('.autoContainer .option').nth(1).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(apiCalls(app, '/movie/501')).toHaveLength(1);
  await expect(page.locator('.autoContainer')).toHaveCount(0);
  await expect(page.locator('#movie-title')).toContainText('Fixture Movie Title');
});

test('BC-14 Enter on a suggestion loads details, opens the dialog and hides the list', async ({ page, app }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await enterKey(page.locator('.autoContainer .option').nth(2));
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(apiCalls(app, '/movie/502')).toHaveLength(1);
  await expect(page.locator('.autoContainer')).toHaveCount(0);
});

test('BC-14 typing scrolls #test into view', async ({ page }) => {
  await page.addInitScript(() => {
    window.__scrolled = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...a) { window.__scrolled.push(this.id); return orig.apply(this, a); };
  });
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('ab');
  const scrolled = await page.evaluate(() => window.__scrolled);
  expect(scrolled).toEqual(['test', 'test']);
});

test('BC-14 details dialog opened from Home closes with Escape', async ({ page }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await page.locator('.autoContainer .option').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
