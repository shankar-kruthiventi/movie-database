---
name: characterization-tests
description: How to write the Playwright safety-net tests for Movie City against the OLD app: mocked TMDB API, production build, one test per behavior-contract ID, screenshots at three viewports.
---
# Characterization tests

Goal: tests that describe what the app does TODAY and run unchanged on every later stack. Framework-independent (Playwright drives a real browser), so Jest->Vitest and React/MUI changes cannot invalidate them.

Setup rules
- Serve the production build: `playwright.config.js` -> `webServer: { command: 'npx vite preview ...' | 'npx serve build -l 4173 -s' }` pointed so the app is reachable at `/movie-database/` (the real Pages path). On the OLD stack use a static server of `build/` mounted at that path (e.g. `npx http-server` with a `/movie-database` prefix or a tiny Node server in `e2e/server.mjs`). The same server script must keep working after Vite.
- Mock all network: `page.route('https://api.themoviedb.org/3/**', ...)` return fixtures from `e2e/fixtures/*.json` keyed by path (`/movie/popular`, `/movie/top_rated`, `/movie/now_playing`, `/movie/:id`, `/search/movie`); `page.route('https://image.tmdb.org/**', ...)` returns a 1x1 PNG. Also stub the font-awesome CDN. Assert on the `page=` query param to pin pagination behavior.
- No real keys anywhere. Fixtures may include 25 fake movies (deterministic ids/titles) so "Show More" and scrolling are testable.
- Use `data`-free selectors that exist today (text, role, alt text, ids like `#auto`, `#myLinks`, `.poster`, `.next-button`) so tests do not require source changes.

Coverage map (one `test()` per ID in docs/migration/BEHAVIOR-CONTRACT.md; name tests `BC-xx ...`)
- Routing: `/#/` redirects to `/#/home`; each of 3 list URLs loads; unknown hash renders header only.
- Data: first load requests `popular&page=1`; switching category replaces list with page 1; Show More requests `page=2` then `3` (pins the page-counter quirk BC-05).
- Details dialog: opens from poster click and Enter key; shows title, overview, release date, genres, popularity, rating, homepage link `target=_blank rel~noopener`; closes via X, Esc, backdrop.
- Search: typing fires `/search/movie` on keyup, shows at most 3 suggestions, click and Enter open details and hide suggestions, outside click hides.
- Infinite scroll: scroll the container, wait >600ms, expect one extra page request (IntersectionObserver path).
- Tablet auto-load: at 900px width, list route triggers 5 extra "Show More" clicks (BC-10).
- Mobile header: hamburger toggles `#myLinks`; choosing an item changes the label and hides the menu.
- Console: fail on `console.error` except an allow-list recorded in baseline NOTES.md.
Screenshots: `expect(page).toHaveScreenshot()` for Home, Popular, dialog at 1280x800, 900x1000, 390x844; mask nothing but fix animations (`animations: 'disabled'`) and fonts via the stubbed CDN.

Stability: run the suite 3x on the OLD build; zero flakes before freezing. Snapshots are created only from the OLD build and are never regenerated in later phases without owner approval.
