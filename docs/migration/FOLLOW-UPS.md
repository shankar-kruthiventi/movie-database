# Follow-ups (quirks found, NOT fixed during migration)

Quirks below are preserved on purpose (behavior parity). Fix them after the migration, as separate commits.

- Search query is not URL-encoded (`x&y` is sent raw). `src/pages/home/home.component.jsx` (~line 34). Fix: `encodeURIComponent`. Pinned by BC-14.
- Hamburger anchor in `src/pages/header/header.component.jsx`: was `href="javascript:void(0)"`, changed in Phase 5 to `href="#"` + preventDefault because React 19 blocks `javascript:` URLs. Still an anchor used as a button; a real `<button>` needs a CSS change (owner decision).
- Direct loads of list URLs (`#/popular` etc.) bounce to `#/home` (BC-01, BC-07).
- "Show More" is `visibility: hidden` at every width (BC-08).
- Tablet auto-click sends five identical `page=2` requests because of a stale closure (BC-10).
- Search shows a literal `0` when the input is clicked with no options (BC-14).
- CDN stylesheets (Google Fonts, font-awesome) have no SRI/`crossorigin`; self-hosting is an owner decision.
- TMDB key is inlined in the public bundle (rotate it; a Pages Function/Worker proxy would hide it).
- Home label (`#home` in `header.component.jsx`): v5 `<Link id="home">` had no `to` (broken usage; its click re-navigated to the current location, a no-op). Phase 3 replaced it with `<a id="home">`; to keep the old look and feel it has `role="button"`, `tabIndex={0}` and an inline `cursor: pointer` (owner-approved, 2026-11-07). The click is now a no-op. Later: decide whether the label should do anything, then replace the inline style with CSS.
- Phase 3 dropped the stray `extact="true"` DOM attribute (typo for `exact`, never effective) and the redundant `activeClassName="active"` (v6 `NavLink` adds `active` itself). No visible effect.
- Remaining prod audit after Phase 3: the deploy tool in `dependencies` (critical + lodash/minimatch/brace-expansion) and two moderate `react-router` advisories (fixed only in v7.18.5+; the SSR one does not apply to this SPA).
- Phase 6 (done): deploy tool and `@testing-library/*` moved to devDependencies, deploy tool bumped by hand.
- Phase 6 audit close-out: 2 moderate remain, `react-router` and `react-router-dom` 6.x (open redirect via backslash; SSR `deserializeErrors`, not applicable to this SPA). Fixed only in v7.18.5+; Router 7 deferred by the owner. Critical/high items (deploy tool, lodash, lodash-es, minimatch, brace-expansion) are resolved.
- Phase 6: the `lodash-es` override (`^4.18.1`) can be dropped once `smooth-scrollbar` depends on a patched lodash-es.
- Phase 5 (user-event removed and `test.server.deps.inline` dropped in Phase 6): many files still `import React` (not needed with the automatic runtime). `src/components/smooth-scrollbar` still forwards the unused `plugins` option; the `Home`/`MovieList` `timer` debounce variable is re-created on every render (quirk kept, BC-09).
