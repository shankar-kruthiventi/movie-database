---
name: phase-gate
description: Run and interpret the phase gate (tests, build, e2e behavior contract, npm audit, bundle size) and record phase completion. Use at the end of every migration phase.
---
# Phase gate

Commands (from repo root):
- Baseline, Phase 0 only, OLD stack: `node scripts/migration/gate.mjs --baseline`
- After phase N: `node scripts/migration/gate.mjs --phase N`
- Final: `node scripts/migration/gate.mjs --phase 6 --strict` (fails on any high/critical production vulnerability)

What it does: unit tests (CRA Jest or Vitest, auto-detected), production build, Playwright e2e (the behavior contract), `npm audit` (all + prod-only), bundle size. Writes `.claude/state/last-gate.json` and, on pass, advances `.claude/state/phase.json`.

Reading failures:
1. e2e failure = behavior regression. Fix the migration, never the test or snapshot.
2. build failure on the OLD stack with an OpenSSL error = Node >= 17 with webpack 4; the script sets `--openssl-legacy-provider` automatically. Other errors: record in baseline NOTES.md.
3. Unit test `App.test.js` ("learn react") fails on the baseline by design; it is stale and non-blocking until its fate is decided (DECISIONS.md).
4. Audit numbers should fall monotonically vs docs/migration/baseline/audit-baseline.json. A rise needs an explanation.
5. Bundle size: >25% growth vs baseline needs an explanation.
