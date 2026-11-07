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
- BC-13 "About this app" and "About me" sections; four external links (LinkedIn, Github, Facebook, Instagram) open in a new tab with `rel="noopener noreferrer"`.
- BC-14 Search input (`#auto`): on every `keyup` calls `GET /3/search/movie?query=<raw value>&page=1`; the suggestion list shows at most the first 3 results (title + poster); input click toggles the list; clicking outside hides it; click or Enter on a suggestion loads details, opens the dialog and hides the list; typing scrolls `#test` into view. Quirk: results are accumulated by mutating the `movies` state array and the query is not URL-encoded.

## Header (header.component.jsx)
- BC-15 Desktop: "MOVIE CITY" + 4 links; clicking Popular/Top Rated/Now Playing also calls `fetchData(type)`. Mobile (CSS breakpoint): label (`#home`) shows the current section, hamburger toggles `#myLinks`, choosing an item updates the label, fetches (except Home) and hides the menu.
- BC-16 Responsive layout comes from the `*.style.css` files; CSS must not change during the migration.

## Build & deploy
- BC-17 Built output goes to `build/` and is published with `gh-pages -d build` to the Pages path `/movie-database/`; every asset URL must resolve under that base.
- BC-18 `index.html` keeps: title "React App", favicon, apple-touch-icon, manifest, font-awesome 4.7 CDN link, inline styles/script. Every page load unregisters stale service workers (`serviceWorker.unregister()`), keep an equivalent.

## Known pre-existing problems (not part of the migration)
- `src/App.test.js` is the CRA template test ("learn react") and fails today.
- TMDB API key is hardcoded in 4 files (App.js, home, movie-list, git history). Handled in Phase 6 with owner action (rotate key).
