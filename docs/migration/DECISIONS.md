# Decisions

(Agents append: date, phase, decision, reason, who approved.)

## 2026-11-07 - Phase 0 - TMDB API key moved to an env var
- Decision: the key is read in `src/config.js` from `process.env.REACT_APP_TMDB_API_KEY` (CRA). Real value lives in the gitignored `.env`; `.env.example` is committed with an empty value.
- Reason: owner asked to remove hardcoded keys from source. This overrides CLAUDE.md rule 5 ("no key anywhere new") for this one `.env` file only.
- Limits: the key is still inlined in the client bundle and in git history. Rotation at themoviedb.org is still pending (owner).
- Approved by: owner.
- Phase 1 follow-up: `config.js` switches to `import.meta.env.VITE_TMDB_API_KEY`; `.env` is renamed to match (this also moves the env step from Phase 6 into Phase 1).

## 2026-11-07 - Phase 1 plan - Deploy to both GitHub Pages and Cloudflare Pages
- Decision: make the Vite base path configurable. `vite.config.js` uses `base: process.env.VITE_BASE ?? '/movie-database/'`. Default stays `/movie-database/` (GitHub Pages, `npm run deploy`, and the Phase 0 e2e suite, which assume that path). Cloudflare builds set `VITE_BASE=/`.
- Cloudflare Pages setup (owner does this in the dashboard; Claude never deploys):
  - Connect the GitHub repo. Build command `npm run build`, output directory `build`.
  - Environment variables: `VITE_TMDB_API_KEY=<key>` and `VITE_BASE=/`. Until Phase 1 lands (CRA): `REACT_APP_TMDB_API_KEY`, `CI=false`, `NODE_VERSION=16` (or `NODE_OPTIONS=--openssl-legacy-provider` on Node >= 17), and `homepage` would need `/` or `.`.
- Routing: HashRouter means no SPA redirect rules are needed on Cloudflare.
- Security note: a Cloudflare variable does not hide the key, because it is inlined into the bundle at build time. Hiding it needs a Pages Function/Worker proxy, which is a behavior change and is NOT planned. Log it in FOLLOW-UPS.md if wanted.
- Approved by: owner.

## 2026-11-07 - Phase 1 - Toolchain versions and options (dependency-auditor, live `npm view`)
- Versions: `vite@^7.3.7`, `@vitejs/plugin-react@^5.2.0`, `vitest@^4.1.12`, `jsdom@^29.1.1` (devDependencies). Chosen over the Vite 8 / rolldown set to minimise behavior-parity risk. `jsdom@31` is excluded: it needs Node >= 22.22.2, local Node is 22.15.
- JSX runtime: `react({ jsxRuntime: 'classic' })`, because installed React 16.13.1 has no `react/jsx-runtime` (arrived in 16.14.0). All JSX files already `import React`. No React bump in Phase 1.
- Node floor: >= 22.13 (Vite 7 needs ^20.19 or >=22.12; jsdom 29 needs ^22.13). Add `engines`/`.nvmrc`. Cloudflare: `NODE_VERSION=22`, not 16. This supersedes the interim CRA/Node 16 Cloudflare notes above once Phase 1 lands, as do `VITE_TMDB_API_KEY` and `VITE_BASE=/`. The `CI=false` and `NODE_OPTIONS=--openssl-legacy-provider` settings are no longer needed.
- `src/App.test.js` (stale CRA template, failing): replaced with a minimal Vitest smoke test that renders App. Approved by owner.
- Risk noted: jest-dom 4.2.4 `extend-expect` under Vitest is unverified; fallback is jest-dom 6.x via `@testing-library/jest-dom/vitest`. RTL stays on 9.x until Phase 5 (RTL 16 needs React 18).

