# Follow-ups (quirks found, NOT fixed during migration)

Quirks below are preserved on purpose (behavior parity). Fix them after the migration, as separate commits.

- Search query is not URL-encoded (`x&y` is sent raw). `src/pages/home/home.component.jsx` (~line 34). Fix: `encodeURIComponent`. Pinned by BC-14.
- Hamburger anchor in `src/pages/header/header.component.jsx`: was `href="javascript:void(0)"`, changed in Phase 5 to `href="#"` + preventDefault because React 19 blocks `javascript:` URLs. Still an anchor used as a button; a real `<button>` needs a CSS change (owner decision).
- Direct loads of list URLs (`#/popular` etc.) bounce to `#/home` (BC-01, BC-07).
- "Show More" is `visibility: hidden` at every width (BC-08).
- Tablet auto-click sends five identical `page=2` requests because of a stale closure (BC-10).
- Search showed a literal `0` when the input was clicked with no options (BC-14): fixed in Step 4 (2026-11-07).
- CDN stylesheets (Google Fonts, font-awesome) have no SRI/`crossorigin`; self-hosting is an owner decision.
- TMDB key is inlined in the public bundle (rotate it; a Pages Function/Worker proxy would hide it).
- Home label (`#home` in `header.component.jsx`): v5 `<Link id="home">` had no `to` (broken usage; its click re-navigated to the current location, a no-op). Phase 3 replaced it with `<a id="home">`; to keep the old look and feel it has `role="button"`, `tabIndex={0}` and an inline `cursor: pointer` (owner-approved, 2026-11-07). The click is now a no-op. Later: decide whether the label should do anything, then replace the inline style with CSS.
- Phase 3 dropped the stray `extact="true"` DOM attribute (typo for `exact`, never effective) and the redundant `activeClassName="active"` (v6 `NavLink` adds `active` itself). No visible effect.
- Remaining prod audit after Phase 3: the deploy tool in `dependencies` (critical + lodash/minimatch/brace-expansion) and two moderate `react-router` advisories (fixed only in v7.18.5+; the SSR one does not apply to this SPA).
- Phase 6 (done): deploy tool and `@testing-library/*` moved to devDependencies, deploy tool bumped by hand.
- Phase 6 audit close-out: 2 moderate remain, `react-router` and `react-router-dom` 6.x (open redirect via backslash; SSR `deserializeErrors`, not applicable to this SPA). Fixed only in v7.18.5+; Router 7 deferred by the owner. Critical/high items (deploy tool, lodash, lodash-es, minimatch, brace-expansion) are resolved.
- Phase 6: the `lodash-es` override (`^4.18.1`) can be dropped once `smooth-scrollbar` depends on a patched lodash-es.
- Phase 5 (user-event removed and `test.server.deps.inline` dropped in Phase 6): many files still `import React` (not needed with the automatic runtime). `src/components/smooth-scrollbar` still forwards the unused `plugins` option; the `Home`/`MovieList` `timer` debounce variable is re-created on every render (quirk kept, BC-09).

