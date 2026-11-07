---
name: rollback
description: How to safely undo a migration phase or a bad commit without losing work, using the phase tags. Use when a gate fails and cannot be fixed quickly.
---
# Rollback

Never use `git reset --hard` (blocked). History is kept; undo with new commits.
1. See where you are: `git log --oneline --decorate -15` and `git tag --list "phase-*"`.
2. Undo one commit: `git revert <sha>`.
3. Undo a whole phase: `git revert --no-commit phase-N-start..HEAD` then `git commit -m "revert phase N: <why>"` (revert range, then commit).
4. Reinstall to match the restored lockfile: delete `node_modules` (allowed) and `npm ci`.
5. Re-run `node scripts/migration/gate.mjs`; it must match the last good gate.
6. Write what failed and why in docs/migration/DECISIONS.md before retrying with a smaller step.
Emergency: the original code is also on `origin/main`/the starting commit tagged `phase-0-start`.
