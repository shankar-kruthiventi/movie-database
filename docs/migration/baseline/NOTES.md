# Phase 0 baseline notes (OLD stack: react-scripts 3.4.1, React 16.13, Router 5.2, MUI 4.11)

## Environment
- Node v22.15.0, npm 10.9.2, Windows 10. `npm ci` works on Node 22 (230 audit findings: 9 low, 134 moderate, 68 high, 19 critical, all prod+dev as reported by the gate).
- `npm run build` needs `NODE_OPTIONS=--openssl-legacy-provider` on Node >= 17 (the gate sets it). No need to fall back to Node 14/16.
- Playwright 1.65.0 (`@playwright/test`, devDependency), Chromium installed with `npx playwright install chromium`.

## Gate status of the baseline: FAIL on the production build step (known, not fixed)
`gate.mjs` forces `CI=true`. CRA 3.4.1 then treats ESLint warnings as errors and `npm run build` exits non-zero:
- `src/pages/header/header.component.jsx` line 85 `jsx-a11y/anchor-is-valid` and line 86 `no-script-url` (`href="javascript:void(0)"` on the hamburger link).
The same build succeeds with `CI=false` (warnings only) and webpack still emits all assets, so the e2e suite runs against a real production build. Fixing it needs a product-code change or a gate change, both out of scope for Phase 0. Decision needed from the owner (see report). Unit tests: `src/App.test.js` (CRA template) fails as expected and is non-required in baseline mode.

## How the suite runs
- `npm run e2e` = `playwright test`. `e2e/server.mjs` serves `build/` (falls back to `dist/`) at `http://localhost:4173/movie-database/` (the Pages path). The same server works after Vite as long as `outDir` is `build` or `dist`.
- Build first (`NODE_OPTIONS=--openssl-legacy-provider CI=false npm run build` on the old stack); the suite does not build.
- All network is mocked in `e2e/helpers.js` with fixtures in `e2e/fixtures/`; api_key is redacted in recorded URLs. fonts.googleapis/gstatic return empty CSS, font-awesome 4.7 CDN returns a tiny stub (`.fa-bars` glyph) so screenshots are deterministic offline.
- Snapshots: `e2e/__screenshots__/visual.spec.js/{home,popular,dialog}-{desktop,tablet,mobile}.png`, created from the OLD build on Windows/Chromium 1208+. Names are platform neutral (`snapshotPathTemplate`), tolerance `maxDiffPixelRatio 0.01`. Rendering on another OS (Linux CI) may differ in font anti-aliasing; regenerate only with owner approval.
- Console guard: every test fails on `console.error`/page errors. Allow-list (`CONSOLE_ALLOW` in `e2e/helpers.js`) is EMPTY: the old app logs no errors with mocked data.
- Stability: full suite (47 tests) run 3 times in a row on the old build: 47/47 green each time, 0 flaky.

## Behaviors observed that differ from, or sharpen, the contract text
- BC-07/BC-01: direct load or reload of `#/popular`, `#/top_rated`, `#/now_playing` always ends on `#/home` (MovieList mounts with an empty list before the first fetch resolves, then redirects). List URLs only work through in-app navigation, so list bookmarks do not actually work today. Pinned by the BC-07 test.
- BC-08: "Show More" is in the DOM but `.next-button { visibility: hidden }` in movie-list.style.css at all widths. Users never see it; infinite scroll (BC-09) and the tablet auto-click (BC-10) are the paths. Tests click it with `dispatchEvent('click')`.
- BC-10: the 5 auto-clicks run in one loop with the same stale `append` closure, so all 5 request `page=2` (not 2..6), and the list ends at 40 posters. It only triggers when a list view mounts with data already present (navigating from Home); on direct load nothing happens. Pinned: request pages `['1','1','2','2','2','2','2']`.
- BC-14: the list shows a literal `0` when the input is clicked and there are no options (`options.length && ...`), pinned. Typing `x&y` sends `query=x&y&page=1` (not encoded).
- BC-06 Enter key: the posters/suggestions are not focusable, so the Enter tests dispatch a `keypress` event (key Enter, charCode 13) directly on the element.
- BC-18 service worker: the app unregisters a stale worker as soon as it is active (`serviceWorker.ready.then(unregister)`), test registers one from a non-app page, loads the app and expects 0 registrations.

## Not testable / not covered
- BC-17 `gh-pages -d build` publishing itself (deploy is owner-only); only the base-path asset resolution of the build output is tested.
- BC-18 manifest/favicon contents are checked by URL only, not by content.
- Real TMDB responses (fields beyond those used by the app) are not exercised by design.
- Mobile hamburger glyph relies on the stubbed font-awesome CSS in tests.

## Lockfile note
`npm i -D @playwright/test` rewrote `package-lock.json` from lockfileVersion 1 to 3 (npm 10 behavior). Top-level installed versions are unchanged (`npm ls --depth=0` identical apart from Playwright), but the diff is large. Owner should review.
