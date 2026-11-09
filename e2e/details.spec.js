const { test, expect, openListViaNav, apiCalls, fixture } = require('./helpers');

const enterKey = (loc) => loc.evaluate((el) => el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', charCode: 13, keyCode: 13, bubbles: true })));

test('BC-06 click on a poster loads GET /3/movie/{id} and opens the dialog', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').nth(2).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const calls = apiCalls(app, '/movie/102');
  expect(calls).toHaveLength(1);
  expect(calls[0].params.language).toBe('en-US');
  await expect(page.locator('#movie-title')).toContainText('Fixture Movie Title');
});

test('BC-06 Enter key on a poster opens the dialog', async ({ page, app }) => {
  await openListViaNav(page, 'Top Rated Movies');
  await enterKey(page.locator('.poster').nth(1));
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(apiCalls(app, '/movie/201')).toHaveLength(1);
});

test('BC-11 dialog content: title, poster, overview, homepage link, date, genres, popularity, rating', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('h6')).toHaveText('Fixture Movie Title');
  await expect(dialog.locator('button[aria-label="close"]')).toBeVisible();
  await expect(dialog.locator('.details-poster')).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/detail.jpg');
  await expect(dialog.locator('.overview')).toHaveText('A deterministic fixture overview.');
  const link = dialog.locator('a.movie-home-page');
  await expect(link).toHaveAttribute('href', 'https://example.com/fixture-movie');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
  await expect(link).toHaveAttribute('rel', /noreferrer/);
  const other = dialog.locator('.details-other-container');
  await expect(other).toContainText('Release date: 2021-02-03');
  await expect(other).toContainText('Genres: Action Drama');
  await expect(other).toContainText('Popularity: 123.456');
  await expect(other).toContainText('Rating: 8.1/10');
  // layout: maxWidth md, divider content
  await expect(page.locator('.MuiDialog-paperWidthMd')).toHaveCount(1);
  await expect(page.locator('#dialog-content')).toHaveClass(/MuiDialogContent-dividers/);
});

test('BC-11 quirk: zero popularity/rating and empty genres render a literal 0', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.route('https://api.themoviedb.org/3/movie/100?*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(fixture('movie-detail-zero.json')) }));
  await page.locator('.poster').first().click();
  const other = page.getByRole('dialog').locator('.details-other-container');
  await expect(other).toContainText('Zero values overview.');
  await expect(other).not.toContainText('Genres:');
  await expect(other).not.toContainText('Popularity:');
  await expect(other).not.toContainText('Rating:');
  await expect(other.locator('a.movie-home-page')).toHaveCount(0);
  const text = await other.evaluate((el) => el.textContent);
  expect(text).toBe('Zero values overview.Release date: 2000-01-01000');
});

test('BC-12 dialog closes via close icon', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('button[aria-label="close"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('BC-12 dialog closes via Escape', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('BC-12 dialog closes via backdrop click', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await page.locator('.poster').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

// Follow-up C (2026-11-09): the TMDB `homepage` becomes a link only when it is an absolute http(s) URL. Anything else
// renders exactly like the existing no-homepage case (no link element, same layout).
const detailWith = (homepage) => (route) =>
  route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ...fixture('movie-detail.json'), id: 100, homepage }) });

async function openWithHomepage(page, homepage) {
  await openListViaNav(page, 'Popular Movies');
  await page.route('https://api.themoviedb.org/3/movie/100?*', detailWith(homepage));
  await page.locator('.poster').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.overview')).toBeVisible();
  return dialog;
}

const paperBox = (dialog) => dialog.evaluate((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });

for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,<b>x</b>', '//evil.example/x', 'vbscript:x', 'not a url', 'example.com', 'ftp://example.com']) {
  test(`BC-11 Follow-up C: homepage ${JSON.stringify(bad)} is not rendered as a link and the layout equals the no-homepage case`, async ({ page }) => {
    const dialog = await openWithHomepage(page, bad);
    await expect(dialog.locator('a.movie-home-page')).toHaveCount(0);
    await expect(dialog.locator('a[href]')).toHaveCount(0);
    await expect(dialog.locator('.details-other-container')).not.toContainText(bad.slice(0, 8));
    const same = await paperBox(dialog);
    await page.locator('button[aria-label="close"]').click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.route('https://api.themoviedb.org/3/movie/100?*', detailWith(''));
    await page.locator('.poster').first().click();
    await expect(page.getByRole('dialog').locator('.overview')).toBeVisible();
    expect(await paperBox(page.getByRole('dialog')), 'dialog size equals the empty-homepage dialog').toEqual(same);
  });
}

test('BC-11 Follow-up C: an empty homepage renders no link (unchanged)', async ({ page }) => {
  const dialog = await openWithHomepage(page, '');
  await expect(dialog.locator('a.movie-home-page')).toHaveCount(0);
});

for (const good of ['https://example.com/fixture-movie', 'http://example.org/a?b=c#d']) {
  test(`BC-11 Follow-up C: ${good} is a link with target=_blank and rel=noopener noreferrer`, async ({ page }) => {
    const dialog = await openWithHomepage(page, good);
    const link = dialog.locator('a.movie-home-page');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', good);
    await expect(link).toHaveText(good);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
}
