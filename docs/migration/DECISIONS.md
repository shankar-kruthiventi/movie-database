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

## 2026-11-07 - Phase 4 - Material-UI 4 -> @mui/material 9.5.0 (pending owner approval)
- Target (live `npm view`): `@mui/material@^9.5.0` and `@mui/icons-material@^9.5.0` (npm `latest`), `@emotion/react@^11.14.0`, `@emotion/styled@^11.14.1`. Peers of 9.5.0: `react`/`react-dom` `^17 || ^18 || ^19`, `@emotion/react ^11.5`, `@emotion/styled ^11.3`; emotion peers `react >=16.8`. So the latest major supports installed React 17.0.2 and no older major was needed (7.3.11, 6.5.0, 5.18.0 have the same React peers and remain a fallback).
- `@material-ui/lab` was declared but grep over `src/`, `index.html`, `vite.config.js`, `e2e/` found no usage: removed together with `@material-ui/core` and `@material-ui/icons`. `@mui/styles` not used.
- Theme pins (`src/theme.js`, applied in `src/index.jsx` with `StyledEngineProvider injectFirst` + `ThemeProvider`): primary/secondary palettes to v4 values (secondary main #f50057 for "Show More"), and v4 breakpoints (md 960, lg 1280, xl 1920). Without the breakpoint pin the `maxWidth="md"` dialog shrank from 960px to 900px (desktop snapshot failed, 30371 px different, ratio 0.03).
- `withStyles`/`disableTypography` replaced by `sx` (DialogTitle `component="div"`, margin 0, padding 16px; close button absolute, right/top 8px, grey[500]; DialogContent padding 16px). `id="movie-title"` still wins over Dialog's aria-labelledby id, so `#movie-title` and the existing aria mismatch are unchanged.
- Hidden regression found by the mobile snapshot (17160 px, ratio 0.06): current DialogTitle is itself a Typography h6, so `.MuiTypography-root.MuiTypography-h6 { padding: 0 25px }` in `movie-details.style.css` also hit the title bar (v4 `disableTypography` did not). Fixed in the component with `"&&&": { p: 2 }` specificity, not by editing the CSS or using `!important`.
- Vitest: `test.server.deps.inline: [/@mui/]` in `vite.config.js` because MUI's ESM imports `react/jsx-runtime` without extension and Node ESM resolution failed in the smoke test. Test-only.
- Installed with `npx npm@11`; no `--force`/`--legacy-peer-deps`.
- Approved by: pending owner.
