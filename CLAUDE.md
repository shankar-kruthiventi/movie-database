# Movie City (movie-database) - modernization project

Personal React app (TMDB movie browser) from ~2020, deployed to GitHub Pages at `/movie-database/`. Goal of this repo's current work: bring dependencies to current, security-compliant versions **without changing any user-visible behavior**.

## Stack today (pre-migration)
react 16.13, react-dom 16.13, react-router-dom 5.2 (HashRouter), @material-ui/core 4 (Dialog, Button, Typography, IconButton, icons), react-scripts 3.4.1 (CRA/webpack 4/Jest), react-smooth-scrollbar 8 + smooth-scrollbar 8, gh-pages 3 for deploy. Source is ~820 lines in `src/` (App.js, index.js, pages/{header,home}, components/{movie-list,movie-details}). No real tests exist (`App.test.js` is a failing CRA template).

## Golden rules
1. Behavior parity first. `docs/migration/BEHAVIOR-CONTRACT.md` is the spec. Quirks listed there are preserved; log fixes in `docs/migration/FOLLOW-UPS.md`.
2. One axis per phase, small commits, gate green before the next phase (see skill `migration-runbook`).
3. Never edit tests/snapshots to make them pass. Never use `--force`, `--legacy-peer-deps` (without a DECISIONS.md entry), `npm audit fix --force`, or blanket `npm update`.
4. Work only on a `migration/*` branch. Never push, deploy (`npm run deploy`), or publish: the owner does that. Deploy updates the LIVE site.
5. Do not put the TMDB API key anywhere new; never print it in full. Read-only checks for secrets: use the `security-reviewer` agent.
6. Do not touch `*.css`, `public/` assets or copy text unless a phase skill says so.
7. Verify claims about versions/peers with `npm view` or official docs; do not rely on memory.

## Commands
- Old stack (react-scripts): `npm ci`, `npm start`, `npm run build`. On Node >= 17 the old webpack needs `NODE_OPTIONS=--openssl-legacy-provider` (the gate script sets it). Node 14/16 via nvm also works.
- Gate: `node scripts/migration/gate.mjs --baseline` (phase 0 only) / `--phase N` / `--phase 6 --strict`.
- E2E (after phase 0): `npm run e2e`. Unit tests: `npm test` (CRA) -> `npx vitest run` (after phase 1).

## Phase order (details: skill `migration-runbook`)
0 Baseline & Playwright safety net -> 1 CRA->Vite(+Vitest) -> 2 React 17 -> 3 Router 6/7 -> 4 MUI (@mui) -> 5 React 18/19 + testing libs + scrollbar -> 6 cleanup/security/docs. Current phase: see `.claude/state/phase.json` (also injected at session start).

## Project-specific hazards
- `index.js` wraps App in `BrowserRouter` AND `App.js` uses `HashRouter` (nested). Keep hash URLs.
- `<Link id="home">` has no `to` (breaks in Router 6+). `NavLink` uses `activeClassName`/`extact`.
- `withStyles` + `disableTypography` in movie-details; MUI default colors changed after v4 ("Show More" is `color="secondary"`).
- CRA `%PUBLIC_URL%` in index.html, `homepage` field drives the base path; Vite needs `base: '/movie-database/'` and `outDir: 'build'`.
- JSX lives in `.js` files (App.js, index.js); Vite needs `.jsx`.
- `react-smooth-scrollbar` drives infinite scroll (`onScroll`); compatibility with newer React is unverified.
- Dev StrictMode double-runs effects; MovieList auto-clicks "Show More" 5x at 768-1024px width. Test the production build.

## Team (sub-agents in `.claude/agents/`)
baseline-engineer (P0) - dependency-auditor (read-only, every phase) - build-migrator (P1) - react-upgrader (P2, P5) - router-migrator (P3) - mui-migrator (P4) - security-reviewer (P1, P6) - regression-reviewer (independent PASS/FAIL after every phase).
Skills in `.claude/skills/`: migration-runbook, phase-gate, characterization-tests, cra-to-vite, react-upgrade, router-v5-to-v6, mui-v4-to-latest, rollback.

## Hooks (`.claude/settings.json`, scripts in `.claude/hooks/`, owner-editable only)
SessionStart prints branch/phase/gate status. PreToolUse blocks dangerous Bash (force installs, push, hard reset, deploy, broad rm) and edits to the lockfile, hooks, baseline, build output, literal API keys, or product code on main/master. PostToolUse logs edits and reminds to `npm install` after package.json edits. Stop refuses to finish with package.json/lockfile out of sync or a literal key in the diff.

## First steps for the owner
1. `git checkout -b migration/modernize` then `git tag phase-0-start`; commit this setup.
2. Ask Claude: "Run phase 0 with the baseline-engineer agent."
3. Rotate the TMDB API key at themoviedb.org when convenient (it is in git history).

## Definition of done
All BC-xx tests green on the final stack; `node scripts/migration/gate.mjs --phase 6 --strict` passes; no high/critical production vulnerabilities; README updated; `regression-reviewer` PASS; owner deploys manually and smoke-tests the live URL.

## Conventions
Commit style `phase N: <what>`; one concern per commit; record choices in `docs/migration/DECISIONS.md`.
