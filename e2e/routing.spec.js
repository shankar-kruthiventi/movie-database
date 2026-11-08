const { test, expect, open, openListViaNav, apiCalls, pageParams } = require('./helpers');

test('BC-01 bare URL and #/ redirect to #/home; hash URLs are used', async ({ page }) => {
  await open(page);
  await expect(page).toHaveURL(/\/movie-database\/#\/home$/);
  await open(page, '/');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.about').first()).toHaveText('About this app');
});

test('BC-01 #/home loads Home; list URLs are reached through header links and use hash URLs', async ({ page }) => {
  await open(page, '/home');
  await expect(page.locator('.home-contianer')).toBeVisible();
  for (const [label, route] of [['Popular Movies', 'popular'], ['Top Rated Movies', 'top-rated'], ['Now Playing', 'now-playing']]) {
    await page.locator('.header-container a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`/movie-database/#/${route}$`));
    await expect(page.locator('.poster').first()).toBeVisible();
    await expect(page.locator('.poster')).toHaveCount(20);
  }
});

test('BC-02 unknown hash path renders header only', async ({ page }) => {
  await open(page, '/does-not-exist');
  await expect(page.locator('.header-view')).toBeVisible();
  await expect(page.locator('h1')).toHaveText('MOVIE ATLAS');
  await expect(page.locator('.home-contianer')).toHaveCount(0);
  await expect(page.locator('.movies-container')).toHaveCount(0);
  await expect(page.locator('.poster')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/does-not-exist$/);
});

test('BC-03 active nav link gets class "active"', async ({ page }) => {
  await open(page, '/home');
  const link = (label) => page.locator('.header-container a', { hasText: label });
  await expect(link('Home')).toHaveClass(/active/);
  await expect(link('Popular Movies')).not.toHaveClass(/active/);
  await link('Popular Movies').click();
  await expect(link('Popular Movies')).toHaveClass(/active/);
  await expect(link('Home')).not.toHaveClass(/active/);
  await link('Top Rated Movies').click();
  await expect(link('Top Rated Movies')).toHaveClass(/active/);
  await expect(link('Popular Movies')).not.toHaveClass(/active/);
  await expect(link('Top Rated Movies')).toHaveCSS('color', 'rgb(153, 228, 200)');
});

test('BC-07 list route with an empty list redirects to /home (direct load of a list URL ends on home)', async ({ page }) => {
  // Quirk: MovieList mounts before the first fetch resolves, so direct/bookmarked list URLs bounce to home.
  for (const route of ['popular', 'top-rated', 'now-playing']) {
    await page.goto('about:blank'); // force a fresh app load (a hash-only change would not reload the app)
    await open(page, '/' + route);
    await expect(page).toHaveURL(/#\/home$/);
    await expect(page.locator('.home-contianer')).toBeVisible();
  }
});

test('BC-04 first load requests GET /3/movie/popular?language=en-US&page=1 once', async ({ page, app }) => {
  await open(page);
  await expect(page.locator('.home-contianer')).toBeVisible();
  await expect.poll(() => apiCalls(app, '/movie/popular').length).toBe(1);
  const call = apiCalls(app, '/movie/popular')[0];
  expect(call.params.page).toBe('1');
  expect(call.params.language).toBe('en-US');
  expect(call.url.startsWith('https://api.themoviedb.org/3/movie/popular?')).toBe(true);
  // the stored results become the Popular list
  await page.locator('.header-container a', { hasText: 'Popular Movies' }).click();
  await expect(page.locator('.poster').first()).toHaveAttribute('alt', 'popular p1 movie 0');
});

test('BC-05 category switch replaces the list with page 1; page counter starts at 2 and is not reset', async ({ page, app }) => {
  await openListViaNav(page, 'Popular Movies');
  await expect(page.locator('.poster')).toHaveCount(20);
  await page.locator('.next-button').dispatchEvent('click');
  await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', '40'); // list length (step 5: .poster is only the mounted window)
  await page.locator('.next-button').dispatchEvent('click');
  await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', '60'); // list length (step 5: .poster is only the mounted window)
  expect(pageParams(app, '/movie/popular')).toEqual(['1', '1', '2', '3']);
  // switch category: replaced by page 1 of top_rated
  await page.locator('.header-container a', { hasText: 'Top Rated Movies' }).click();
  await expect(page.locator('.poster')).toHaveCount(20);
  await expect(page.locator('.poster').first()).toHaveAttribute('alt', 'top_rated p1 movie 0');
  expect(pageParams(app, '/movie/top_rated')).toEqual(['1']);
  // counter not reset: next Show More asks for page 4 of the new category
  await page.locator('.next-button').dispatchEvent('click');
  await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', '40'); // list length (step 5: .poster is only the mounted window)
  expect(pageParams(app, '/movie/top_rated')).toEqual(['1', '4']);
  await expect(page.locator('.poster').nth(20)).toHaveAttribute('alt', 'top_rated p4 movie 0');
});

test('BC-08 Show More exists for a non-empty list (hidden by CSS today) and appends the next page', async ({ page, app }) => {
  await openListViaNav(page, 'Now Playing');
  const btn = page.locator('.next-button');
  await expect(btn).toHaveCount(1);
  await expect(btn).toHaveText('Show More');
  // Quirk: .next-button { visibility: hidden } in movie-list.style.css; infinite scroll is the user path.
  await expect(btn).toHaveCSS('visibility', 'hidden');
  await btn.dispatchEvent('click');
  await expect(page.locator('.movieList-container')).toHaveAttribute('data-total', '40'); // list length (step 5: .poster is only the mounted window)
  expect(pageParams(app, '/movie/now_playing')).toEqual(['1', '2']);
  await expect(page.locator('.poster').nth(20)).toHaveAttribute('alt', 'now_playing p2 movie 0');
  await expect(page.locator('.poster').nth(0)).toHaveAttribute('alt', 'now_playing p1 movie 0');
});

test('BC-06 poster grid uses image.tmdb.org/t/p/w500 + poster_path', async ({ page }) => {
  await openListViaNav(page, 'Popular Movies');
  await expect(page.locator('.poster').first()).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/poster100.jpg');
  await expect(page.locator('.poster').nth(19)).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w500/poster119.jpg');
  await expect(page.locator('.poster-container').nth(3)).toHaveAttribute('id', '3');
});
