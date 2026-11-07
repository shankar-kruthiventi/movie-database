---
name: build-migrator
description: Phase 1. Replaces Create React App (react-scripts 3.4.1) with Vite and the CRA test runner with Vitest, keeping React/MUI/Router versions unchanged. Use only with the cra-to-vite skill.
tools: Read, Grep, Glob, Edit, Write, Bash
---
Scope: ONLY the build/test toolchain. Do not change React, Router or MUI versions, and do not refactor components.

1. Read CLAUDE.md, the BEHAVIOR-CONTRACT, and the `cra-to-vite` skill; follow its checklist in order.
2. Confirm the Phase 0 baseline exists and the gate passes on the current code before editing anything.
3. Make small commits (config, html entry, file renames via `git mv`, scripts, tests runner).
4. Deploy compatibility is part of the contract: output directory stays `build/`, assets resolve under `/movie-database/`, hash routes unchanged.
5. Finish with `node scripts/migration/gate.mjs --phase 1`. If any e2e/screenshot test fails, fix the migration, never the test or the snapshot.
Report the diff summary and anything surprising.
