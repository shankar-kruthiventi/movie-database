---
name: react-upgrade
description: Version-by-version notes for upgrading react/react-dom in Movie City (16->17, 17->18, 18->19), including removed APIs, StrictMode effects, testing-library majors and the react-smooth-scrollbar risk.
---
# React upgrades (one major per commit)

Always first: `npm view react@<n> version`, `npm ls react react-dom`, and the peer ranges of react-smooth-scrollbar, @testing-library/*, MUI, react-router-dom. Cite the official upgrade guide for the version you do.

## 16 -> 17 (Phase 2)
Expected code changes: none. Check: global `window.addEventListener('mousedown')` in Home still works (events attach to root in 17); `React.StrictMode` unaffected. Bump `react`, `react-dom` together.

## 17 -> 18 (Phase 5)
- `src/index.jsx`: `ReactDOM.render(...)` -> `createRoot(document.getElementById('root')).render(...)` from `react-dom/client`. Remove the outer BrowserRouter if Phase 3 has not already.
- Automatic batching: re-check flows where several `setState` follow an async fetch (App.fetchData, Home.handleClickOpen). Opening the dialog before details arrive is existing behavior (BC-11) - keep.
- StrictMode runs effects twice in DEV only: App fetches `popular` twice and MovieList auto-clicks Show More 10x at tablet width in dev. Production is unchanged, which is why e2e runs on the production build. Do not "fix" with refs.
- Testing: `@testing-library/react` -> a major that supports 18 (needs `@testing-library/dom` peer); `render` is async-safe; `@testing-library/user-event` is unused in src today - remove or upgrade, owner decides.

## 18 -> 19 (Phase 5)
Removed/changed: `ReactDOM.render`, `findDOMNode`, string refs, legacy context, `propTypes`/`defaultProps` on function components, `act` import location. Grep src/ AND `node_modules/react-smooth-scrollbar` for them. `javascript:` URL in header (`href="javascript:void(0)"`): React warns/blocks these in newer versions; replace with `<button type="button" className="icon">` ONLY IF CSS (`.header-mobile-container a.icon`) is updated to match and the screenshot test passes; otherwise keep `<a href="#" onClick={e => {e.preventDefault(); toggleMenu();}}>` which keeps the same selector.

## react-smooth-scrollbar (risk R-04)
Used in Home and MovieList for the scrolling container; MovieList relies on its `onScroll` for infinite loading (BC-09). Steps: (1) `npm view react-smooth-scrollbar peerDependencies time` and read its source for removed APIs; (2) if it works, document it; (3) if not, write `src/components/smooth-scrollbar/` wrapper using the core `smooth-scrollbar` package (`Scrollbar.init(ref.current, options)` in `useEffect`, `scrollbar.addListener(onScroll)`, `destroy()` on cleanup) keeping the same DOM (`data-scrollbar`, `.scroll-content`) and props (`onScroll`, children) so CSS and callers do not change. (4) never drop smooth scrolling silently; the owner approves any visible change.
