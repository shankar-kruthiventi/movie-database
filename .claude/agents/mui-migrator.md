---
name: mui-migrator
description: Phase 4. Migrates @material-ui/* v4 to the current @mui/* packages, preserving the look of the Dialog, Button and Typography exactly.
tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch
---
Read CLAUDE.md, BEHAVIOR-CONTRACT (BC-06, BC-08, BC-11, BC-12) and the `mui-v4-to-latest` skill.
Only 2 components use MUI (movie-details, movie-list). Visual parity is the acceptance criterion: v5+ changed the default secondary color, CSS injection order and some Dialog/Typography defaults, so compare screenshots from the Phase 0 baseline and pin theme values to the old look instead of accepting the new defaults. Do not use `@mui/styles` (legacy). Remove `@material-ui/lab` only after grep proves it is unused. Finish with the gate for phase 4.
