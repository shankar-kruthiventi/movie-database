const { test, expect, open, apiCalls } = require('./helpers');

const enterKey = (loc) => loc.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', charCode: 13, keyCode: 13, bubbles: true })));

test('BC-13 About sections and four external links open in a new tab with rel noopener noreferrer', async ({ page }) => {
  await open(page, '/home');
  await expect(page.locator('.about').nth(0)).toHaveText('About this app');
  await expect(page.locator('.about').nth(1)).toHaveText('About me');
  // 2026-11-08 owner copy change: exact text and list structure
  const norm = (t) => (t || '').replace(/\s+/g, ' ').trim();
  const cards = page.locator('.about-container');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText('Movie Atlas is a sleek React web application designed to elevate your cinematic exploration. The platform empowers users to');
  await expect(cards.first()).toContainText('Powered by the robust themoviedb.org REST API, Movie Atlas delivers a fast, data-rich experience for film enthusiasts.');
  await expect(cards.nth(1)).toContainText('Movie Atlas was engineered by Sankar Kruthiventi. Feel free to explore my work or get in touch through my professional and social channels:');
  await expect(cards.nth(1).locator('b').first()).toHaveText('Sankar Kruthiventi');
  await expect(cards.locator('ol')).toHaveCount(0);
  const appList = cards.first().locator('ul');
  await expect(appList).toHaveCount(1);
  await expect(appList.locator('li')).toHaveCount(3);
  const appItems = [
    ['Discover Favorites:', 'Discover Favorites: Search seamlessly for any movie in cinematic history.'],
    ['Unlock Deep Insights:', 'Unlock Deep Insights: Access comprehensive, real-time details for any selected title.'],
    ['Track Trends:', 'Track Trends: Instantly stream curated feeds of popular, top-rated, and now-playing releases.'],
  ];
  for (const [i, [lead, full]] of appItems.entries()) {
    await expect(appList.locator('li').nth(i).locator('b')).toHaveText(lead);
    expect(norm(await appList.locator('li').nth(i).textContent())).toBe(full);
  }
  const meList = cards.nth(1).locator('ul.about-me-list');
  await expect(cards.nth(1).locator('ul')).toHaveCount(1);
  await expect(meList.locator('li')).toHaveCount(3);
  const meItems = [
    ['Professional Networking:', 'Professional Networking: LinkedIn'],
    ['Code & Repositories:', 'Code & Repositories: Github'],
    ['Social & Community:', 'Social & Community: Facebook | Instagram'],
  ];
  for (const [i, [lead, full]] of meItems.entries()) {
    await expect(meList.locator('li').nth(i).locator('b')).toHaveText(lead);
    expect(norm(await meList.locator('li').nth(i).textContent())).toBe(full);
  }
  // Facebook and Instagram share the third li; the visible "|" separator is hidden from assistive tech
  await expect(meList.locator('li').nth(2).locator('a')).toHaveText(['Facebook', 'Instagram']);
  await expect(meList.locator('li').nth(2).locator('span[aria-hidden="true"]')).toHaveText('|');
  await expect(meList.locator('li').nth(0).locator('a')).toHaveText('LinkedIn');
  await expect(meList.locator('li').nth(1).locator('a')).toHaveText('Github');
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

// Follow-up D (2026-11-10): one search per pause in typing (250 ms trailing debounce) instead of one per keyup.
const searchCalls = (app) => apiCalls(app, '/search/movie');
const queries = (app) => searchCalls(app).map((c) => c.params.query);

test('BC-14 fast typing sends ONE GET /3/search/movie?query=<raw>&page=1 for the settled text', async ({ page, app }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await page.waitForTimeout(500);
  expect(queries(app)).toEqual(['bat']);
  expect(searchCalls(app).every((c) => c.params.page === '1')).toBe(true);
  await expect(page.locator('#auto')).toHaveValue('bat');
  // query is not URL-encoded: '&' splits the query string
  await page.locator('#auto').fill('');
  const before = searchCalls(app).length;
  await page.locator('#auto').pressSequentially('x&y');
  await expect.poll(() => searchCalls(app).slice(before).length).toBe(1);
  const full = searchCalls(app)[before];
  expect(full.url).toBe('https://api.themoviedb.org/3/search/movie?api_key=REDACTED&language=en-US&query=x&y&page=1');
  expect(full.params.query).toBe('x');
  expect(full.params.y).toBe('');
});

test('BC-14 a pause in typing sends one request per settled text; the suggestions stay while the next one is pending', async ({ page, app }) => {
  await open(page, '/home');
  const input = page.locator('#auto');
  await input.click();
  await input.pressSequentially('ba');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await input.pressSequentially('t');
  // inside the debounce window the old suggestions are still there (no flicker) and no request has left
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  expect(queries(app)).toEqual(['ba']);
  await expect.poll(() => queries(app)).toEqual(['ba', 'bat']);
});

test('BC-14 keys that do not change the text (arrows, Shift, Tab, Escape, Enter without a selection) send no request', async ({ page, app }) => {
  await open(page, '/home');
  const input = page.locator('#auto');
  await input.click();
  await input.pressSequentially('bat');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await page.waitForTimeout(500);
  const n = searchCalls(app).length;
  for (const key of ['ArrowDown', 'ArrowUp', 'Shift', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) await page.keyboard.press(key);
  await page.waitForTimeout(600);
  expect(searchCalls(app).length).toBe(n);
});

test('BC-14 paste and cut search too (the text changed without a key release)', async ({ page, app }) => {
  await open(page, '/home');
  const input = page.locator('#auto');
  await input.fill('matrix'); // fill = one input event, no keyup
  await expect.poll(() => queries(app)).toEqual(['matrix']);
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
});

test('BC-14 clearing the box clears the suggestions at once and sends no request', async ({ page, app }) => {
  await open(page, '/home');
  const input = page.locator('#auto');
  await input.pressSequentially('bat');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await page.waitForTimeout(400);
  const n = searchCalls(app).length;
  await input.fill('');
  await expect(page.locator('.autoContainer')).toHaveCount(0);
  await input.fill('   ');
  await page.waitForTimeout(600);
  expect(searchCalls(app).length).toBe(n);
  await expect(page.locator('.autoContainer')).toHaveCount(0);
});

test('BC-14 a slow answer for an earlier text never replaces the answer for the later text', async ({ page }) => {
  // "ba" is answered late with its own titles; "bat" answers at once. The list must end on the "bat" answer.
  let releaseBa;
  const slowBa = new Promise((r) => { releaseBa = r; });
  await open(page, '/home');
  // registered after the shared mock, so it is consulted first; everything but "ba" falls through to the mock
  await page.route('https://api.themoviedb.org/3/search/movie**', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('query');
    if (q === 'ba') { await slowBa; await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ page: 1, results: [{ id: 9, title: 'STALE ba result', poster_path: '/s.jpg' }], total_results: 1 }) }).catch(() => {}); return; }
    await route.fallback();
  });
  const input = page.locator('#auto');
  await input.pressSequentially('ba');
  await page.waitForTimeout(400); // the "ba" request is now in flight (held)
  await input.pressSequentially('t');
  await expect(page.locator('.autoContainer .option').first().locator('span')).toHaveText('Search Result 0');
  releaseBa();
  await page.waitForTimeout(600);
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await expect(page.locator('.autoContainer .option').first().locator('span')).toHaveText('Search Result 0');
  await expect(page.locator('.autoContainer')).not.toContainText('STALE');
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

test('BC-14 (step 4, 2026-11-07) open list with no options renders nothing (the literal 0 quirk was removed)', async ({ page }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await expect(page.locator('#auto').locator('xpath=..')).toHaveText('');
  await expect(page.locator('.autoContainer')).toHaveCount(0);
});

const emptySearch = (page) => page.route('https://api.themoviedb.org/3/search/movie**', (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ page: 1, results: [], total_results: 0 }) }));

test('BC-14 (step 4b, 2026-11-07) a search with zero results clears the suggestions (no stale list); a later search with results brings them back', async ({ page }) => {
  await open(page, '/home');
  await page.locator('#auto').click();
  await page.locator('#auto').pressSequentially('bat');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
  await emptySearch(page);
  await page.locator('#auto').pressSequentially('zzz');
  await expect(page.locator('.autoContainer')).toHaveCount(0);
  await expect(page.locator('#auto')).toHaveAttribute('aria-expanded', 'false');
  // still at most 3 shown once results return
  await page.unroute('https://api.themoviedb.org/3/search/movie**');
  await page.locator('#auto').press('Backspace');
  await expect(page.locator('.autoContainer .option')).toHaveCount(3);
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