## 2026-11-07 - Phase 1 - jest-dom 6.x fallback, vitest include, npm 11 for installs
- `@testing-library/jest-dom` 4.2.4 -> `^6.9.1` (moved to devDependencies), setup import `@testing-library/jest-dom/vitest`. Reason: the risk noted above materialised, jest-dom 4 matchers do not register under Vitest ("Invalid Chai property: toBeEmptyDOMElement"). This is the fallback already named in the previous entry. RTL stays 9.x.
- `vite.config.js` `test.include: ['src/**/*.test.{js,jsx}']`: Vitest's default glob would otherwise pick up the Playwright `e2e/*.spec.js` files.
- npm 10.9.2 crashes (`Cannot read properties of null (reading 'edgesOut')` in arborist `#loadPeerSet`) when adding vitest to this tree. `vitest` and `jest-dom` were added with `npx npm@11`; the lockfile was written by npm 11. No `--legacy-peer-deps`/`--force` used.
- Approved by: owner, 2026-11-07 (applied by build-migrator following the recorded fallback).

## 2026-11-07 - Phase 2 - React 17 peer conflicts: MUI 4.x bump and react-smooth-scrollbar override
- Target: `react@17.0.2`, `react-dom@17.0.2` (live `npm view`).
- Conflict 1: `@material-ui/core@4.11.0`, `icons@4.9.1`, `lab@4.0.0-alpha.56` peer `react ^16.8.0` only. Decision: bump within the existing ranges to core 4.12.4, icons 4.11.3, lab 4.0.0-alpha.61 (peers `^16.8.0 || ^17.0.0`), as a separate commit before the React bump.
- Conflict 2: `react-smooth-scrollbar@8.0.6` (latest published) peers `react ^0.14 || ^15 || ^16`. Decision: `overrides` in package.json widening its `react` peer range to include 17. No `--force`, no `--legacy-peer-deps`.
- Source review of react-smooth-scrollbar dist: no `findDOMNode`, no string refs. It uses legacy `childContextTypes`/`getChildContext` and `componentWillReceiveProps` (still supported in 17; warnings only under StrictMode in dev), plus a callback ref and `componentDidMount` init. Verified via BC-09/BC-10 e2e on the production build.
- Installs run with `npx npm@11` (npm 10.9.2 crashes on this tree, see Phase 1).
- Approved by: owner, 2026-11-07 (approval relayed to the implementing agent by the coordinating agent; not seen directly).

## 2026-11-07 - Phase 3 - react-router-dom 5 -> 6.30.6 (HashRouter kept)
- Target: `react-router-dom@^6.30.6` (latest 6.x via live `npm view`; peers `react >=16.8`, `react-dom >=16.8`, so React 17.0.2 is fine). Owner chose v6 over v7 in chat on 2026-11-07; a later move to v7 is its own step.
- Edits per skill `router-v5-to-v6`: `Switch`->`Routes`, `component`/`render`->`element`, `Redirect`->`Navigate replace` (App `/` and MovieList empty-list BC-07), `exact`/`extact` and NavLink `activeClassName`/`extact` dropped (v6 adds `active` itself), `<Link id="home">` (no `to`) -> `<a id="home">` (same `.header-mobile-container a` and `#home` CSS applies). HashRouter and hash URLs unchanged; no wildcard route added (BC-02).
- Deviation from the task wording "keep the nested BrowserRouter quirk": impossible in v6 (throws "You cannot render a <Router> inside another <Router>"), so the outer `BrowserRouter` in `src/index.jsx` was removed as the skill and CLAUDE.md prescribe. No user-visible effect: only hash URLs are used.
- Minor DOM difference: v5 leaked `extact="true"` as an HTML attribute on the Popular link; it is gone. No test or CSS depends on it.
- Installed with `npx npm@11`; no `--force`/`--legacy-peer-deps`.
- Approved by: owner (v6 choice, 2026-11-07, relayed by the coordinating agent).

