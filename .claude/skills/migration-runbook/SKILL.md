---
name: migration-runbook
description: Master plan for modernizing Movie City (CRA 3.4.1, React 16, Router 5, MUI 4) without changing behavior. Use at the start of any session, when choosing the next step, or when asked "what's next".
---
# Migration runbook

One axis changes per phase. After every phase: gate passes -> `regression-reviewer` says PASS -> commit -> tag `phase-N-done`. Never start phase N+1 on a red gate.

| # | Phase | Agent | Key risk |
|---|-------|-------|----------|
| 0 | Baseline & safety net | baseline-engineer | Old app may not build on modern Node; tests must be written against the OLD app |
| 1 | CRA -> Vite (+ Vitest), versions of React/MUI/Router unchanged | build-migrator | GitHub Pages base path `/movie-database/`, output dir `build/`, `.js` files with JSX |
| 2 | React 16 -> 17 | react-upgrader | Few code changes; verify peer ranges |
| 3 | react-router-dom 5 -> 6/7 | router-migrator | Nested BrowserRouter+HashRouter; `<Link>` without `to`; NavLink props |
| 4 | @material-ui/* 4 -> @mui/* | mui-migrator | Default secondary color, style injection order, `withStyles`, `disableTypography` |
| 5 | React 17 -> 18 -> 19, RTL/jest-dom majors, scrollbar | react-upgrader | react-smooth-scrollbar compatibility, StrictMode, removed APIs |
| 6 | Cleanup, security close-out, docs | security-reviewer + regression-reviewer | Strict audit, README refresh, manual deploy |

Why this order (verify each claim with `npm view` when you reach it): MUI v4 declares peers for React 16/17 only, and MUI v5+ needs React 17+, so React goes to 17 first, then Router, then MUI, and only then to 18/19. Build tool goes first because it removes most dev-only vulnerabilities (webpack 4 era tooling) and it has no runtime behavior change.

## Per-phase loop
1. `dependency-auditor`: confirm targets, peers, breaking changes (live data).
2. `git tag phase-N-start`; implement with the phase agent in small commits (`phase N: <what>`).
3. `node scripts/migration/gate.mjs --phase N` (see phase-gate skill).
4. `regression-reviewer` independent check.
5. Update docs/migration/DECISIONS.md (what/why) and FOLLOW-UPS.md (quirks noticed but NOT fixed).
6. `git tag phase-N-done`.

## Rules
- Behavior parity beats cleanliness. Existing quirks stay (see BEHAVIOR-CONTRACT "Known quirks") and are listed in FOLLOW-UPS.md for after the migration.
- Never edit a test or snapshot to make it pass. If a test is wrong, ask the owner.
- Owner-only actions: pushing, deploying, rotating the TMDB key, merging.
