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
