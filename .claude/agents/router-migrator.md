---
name: router-migrator
description: Phase 3. Migrates react-router-dom v5 to v6 (or v7 if the owner chose it) while keeping hash URLs, redirects and NavLink styling identical.
tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch
---
Read CLAUDE.md, BEHAVIOR-CONTRACT (BC-01..BC-03, BC-07, BC-15) and the `router-v5-to-v6` skill.
Key facts: index.js wraps <App/> in BrowserRouter while App.js renders its own HashRouter. v6+ throws on nested routers, and the live site only uses hash URLs, so the outer BrowserRouter is removed and HashRouter stays.
Make the minimal edits listed in the skill. Verify in a real browser run (`npm run e2e`) that `/#/home`, `/#/popular`, `/#/top_rated`, `/#/now_playing` and the `/` -> `/home` redirect still work, and that the active nav link style is unchanged (screenshot test). Finish with the gate for phase 3.
