# Risk register

| ID | Risk | Phase | Mitigation | Owner decision needed |
|----|------|-------|-----------|----------------------|
| R-01 | Old stack (react-scripts 3.4.1/webpack 4) may not build on current Node | 0 | gate sets `--openssl-legacy-provider`; fall back to Node 14/16 via nvm; document in baseline NOTES.md | no |
| R-02 | Nested BrowserRouter + HashRouter throws in Router 6+ | 3 | remove outer BrowserRouter, keep HashRouter | no |
| R-03 | `<Link>` without `to` throws in Router 6+ | 3 | replace element, keep id/CSS | no |
| R-04 | react-smooth-scrollbar may not support newer React (unmaintained?) | 2-5 | verify via registry/source; fallback = local wrapper on `smooth-scrollbar` core | yes, if visible change |
| R-05 | MUI default theme drift (secondary color, injection order) | 4 | pin theme to v4 values; `injectFirst`; screenshot diff | no |
| R-06 | GitHub Pages base path / output dir change in Vite | 1 | `base`, `outDir: 'build'`; e2e served at `/movie-database/` | no |
| R-07 | StrictMode double effects hide/introduce differences in dev | 5 | e2e runs on production build only | no |
| R-08 | TMDB API key in source and git history | 6 | env var + owner rotates the key; history rewrite is optional and owner-only | yes |
| R-09 | Search query not URL-encoded / state mutation quirk | any | keep behavior, log in FOLLOW-UPS.md | later |
| R-10 | Stale `App.test.js` fails on baseline | 1 | decide: delete or rewrite after e2e exists | yes |
| R-11 | Lockfile drift / forced installs hide conflicts | all | hooks block `--force`, stop-gate requires lockfile sync | no |
