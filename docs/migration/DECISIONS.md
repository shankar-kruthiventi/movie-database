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
- Approved by: none yet (applied by build-migrator following the recorded fallback; owner please confirm).
