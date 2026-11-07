---
name: router-v5-to-v6
description: Exact edits for moving Movie City from react-router-dom 5 to 6/7 while keeping hash URLs (#/home), redirects and nav styling identical.
---
# Router 5 -> 6 (or 7) mapping for this repo

Confirm target and peers via `npm view react-router-dom@<n> peerDependencies`. Follow the official "Upgrading from v5" guide; below is the repo-specific part.

1. `src/index.jsx`: remove the `BrowserRouter` wrapper. The app already renders `HashRouter` inside App; v6+ throws "You cannot render a <Router> inside another <Router>", and the live site only uses `/#/...` URLs. Do NOT switch to BrowserRouter (would break GitHub Pages deep links and bookmarks).
2. `App.jsx`: `Switch` -> `Routes`; `exact` removed (matching is exact by default); 
   - `<Route exact path="/"><Redirect to="/home"/></Route>` -> `<Route path="/" element={<Navigate to="/home" replace />} />`
   - `<Route path="/home" component={Home} extact/>` -> `<Route path="/home" element={<Home />} />` (the `extact` typo prop is dropped)
   - `render={() => <MovieList .../>}` -> `element={<MovieList .../>}`, keeping the `key` props.
   - No wildcard route exists today (unknown hash renders nothing under the header); do not add one (BC-02).
   - `basename='/'` on HashRouter is harmless; keep or drop, behavior is identical.
3. `movie-list.component.jsx`: `<Redirect to={{pathname:'/home'}}/>` -> `<Navigate to="/home" replace />` (BC-07). Note it renders while `movieList` is empty; check it does not loop when the first fetch is pending.
4. `header.component.jsx`:
   - `activeClassName="active"` and `extact` props are removed in v6; NavLink adds class `active` automatically and `.active` in header.style.css keeps working. Verify with the screenshot test.
   - `<Link id="home">` has NO `to` prop; v6 requires it and will throw. Replace with an element that keeps `id="home"` and the same CSS (e.g. `<a id="home">` or `<span id="home">` - check `#home` rules in header.style.css) so the mobile label looks identical.
   - `NavLink onClick` handlers still fire; `to` values unchanged.
5. Remove `Redirect`, `Switch` imports. Grep for `useHistory`, `withRouter`, `Prompt` (none today).
6. Verify with e2e: all 4 hash URLs, the `/` redirect, direct page reload on `/#/popular`, back/forward buttons.