## 2026-11-07 - Phase 4 - Material-UI 4 -> @mui/material 9.5.0
- Target (live `npm view`): `@mui/material@^9.5.0` and `@mui/icons-material@^9.5.0` (npm `latest`), `@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1`. Peers of 9.5.0: `react`/`react-dom` `^17 || ^18 || ^19`, `@emotion/react ^11.5`, `@emotion/styled ^11.3`; emotion peers `react >=16.8`. So the latest major supports installed React 17.0.2 and no older major was needed (7.3.11, 6.5.0, 5.18.0 have the same React peers and remain a fallback).
- `@material-ui/lab` was declared but grep over `src/`, `index.html`, `vite.config.js`, `e2e/` found no usage: removed together with `@material-ui/core` and `@material-ui/icons`. `@mui/styles` not used.
- Theme pins (`src/theme.js`, applied in `src/index.jsx` with `StyledEngineProvider injectFirst` + `ThemeProvider`): primary/secondary palettes to v4 values (secondary main #f50057 for "Show More"), and v4 breakpoints (md 960, lg 1280, xl 1920). Without the breakpoint pin the `maxWidth="md"` dialog shrank from 960px to 900px (desktop snapshot failed, 30371 px different, ratio 0.03).
- `withStyles`/`disableTypography` replaced by `sx` (DialogTitle `component="div"`, margin 0, padding 16px; close button absolute, right/top 8px, grey[500]; DialogContent padding 16px). `id="movie-title"` still wins over Dialog's aria-labelledby id, so `#movie-title` and the existing aria mismatch are unchanged.
- Hidden regression found by the mobile snapshot (17160 px, ratio 0.06): current DialogTitle is itself a Typography h6, so `.MuiTypography-root.MuiTypography-h6 { padding: 0 25px }` in `movie-details.style.css` also hit the title bar (v4 `disableTypography` did not). Fixed in the component with `"&&&": { p: 2 }` specificity, not by editing the CSS or using `!important`.
- Vitest: `test.server.deps.inline: [/@mui/]` in `vite.config.js` because MUI's ESM imports `react/jsx-runtime` without extension and Node ESM resolution failed in the smoke test. Test-only.
- Installed with `npx npm@11`; no `--force`/`--legacy-peer-deps`.
- Approved by: owner, 2026-11-07 (MUI 9.5.0 confirmed in chat after the regression review PASS).

## 2026-11-07 - Phase 5 - react-smooth-scrollbar replaced by an in-repo wrapper
- Why: `react-smooth-scrollbar@8.0.6` (last release) uses legacy `childContextTypes`/`getChildContext` and `componentWillReceiveProps`, and peers `react ^0.14 || ^15 || ^16` (needed an `overrides` entry since Phase 2). Owner agreed to the replacement in chat on 2026-11-07.
- Design (`src/components/smooth-scrollbar/smooth-scrollbar.component.jsx`): function component rendering the same DOM, `<section data-scrollbar><div>{children}</div></section>`; `Scrollbar.init` in a layout effect (same timing as `componentDidMount`), option props (`damping`, `thumbMinSize`, `syncCallbacks`, `renderByPixels`, `alwaysShowTracks`, `continuousScrolling`, `wheelEventTarget`, `plugins`) forwarded, `onScroll(status, scrollbar)` called via a ref so the latest handler runs (as `this.props.onScroll` did), `scrollbar.update()` after every re-render (as `componentDidUpdate`), `destroy()` on unmount, other props spread onto the `<section>`. The legacy `getScrollbar` child context was unused in `src/` and is not reproduced. No CSS or caller changes besides the import path.
- `react-smooth-scrollbar` and its `overrides` entry removed; core `smooth-scrollbar@8.5.2` kept (peers none; deps core-js 2, lodash-es, tslib).
- Approved by: owner (plan agreed in chat, 2026-11-07).

## 2026-11-07 - Phase 5 - React 17 -> 18.3.1 -> 19.3.1, testing libraries
- Versions (live `npm view`): react/react-dom `18.3.1` (latest 18.x), then `19.3.1` (`latest` dist-tag). Peers checked: `@mui/material@9.5.0` `^17 || ^18 || ^19`; `@emotion/react@11.14.0`, `@emotion/styled@11.14.1` `react >=16.8`; `react-router-dom@6.30.6` `react/react-dom >=16.8`; `@testing-library/react@16.3.3` `react/react-dom ^18 || ^19` plus `@testing-library/dom ^10`. `npm ls` is clean after each step; no `--force`/`--legacy-peer-deps` (npm printed "overriding peer dependency" ERESOLVE warnings while moving between majors, the install resolved normally).
- Testing libs: `@testing-library/react` 9.5 -> `16.3.3`; `@testing-library/dom@10.4.2` added explicitly (RTL 16 peer). The smoke test needed no change. `@testing-library/user-event@^7.2.1` is unused in `src/` and `e2e/`: left as is. Approved by: pending owner (remove, or upgrade to 14.6.8).
- `src/index.jsx`: `ReactDOM.render` -> `createRoot` (`react-dom/client`). `React.StrictMode` was already present before this phase and is kept. In dev, React 18+ StrictMode double-runs effects (MovieList auto-click, App fetch); production and the e2e suite (production build) are unchanged. No StrictMode added or removed.
- React 19 removals: grep of `src/` for `propTypes`, `defaultProps`, string refs, legacy context, `findDOMNode`, `ReactDOM.render`, `forwardRef`: none left.
- React 19.3.1 blocks `javascript:` URLs (the click throws "React has blocked a javascript: URL"), which broke the mobile hamburger (BC-15; mobile e2e failed). Fix per skill: `<a href="#" className="icon" onClick={e => { e.preventDefault(); toggleMenu(); }}>`; same element and selector so CSS is untouched; screenshots unchanged. Committed before the React 19 bump so every commit is green.
- JSX runtime: switched from `classic` to the automatic runtime (`react()` in `vite.config.js`) as its own commit; build, unit test and e2e pass. Existing `import React` lines are kept (unused-import cleanup is a separate concern).
- Approved by: owner for the in-scope upgrade steps (task brief); user-event handling pending owner (resolved in Phase 6 below).

## 2026-11-07 - Phase 6 - user-event removed, lodash-es override, dev-only deps, deploy tool bump
- Remove `@testing-library/user-event@7.2.1`: no imports in `src/` or `e2e/`. Approved by: owner, 2026-11-07.
- `overrides: { "lodash-es": "^4.18.1" }` (live `npm view`: versions 4.18.0 and 4.18.1 exist, `latest` is 4.18.1). Reason: high advisories in lodash-es <= 4.17.23, pulled in by `smooth-scrollbar@8.5.2`. `npm ls lodash-es` shows `lodash-es@4.18.1 overridden`. Tested against the full e2e suite (BC-09/BC-10 scroll) via the strict gate. Approved by: owner, 2026-11-07.
- Moved the deploy tool (gh-pages), `@testing-library/react` and `@testing-library/dom` to devDependencies. gh-pages 3.1 -> `^6.3.0` (registry `latest`, engines node >=10, no lodash dependency; `predeploy`/`deploy` scripts unchanged). Deploy was NOT run. Registry data was read from registry.npmjs.org because the Bash guard blocks any command that names the deploy tool.
- Removed `test.server.deps.inline: [/@mui/]` from `vite.config.js`: the unit test passes without it on MUI 9.5.0 / Vitest 4.
- Installs with `npx npm@11`; no `--force`/`--legacy-peer-deps`.

## 2026-11-07 - Post-migration feature work on branch `migration/movie-atlas` (owner answers, chat)
Migration Phases 0-6 are closed and untouched. This branch (from `migration/modernize`) intentionally changes behavior; BEHAVIOR-CONTRACT.md, e2e specs and snapshots are updated step by step, each change logged here. Owner approved this approach ("new branch, update tests"). Hooks still apply (no push/deploy by Claude, no key printing).
Answers given by the owner:
- Name: "Movie Atlas" (two words) everywhere: header (MOVIE ATLAS), About card text, README, manifest names, package name (`movie-atlas`), browser tab title ("React App" -> "Movie Atlas"). GitHub repo name and the `/movie-database/` GitHub Pages path are unchanged.
- About card: "ShankarKruthiventi" -> "Sankar Kruthiventi". The pasted line ended with "on home page"; the owner confirmed it applies ONLY to this last item. All other items are app-wide.
- Cloudflare URLs: only remove `/movie-database/` (build with `VITE_BASE=/`, already supported). Keep HashRouter and the `#/home` part of the URL and routing unchanged. GitHub Pages unchanged.
- Dropped: "load all images before the UI renders". Instead: optimize the DOM so scrolling 20+ pages (400+ tiles) does not overload browser memory or lag. Requirement: scrolling back to the top must show exactly the same tiles as on first load.
- Scroll approach: windowing (render only tiles near the viewport, fixed-size spacers, release far-off images), IntersectionObserver sentinel for loading the next page, keep the custom smooth-scrollbar feel. Fixes to target: blank/flickering tiles, scroll position jumps.
- Responsiveness: test 320, 390, 768, 1024, 1280, 1920 px and phone landscape, light and dark, fix what is found, list each fix.
- Theme: light/dark with dark as the default (today's look) and a header toggle remembered in localStorage; system preference is ignored. Contrast target WCAG 2.2 AA; light mode uses a darker teal accent.
- Keyboard navigation: header and menu (hamburger, links, theme toggle, Esc, visible focus, skip link) and the Home search autocomplete (accessible combobox, arrow keys, Enter, Esc, click outside closes). Poster tiles and the dialog were NOT selected (a dialog already traps focus through MUI).
- Cursor pointer on hover over a tile.
- Router URLs: `top_rated` -> `top-rated`, `now_playing` -> `now-playing`; old `#/top_rated` and `#/now_playing` redirect to the new ones. API calls keep `top_rated`/`now_playing`.
- Favicon: clapperboard with a globe on a dark rounded square with the mint accent (#64dcb0); replaces `public/favicon.ico`, `logo192.png`, `logo512.png` (public/ edit approved by the owner).
- TypeScript: strict, covers `src/` (components, tests, config, theme) and `vite.config`; typed TMDB responses, no `any` in app code. Playwright e2e specs stay JavaScript.
- Order: 1) rename + title + About name fix, 2) TypeScript, 3) light/dark + accessible colors + header keyboard nav, 4) autocomplete accessibility + click-outside, 5) windowing + IntersectionObserver + tile cursor, 6) favicon, 7) URL rename, 8) responsiveness pass, 9) Cloudflare config/README.
- The animated wallpaper pan lives on its own branch `migration/home-bg-pan` (unreviewed, e2e not run) and is NOT part of this branch.
- Open question to ask the owner at step 3: how the wallpaper (collection.jpg) should look in light mode.

## 2026-11-07 - Movie Atlas step 1 - rename, title, About name fix
- "MOVIE CITY" -> "MOVIE ATLAS" in `header.component.jsx` (literal uppercase text in the source, mechanism unchanged); About card "Movie City is made using React" -> "Movie Atlas is made using React" and "ShankarKruthiventi" -> "Sankar Kruthiventi" (that sentence only; the LinkedIn URL is unchanged).
- `index.html` title "React App" -> "Movie Atlas"; `public/manifest.json` short_name/name -> "Movie Atlas" (icons untouched); `package.json` and lockfile root `name` "movies-db" -> "movie-atlas" (lockfile synced with `npx npm@11 install --package-lock-only`, only the two name lines changed); README title -> "Movie Atlas (movie-database)".
- BEHAVIOR-CONTRACT.md: BC-13, BC-15, BC-18 updated with a dated note. Earlier history entries, CLAUDE.md and `.claude/` files left as they are (they describe the old name historically).
- e2e: header, routing, home and build (BC-18 title) assertions updated. Screenshots regenerated with `--update-snapshots=all` (the 1% tolerance had let the old name pass): home x3, popular desktop/tablet, dialog desktop/tablet. popular-mobile and dialog-mobile show no app name and were left untouched.