- TypeScript step (Movie Atlas step 2): `MovieDetails` reads `details.original_title` for the poster `alt`, but the details state never sets it (`title` holds `original_title`), so the `alt` attribute is always missing. Preserved as is (`original_title?: string` is declared on `MovieDetailsData` with a comment). Fix: use `details.title` (a11y improvement; changes DOM).
- TypeScript step: `poster_path` can be `null` in TMDB data and is concatenated into the URL (`.../w500null`), as before; the types say `string | null` and the template literal keeps the same output. Fix: render a placeholder.
- TypeScript step: `npm run typecheck` is not part of `scripts/migration/gate.mjs` (protected gate); run it by hand.
- Step 3 (theme/a11y): the dark-mode dialog keeps today's white title bar over the dark body (pinned in `src/theme.ts`). A truly dark dialog is a one-place change (delete the dark pins) plus dialog tokens; owner call.
- Step 3: the active nav link is distinguished by colour only (WCAG 1.4.1, level A). Contrast passes; an underline or marker for the current page would be a second cue. Not done: it changes the dark look.
- Step 3: `Show More` (`.next-button`) is `visibility: hidden` in the CSS, so it is never visible or focusable; its colours are compliant in case it is revealed.
- Step 3: the `#home` mobile label is a non-interactive no-op label (the earlier fake button semantics were removed). If it should ever act (e.g. open the menu), make it a real button then.
- Step 3: the empty strip below short pages on mobile (white before, #121212 in dark mode now) comes from the page being shorter than the viewport; belongs to the responsiveness step.
- Step 3: poster tiles are still not keyboard focusable; dialog focus work and the autocomplete combobox semantics are later steps (the `.autoContainer` colours and focus ring are already tokenised for them).
- Step 3: in light mode the header edge is a 1px box-shadow (#5f6b76); desktop header spacing shifted slightly because the toggle is a 5th space-around item.
- Step 3: light-mode contrast margins on the wallpaper are the thinnest (card border 3.40:1, input focus ring 3.31:1 against the worst pixel); re-run `e2e/a11y-contrast.spec.js` if the wash opacity (0.8) changes.
- Step 4 stale suggestions on a zero-result search: resolved in Step 4b (2026-11-07, owner decision: clear the options; see DECISIONS.md).
- Step 4: the search still fires on every keyup including arrow, Esc, Tab and Enter keys (BC-14), so navigating the list triggers extra API calls; a debounce plus "only when the value changed" would fix it together with the encoding bug.
- Step 4: only the first 3 results are offered (BC-14); screen reader users hear "3 results available" even when TMDB returned 20.
- Step 4: Home/End inside the list are not wired (APG optional).
- Step 5: the next page still needs a scroll event (600 ms debounce, BC-09): on a very tall viewport where one page does not fill the screen the user has to scroll or press nothing (Show More is hidden); a sentinel-only trigger would fix that but changes the request sequence on load (owner decision).
- Step 5: `.poster` count in the DOM is the mounted window; use `.movieList-container[data-total]` for the list length in tests.
- Step 5: when a resize changes the tiles per row, the scroll position is not re-anchored to the first visible tile.
- Step 5: heap numbers from CDP only cover the JS heap; decoded-image memory is not measured by the e2e suite (real-device check recommended after deploy: scroll 25 pages on a phone).
- Step 5: `poster_path: null` still renders `.../w500null` (broken image on the placeholder colour); a dedicated empty-poster tile is a design call.
- Step 6 (icons): optional `<link rel="icon" type="image/svg+xml">` with a crisp SVG favicon is not added (the BC-18 test selects `link[rel="icon"]` and a second one would break it; adding it means a test update and putting the SVG in `public/`). Masters live in `docs/migration/assets/`.
- Step 6: `manifest.json` `theme_color` (`#000000`) and `background_color` (`#ffffff`) unchanged; `#21252d` would match the icon and header. The manifest ico entry lists sizes `64x64 32x32 24x24 16x16` while the new ico has 16/32/48. Owner call.
- Step 6: icons are `purpose: any` and have transparent rounded corners; if a maskable icon is ever wanted, use an opaque full-bleed square variant (artwork already sits within the central 80%). A dedicated 180x180 apple-touch-icon (the current one is the 192 px PNG, with transparent corners that iOS fills black) is optional.
- Step 6: browser tabs cache favicons hard; check the real tab, the iOS home-screen icon and a PWA install on devices after deploy (hard reload / clear site data if the old icon shows).

- Step 6b (2026-11-08): resolved from the Step 6 items: SVG favicon added (`public/favicon.svg`), `theme_color` set to `#21252d`, dedicated opaque 180x180 apple-touch-icon added. Still open: `<meta name="theme-color" content="#000000">` in index.html differs from the manifest (`#21252d`); the manifest ico entry still says `64x64 32x32 24x24 16x16` (ico has 16/32/48); the manifest has no maskable icon; real-browser check of favicon choice (Chrome/Firefox svg, Safari ico), iOS home-screen icon and PWA install after deploy.

- Step 7: bookmarked `#/top_rated` / `#/now_playing` still end on `#/home` when opened fresh (BC-07 quirk, empty list at mount), not on the list; fixing BC-07 would make the redirect land on the list. Owner call.
- Step 7: in-app hash edit to a list URL shows whatever list is loaded (no fetch), pre-existing quirk.
- Step 7: the legacy redirects can be removed once old bookmarks are no longer a concern (delete `legacyPath` in `src/routes.ts`).

- Step 8 (owner copy edit, 2026-11-08): the first About sentence ends "...empowers users to" and then a list follows, so it reads oddly on its own (the lead-ins are not verbs in the infinitive: "Discover Favorites:" etc.). Copy is the owner's, left as written.
- Step 8: "Facebook | Instagram" share one list item (owner choice); each link is still its own tab stop, the "|" is aria-hidden. A list item per link would be cleaner semantics.
- Step 8: `ul.about-me-list li { line-height: 40px; }` makes the About me rows airy and, at mobile widths where the card font is 2.5vw (about 8-10px), the gaps look large relative to the small text. Pre-existing: the card font size is vw-based and tiny at 320-390 px.
- Step 8: `ul.about-me-list` has no theme-token colours of its own (inherits card text), so nothing to track for dark/light.

- Step 5b (2026-11-08, prefetch): RECOMMENDED: test on a real phone (iOS Safari and Android Chrome) before deploy: scroll 25+ pages on a throttled connection; check blank tiles during a fling, decoded-image memory (the preloader holds up to 36 decoded posters plus up to 108 mounted tiles) and the touch fling path (the landing-zone prediction assumes smooth-scrollbar momentum with `damping`; only mouse wheel events were exercised).
- Step 5b: a fling faster than the network still shows placeholder tiles while it is in flight and may reach the end of the loaded pages (DECISIONS Step 5b limits). Ideas: adapt the margin / pages in flight to the measured latency, preload along the fling path from the first wheel event, `fetchpriority` for the visible rows.
- RESOLVED (Step 5c, owner decision): the BC-05 page counter is reset when the category changes (BC-32, DECISIONS Step 5c).
- Step 5b: the legacy `append` and the hidden Show More button still use a stale closure and are coordinated with the prefetch pipeline only through the shared counter; the BC-10 tablet quirk (five identical `page=2` requests) is preserved on purpose. Removing both would simplify App.
- Step 5b/5c: TMDB's 500-page cap in `use-page-pipeline.ts`: the official API reference (developer.themoviedb.org) does NOT document a maximum `page` (only int32, default 1); TMDB staff state on the support forum (themoviedb.org/talk/66f6d91fb9fd27627950d0b4) that pages stop at 500 ("Invalid page" at 501). Not verified with a live call (no real calls with the key). The pipeline also stops at the response's `total_pages` and an empty page, so a wrong cap only matters beyond 500.
- Step 5b: the first screen is no longer pixel-identical to the pre-prefetch screenshots (full third row, shorter scrollbar thumb); the visual specs pin a single-page list (`apiTotalPages: 1`) to keep their baselines. The owner may want a baseline with a prefetched list.
- Step 5b: merge commit 9517db2 breaks `src/pages/home/home.style.css` (unclosed block, `vite build` fails); see the DECISIONS Step 5b environment note.
- Step 5b: WebKit projects were not extended to scroll-prefetch.spec.js (timing sensitive).
