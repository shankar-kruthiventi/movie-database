# Follow-ups (quirks found, NOT fixed during migration)

Quirks below are preserved on purpose (behavior parity). Fix them after the migration, as separate commits.

- Search query is not URL-encoded (`x&y` is sent raw). `src/pages/home/home.component.jsx` (~line 34). Fix: `encodeURIComponent`. Pinned by BC-14.
- `href="javascript:void(0)"` in `src/pages/header/header.component.jsx` (~line 86). Fix: a button, or `href="#"` with preventDefault. Also the cause of the CRA ESLint warnings.
- Direct loads of list URLs (`#/popular` etc.) bounce to `#/home` (BC-01, BC-07).
- "Show More" is `visibility: hidden` at every width (BC-08).
- Tablet auto-click sends five identical `page=2` requests because of a stale closure (BC-10).
- Search shows a literal `0` when the input is clicked with no options (BC-14).
- CDN stylesheets (Google Fonts, font-awesome) have no SRI/`crossorigin`; self-hosting is an owner decision.
- TMDB key is inlined in the public bundle (rotate it; a Pages Function/Worker proxy would hide it).
- Phase 6: move the deploy tool and `@testing-library/*` to devDependencies; bump the deploy tool by hand (critical advisory; the blanket audit auto-fix is banned).
