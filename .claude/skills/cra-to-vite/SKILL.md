---
name: cra-to-vite
description: Phase 1 checklist to replace react-scripts 3.4.1 with Vite and Vitest in Movie City while keeping GitHub Pages deployment, the /movie-database/ base path and the build/ output folder.
---
# CRA -> Vite checklist (React 16, Router 5, MUI 4 stay as they are)

Pre-check: Phase 0 baseline exists; `npm view vite engines`, `npm view @vitejs/plugin-react peerDependencies` confirm Node and React 16 support. If the plugin cannot support React 16, bump React to 17 FIRST (Phase 2 content) and record it in DECISIONS.md.

1. Dependencies: remove `react-scripts`; add `vite`, `@vitejs/plugin-react` (devDeps). Tests: `vitest`, `jsdom`; keep RTL/jest-dom for now.
2. `vite.config.js`: `base: process.env.VITE_BASE ?? '/movie-database/'` (configurable so Cloudflare can build with `VITE_BASE=/`; default stays GitHub Pages, see DECISIONS.md), `plugins: [react()]`, `build: { outDir: 'build' }` (keeps `gh-pages -d build` valid), `server: { port: 3000 }` (README says 3000). Test block: `environment: 'jsdom'`, `globals: true`, `setupFiles: './src/setupTests.js'`.
3. `index.html` -> repo root (`git mv public/index.html index.html`). Replace `%PUBLIC_URL%/x` with `/x` (Vite applies `base`). Add `<script type="module" src="/src/index.jsx"></script>` before `</body>`. Keep the inline `<style>`, inline `<script>`, `<title>React App</title>` and the font-awesome CDN link exactly (BC-18).
4. Rename files containing JSX from `.js` to `.jsx` with `git mv`: `src/index.js`, `src/App.js`, `src/App.test.js`, `src/setupTests.js` (if it has no JSX it can stay `.js`). Update the two imports (`./App`, none for index since entry is in html).
5. `src/serviceWorker.js` is CRA boilerplate that only ever calls `unregister()`. Keep that behavior (it removes any stale service worker from older deployments): replace the file import with a 5-line inline snippet in index.jsx: `if ('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))`. Delete serviceWorker.js. `process.env.PUBLIC_URL` is only used there.
6. `package.json` scripts: `start`/`dev` -> `vite`, `build` -> `vite build`, `test` -> `vitest`, add `preview`. Remove `eject` and `eslintConfig` (or replace with an ESLint flat config in Phase 6). Keep `homepage`, `predeploy`, `deploy` unchanged. Keep `browserslist` only if the owner wants it (Vite uses `build.target`).
7. Env vars: the key already lives in `src/config.js` (`REACT_APP_TMDB_API_KEY`, owner-approved, see DECISIONS.md). Switch it to `import.meta.env.VITE_TMDB_API_KEY`, rename the variable in the gitignored `.env` (never print the value) and in `.env.example` (empty). Note `process.env.REACT_APP_*` does not exist under Vite, so verify the e2e suite still sees `hasKey`. Also document `VITE_BASE` in `.env.example` (commented out).
8. Tests: fix `setupTests` import to the installed jest-dom entry (`@testing-library/jest-dom` for the Vitest globals build; check its README for the current path). Jest APIs (`jest.fn`) -> `vi.fn`. Decide the stale `App.test.js` with the owner.
9. Verify: `npm run build` -> open `build/index.html`, assets start with `/movie-database/`; run the Phase 0 e2e suite UNCHANGED against the new build; `npm run preview` works at `/movie-database/`.
10. Gate phase 1; run `security-reviewer`; expect most dev-only vulnerabilities gone.
