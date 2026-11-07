---
name: mui-v4-to-latest
description: Repo-specific mapping from Material-UI v4 (@material-ui/*) to current MUI (@mui/*) for Movie City's Dialog, Button, Typography, IconButton and Close icon, preserving the visual result.
---
# Material-UI 4 -> MUI

Confirm the target and its React peer range with `npm view @mui/material peerDependencies version`; use the official migration guide + `npx @mui/codemod` presets as a first pass, then review by hand (only two files use MUI).

Inventory (grep to confirm): `movie-details.component.jsx` (Dialog, DialogTitle, DialogContent, IconButton, Typography, CloseIcon, `withStyles`), `movie-list.component.jsx` (Button). `@material-ui/lab` is declared but unused: remove after grep.

Mapping
- `@material-ui/core/X` -> `@mui/material/X`; `@material-ui/icons/Close` -> `@mui/icons-material/Close`. Install `@emotion/react` and `@emotion/styled`.
- `withStyles(styles)(Component)` (DialogTitle wrapper, DialogContent wrapper) -> `styled()` from `@mui/material/styles` or the `sx` prop. Do not use `@mui/styles`.
  - DialogTitle: `root` (margin 0, padding spacing(2)) and `closeButton` (position absolute, right spacing(1), top spacing(1), color grey[500]) become `sx`. `disableTypography` no longer exists; the title keeps its `<Typography variant="h6">` child: use `component="div"` on DialogTitle so no nested heading/DOM change (check the dialog `aria-labelledby="customized-dialog-title"` + `id="movie-title"` stay intact for accessibility).
  - DialogContent: padding spacing(2) via `sx`; `dividers` prop stays.
- Default theme drift to neutralize with a `createTheme` in index.jsx (or a small `theme.js`):
  - `palette.secondary.main` was #f50057 in v4 (the "Show More" button uses `color="secondary"`). Newer defaults differ -> pin the old value.
  - Check primary, text colors, `typography` (button text-transform stays uppercase; font family), `shape`, Dialog paper radius/shadow against screenshots and pin differences.
- CSS order: v4 injected JSS styles last; Emotion injects first/last differently. Our own `*.style.css` files must still win where they did. Wrap the app with `StyledEngineProvider injectFirst` (or set `CacheProvider` prepend) and verify with screenshots; do not add `!important`.
- `Button` `variant="outlined"` `color="secondary"` props unchanged; `className="next-button"` selector remains.
- `Dialog onClose`, `maxWidth="md"`, `open` unchanged. Backdrop click/Esc/X closing = BC-12.
- Verify: dialog screenshots (desktop+mobile), list screenshot (button look), console free of MUI deprecation warnings.
