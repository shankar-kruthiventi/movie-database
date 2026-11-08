// Shared helpers: mocked TMDB API + images, request log. No real key anywhere.
const base = require('@playwright/test');
const { expect } = base;
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const FIX = path.join(__dirname, 'fixtures');
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));

// Deterministic solid-colour PNG (100x150) so poster grids are visible in screenshots.
function png(seed) {
  const w = 100, h = 150;
  const rgb = [(seed * 53) % 200 + 40, (seed * 97) % 200 + 40, (seed * 193) % 200 + 40];
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: w }, () => Buffer.from(rgb)))]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const FA_CSS = '.fa{display:inline-block;width:1em;height:1em}.fa-bars:before{content:"\\2261";font-size:20px}';

/** Installs mocks. Returns a log: { api: [{path, params, url}], consoleErrors: [], logs: [] }. */
async function mockAll(page, opts = {}) {
  const log = { api: [], consoleErrors: [], logs: [] };
  page.on('console', (m) => {
    if (m.type() === 'error') log.consoleErrors.push(m.text());
    if (m.type() === 'log') log.logs.push(m.text());
  });
  page.on('pageerror', (e) => log.consoleErrors.push('pageerror: ' + e.message));

  await page.route('https://api.themoviedb.org/3/**', async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname.replace('/3', '');
    const params = Object.fromEntries(url.searchParams.entries());
    // never keep the API key in logs/assertion messages
    const { api_key, ...safe } = params;
    log.api.push({ path: p, params: safe, hasKey: !!api_key, url: route.request().url().replace(/api_key=[^&]*/, 'api_key=REDACTED') });
    let body;
    let m;
    if ((m = p.match(/^\/movie\/(popular|top_rated|now_playing)$/))) {
      body = fixture(`list-${m[1]}-${Math.min(Number(params.page || 1), 8)}.json`);
      // Step 5b: tests that are not about the next-page prefetch pin a single-page list (total_pages 1) so no page 2 is requested on its own.
      if (opts.totalPages !== undefined) body = { ...body, total_pages: opts.totalPages };
    } else if (p === '/search/movie') {
      body = fixture('search-results.json');
    } else if ((m = p.match(/^\/movie\/(\d+)$/))) {
      body = m[1] === '999' ? fixture('movie-detail-zero.json') : { ...fixture('movie-detail.json'), id: Number(m[1]) };
    } else {
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
  });
  await page.route('https://image.tmdb.org/**', (route) => {
    const n = Number((route.request().url().match(/(\d+)\.\w+$/) || [0, 1])[1]);
    route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: png(n) });
  });
  await page.route('https://cdnjs.cloudflare.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: FA_CSS }));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  return log;
}

const apiCalls = (log, p) => log.api.filter((c) => c.path === p);
const pageParams = (log, p) => apiCalls(log, p).map((c) => c.params.page);

/** Opens the app at a hash route (empty = bare base URL). */
async function open(page, hash = '') {
  await page.goto('/movie-database/' + (hash ? '#' + hash : ''));
}

/** Home first, then client-side nav to a list (the realistic path; list mounts with data already loaded). */
async function openListViaNav(page, linkName) {
  await open(page, '/home');
  await page.locator('.header-container a', { hasText: linkName }).click();
  await page.locator('.poster').first().waitFor();
}

/** Show More is visibility:hidden in CSS today, so dispatch the click on the DOM element. */
const clickShowMore = (page) => page.locator('.next-button').dispatchEvent('click');

// Console allow-list: documented in docs/migration/baseline/NOTES.md (keep in sync).
const CONSOLE_ALLOW = [];

/** Test with auto mocking + console.error guard. Use: test('BC-xx ...', async ({ page, app }) => {...}) */
const test = base.test.extend({
  // Option (test.use({ apiTotalPages: 1 })): `total_pages` of every mocked list response; undefined keeps the fixtures' own value (8).
  apiTotalPages: [undefined, { option: true }],
  app: [async ({ page, apiTotalPages }, use) => {
    const log = await mockAll(page, { totalPages: apiTotalPages });
    await use(log);
    const bad = log.consoleErrors.filter((e) => !CONSOLE_ALLOW.some((a) => e.includes(a)));
    expect(bad, 'unexpected console errors').toEqual([]);
  }, { auto: true }],
});

module.exports = { test, fixture, mockAll, apiCalls, pageParams, open, openListViaNav, clickShowMore, expect };
