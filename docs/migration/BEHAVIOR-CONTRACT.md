# Behavior contract (what must not change)

Derived from reading the code on the pre-migration commit. Every ID needs a passing Playwright test (`BC-xx ...`) before Phase 1 starts. "Quirk" items are deliberate parity: keep them even though they look like bugs; list fixes in FOLLOW-UPS.md.

## Routing (src/App.js, src/index.js)
- BC-01 URLs are hash based: `#/home`, `#/popular`, `#/top_rated`, `#/now_playing`. `#/` or empty redirects to `#/home`. Live: https://shankar-kruthiventi.github.io/movie-database/#/home (bookmarks must keep working).
- BC-02 Unknown hash paths render the header only (empty content area).
- BC-03 Active nav link gets class `active` (styled in header.style.css).

## Data flow (App.js, movie-list)
- BC-04 On first load App requests `GET /3/movie/popular?language=en-US&page=1` and stores the results.
- BC-05 Clicking a header link requests page 1 of that category and REPLACES the list. Quirk: the `page` counter starts at 2 and is not reset on category change; "Show More" requests `page=<counter>` then increments, appending to the list.
- BC-06 Movie list is a poster grid (`https://image.tmdb.org/t/p/w500` + `poster_path`); click or Enter on a poster loads `GET /3/movie/{id}` and opens the details dialog.
- BC-07 If a list route has an empty list, it redirects to `/home`.
- BC-08 "Show More" button is visible when the list is non-empty and appends the next page.
- BC-09 Infinite scroll: smooth-scrollbar `onScroll` -> 600 ms debounce -> IntersectionObserver on the last poster (`id = length-1`) -> `append()`.
- BC-10 On mount of a list view at viewport width 768-1024 px the app clicks "Show More" 5 times automatically (and logs "clicked").

## Details dialog (movie-details.component.jsx)
- BC-11 Dialog (maxWidth md, divider content) shows: title (original_title) with close icon button, poster, overview, homepage link (new tab, noopener noreferrer), release date, genres, popularity, rating as `x/10`. Quirk: a value of `0` renders a literal `0` (`value && ...`); empty genres renders `0` too (`genres.length && ...`).
- BC-12 Closes via close icon, Escape and backdrop click.

## Home (home.component.jsx)
- BC-13 "About this app" ("Movie Atlas is made using React", changed in migration/movie-atlas step 1, 2026-11-07; was "Movie City") and "About me" ("Sankar Kruthiventi", was "ShankarKruthiventi") sections; four external links (LinkedIn, Github, Facebook, Instagram) open in a new tab with `rel="noopener noreferrer"`.
- BC-14 Search input (`#auto`): on every `keyup` calls `GET /3/search/movie?query=<raw value>&page=1`; the suggestion list shows at most the first 3 results (title + poster); input click toggles the list; clicking outside hides it; click or Enter on a suggestion loads details, opens the dialog and hides the list; typing scrolls `#test` into view. Quirk: results are accumulated by mutating the `movies` state array and the query is not URL-encoded.

## Header (header.component.jsx)
- BC-15 Desktop: "MOVIE ATLAS" (changed in migration/movie-atlas step 1, 2026-11-07; was "MOVIE CITY") + 4 links; clicking Popular/Top Rated/Now Playing also calls `fetchData(type)`. Mobile (CSS breakpoint): label (`#home`) shows the current section, hamburger toggles `#myLinks`, choosing an item updates the label, fetches (except Home) and hides the menu. Step 3 (migration/movie-atlas, 2026-11-07): the desktop bar gets a 5th item after Now Playing, the theme toggle (BC-19); the mobile hamburger is now a real <button class="icon"> (aria-label Menu, aria-expanded, aria-controls=myLinks) placed first in the mobile container, with the theme toggle at the right end of the bar; the `#home` label is a plain non-interactive <div> (no role, tabindex or inline cursor; it was a no-op); open/close state is React state (the menu <div id="myLinks"> still shows with display:block); choosing an item also returns focus to the hamburger. Fetch-on-click semantics are unchanged. Keyboard behavior: BC-20.
- BC-16 Responsive layout comes from the `*.style.css` files; CSS must not change during the migration. Step 3 (2026-11-07): CSS files now take their colours from custom properties (src/theme.css); the layout rules and breakpoints are unchanged (the hamburger selector is `.icon` instead of `a.icon`).

## Build & deploy
- BC-17 Built output goes to `build/` and is published with `gh-pages -d build` to the Pages path `/movie-database/`; every asset URL must resolve under that base.
- BC-18 `index.html` keeps: title "Movie Atlas" (changed in migration/movie-atlas step 1, 2026-11-07; was "React App"), favicon, apple-touch-icon, manifest, font-awesome 4.7 CDN link, inline styles/script. Every page load unregisters stale service workers (`serviceWorker.unregister()`), keep an equivalent.


## Theme and accessibility (migration/movie-atlas step 3, 2026-11-07)
- BC-19 Light/dark mode. Dark is the default and today's look (header #21252d, mint #64dcb0). A header icon button (sun in dark, moon in light; desktop: after Now Playing; mobile: right end of the bar) switches the mode; its accessible name states the action ("Switch to light mode" / "Switch to dark mode"). The choice is stored in localStorage key `movie-atlas-theme` (reads/writes are guarded: with storage blocked the app works and defaults to dark) and applied as `data-theme` on <html> by an inline script in index.html before first paint. The system prefers-color-scheme is ignored. Light: white header/cards with dark text, accent #0b7a5a; the wallpaper (collection.jpg) is the same image with a rgba(255,255,255,.8) wash. Tokens: src/theme.css. MUI theme is built per mode (src/theme.ts); v4 primary/secondary/breakpoints pins kept (dark), light uses secondary #c51162. Colours: docs/migration/ACCESSIBILITY-COLORS.md.
- BC-20 Header keyboard navigation. Tab order: Skip to main content link (visible on focus; Enter moves focus to `<main id="main-content" tabindex="-1">` without changing the hash route), Home, Popular, Top Rated, Now Playing, theme toggle, then the page. Every stop shows a >= 2px :focus-visible ring (>= 3:1). Mobile: hamburger (Enter/Space toggles; aria-expanded), theme toggle, menu links only while the menu is open (closed menu is display:none, so not tabbable); Esc closes the menu and focuses the hamburger. Poster tiles, dialog focus handling and the autocomplete are NOT part of this item (later steps).
- BC-21 Contrast: WCAG 2.2 AA (4.5:1 text, 3:1 large text, UI boundaries and focus rings) in both modes for the header, nav states, About cards and links, search heading/input/placeholder/options, poster list, Show More, details dialog and mobile menu. Regression: axe color-contrast on Home, Popular and the open dialog in both modes plus pixel measurements for pairs on the wallpaper (e2e/a11y-contrast.spec.js).

## Known pre-existing problems (not part of the migration)
- `src/App.test.js` is the CRA template test ("learn react") and fails today.
- TMDB API key is hardcoded in 4 files (App.js, home, movie-list, git history). Handled in Phase 6 with owner action (rotate key).
