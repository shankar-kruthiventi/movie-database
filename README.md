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
- `npm run e2e`: Playwright behavior-contract tests against the production build with a mocked TMDB API.

## Deploying

### GitHub Pages (owner only)

`npm run deploy` builds (`predeploy`) and publishes `build/` to the `gh-pages` branch, which updates the live site. The default base path is `/movie-database/`.

### Cloudflare Pages (movieatlas.sankarbuilds.io)

Connect the repository in the Cloudflare dashboard and set:

- Build command: `npm run build`
- Build output directory: `build`
- Environment variables: `VITE_TMDB_API_KEY`, `VITE_BASE=/`, `NODE_VERSION=22`

No redirect rules are needed because routing uses the URL hash.

## Migration notes

The dependency modernization (CRA to Vite, React 16 to 19, Router 5 to 6, Material-UI 4 to MUI 9) was done under a behavior contract. See `docs/migration/` (`BEHAVIOR-CONTRACT.md`, `DECISIONS.md`, `FOLLOW-UPS.md`).
