# Movie Atlas (movie-database)

A movie browser built with React and the TMDB API. Live on GitHub Pages: https://shankar-kruthiventi.github.io/movie-database/#/home

Author: shankar-kruthiventi

## Stack

React 19, react-router-dom 6 (HashRouter, so URLs look like `#/home`), MUI 9 (`@mui/material`, Emotion), smooth-scrollbar, Vite 7, Vitest 4 with Testing Library, Playwright for end-to-end tests.

Requires Node >= 22.13.

## Setup

```
npm install
```

Create a `.env` file (it is gitignored; never commit it):

```
VITE_TMDB_API_KEY=<your TMDB API key>
# optional: base path of the built site, defaults to /movie-database/
VITE_BASE=/movie-database/
```

Note: Vite inlines the key into the client bundle at build time, so it is visible in the deployed site.

## Scripts

- `npm run dev` (or `npm start`): dev server at http://localhost:3000.
- `npm run build`: production build into `build/`.
- `npm run preview`: serve the production build locally.
- `npm test`: unit tests (Vitest, watch mode; `npx vitest run` for a single run).
- `npm run typecheck`: strict TypeScript check (`tsc --noEmit` for `src/`, then for `vite.config.ts` via `tsconfig.node.json`). `npm run build` is plain `vite build` and does not type-check; run `typecheck` before committing.
- `npm run e2e`: Playwright behavior-contract tests against the production build with a mocked TMDB API.
- Theme and accessibility: dark (default) and light mode via the header toggle (`src/theme.css` tokens, `src/theme-mode.tsx`); contrast ratios for every pair are in `docs/migration/ACCESSIBILITY-COLORS.md` (`node scripts/a11y/contrast-table.mjs --check` recomputes them; e2e runs axe color-contrast in both modes).

## Deploying

### GitHub Pages (owner only)

`npm run deploy` builds (`predeploy`) and publishes `build/` to the `gh-pages` branch, which updates the live site. The default base path is `/movie-database/`.

### Cloudflare (movie-atlas.sankarbuilds.io)

The site is served as static assets by a Cloudflare Worker, configured in `wrangler.jsonc` (`assets.directory` is `./build`, the Vite output folder). The build must use the root base path, because the site lives at `/` and not at `/movie-database/`.

Dashboard setup (Workers Builds, connected to this repository):

- Build command: `npm ci && npm run build`
- Deploy command: `npx wrangler deploy`
- Build variables (Settings, Build, Build Variables and Secrets): `VITE_TMDB_API_KEY=<your TMDB API key>`, `VITE_BASE=/`, `NODE_VERSION=22`. The Cloudflare build image defaults to Node 24; the repository's `.nvmrc` (`22`) is also read, the variable just makes it explicit.
- Custom domain: Workers & Pages, your Worker, Settings, Domains & Routes, Add, Custom Domain, `movie-atlas.sankarbuilds.io`. The `sankarbuilds.io` zone must be active in Cloudflare.
- Wrangler is not a dependency of this project, so `npx wrangler deploy` fetches it on demand. Cloudflare's docs say Workers Builds uses the Wrangler version from `package.json` but do not say what happens when there is none; if a build complains, add `wrangler` as a devDependency (a decision for the owner, not done here).

Manual deploy from a terminal (needs `wrangler login` once):

```
VITE_BASE=/ npm run build
npx wrangler deploy
```

On Windows PowerShell set the variable first: `$env:VITE_BASE='/'; npm run build`.

Checks:

- `VITE_BASE=/` is the one thing that differs from GitHub Pages. Without it the built `index.html` points at `/movie-database/static/...` and the page is blank on the custom domain. A correct build has no `/movie-database/` anywhere in `build/`.
- No redirect rules are needed: routing uses the URL hash (`#/home`, `#/top-rated`). Old links such as `#/top_rated` and `#/now_playing` are redirected by the app.
- The TMDB key is built into the public JavaScript (a Vite `VITE_` variable). Anyone can read it from the site, so use a key you can rotate and rotate it if it leaks (the previous key is in the git history).

## Migration notes

The dependency modernization (CRA to Vite, React 16 to 19, Router 5 to 6, Material-UI 4 to MUI 9) was done under a behavior contract. See `docs/migration/` (`BEHAVIOR-CONTRACT.md`, `DECISIONS.md`, `FOLLOW-UPS.md`).
