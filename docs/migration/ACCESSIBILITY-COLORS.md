# Accessibility colors (WCAG 2.2 AA)

Movie Atlas step 3 (2026-11-07). Targets: normal text 4.5:1; large text (>= 24px, or >= 18.66px bold) 3:1; UI component boundaries, graphical objects and focus indicators 3:1. Everything below is checked in **both** modes. The tables are generated from the tokens in `src/theme.css` by `node scripts/a11y/contrast-table.mjs` (`--check` exits 1 if a pair is below its minimum). Ratios use the WCAG relative-luminance formula. Most rows hold themselves to 4.5:1 even where 3:1 would do (large text, icons).

Tool choice: `@axe-core/playwright@4.14.0` (devDependency; live `npm view` 4.14.0, peer `playwright-core >= 1.0.0`) runs the `color-contrast` rule on Home, the Popular list, the open dialog and the open mobile menu in both modes (`e2e/a11y-contrast.spec.js`). Axe cannot evaluate text on the wallpaper photo, so those pairs are measured from real pixels by the same spec (own helper in `e2e/contrast-helpers.js`).

## Token pairs

### Dark mode (default)

| Element | Foreground | Background | Ratio | Min | Result |
|---|---|---|---|---|---|
| Header title (MOVIE ATLAS) | `#64dcb0` | `#21252d` | 9.07 | 4.5 | pass |
| Nav link, normal (desktop and mobile menu) | `#ffffff` | `#21252d` | 15.36 | 4.5 | pass |
| Nav link, hover | `#64dcb0` | `#21252d` | 9.07 | 4.5 | pass |
| Nav link, active (current page) | `#99e4c8` | `#21252d` | 10.45 | 4.5 | pass |
| Mobile menu link, pressed | `#99e4c8` | `#21252d` | 10.45 | 4.5 | pass |
| Mobile label (current section) | `#ffffff` | `#21252d` | 15.36 | 4.5 | pass |
| Focus ring on header (nav links, toggle, menu links) | `#64dcb0` | `#21252d` | 9.07 | 3 | pass |
| Theme toggle icon | `#ffffff` | `#21252d` | 15.36 | 3 | pass |
| Hamburger icon | `#21252d` | `#64dcb0` | 9.07 | 3 | pass |
| Hamburger focus ring (inset) | `#21252d` | `#64dcb0` | 9.07 | 3 | pass |
| Skip link text | `#21252d` | `#64dcb0` | 9.07 | 4.5 | pass |
| Skip link focus ring | `#ffffff` | `#21252d` | 15.36 | 3 | pass |
| About card text | `#ffffff` | `#000000` | 21.00 | 4.5 | pass |
| About card links | `#ffffff` | `#000000` | 21.00 | 4.5 | pass |
| About card focus ring | `#64dcb0` | `#000000` | 12.41 | 3 | pass |
| About card border vs card fill | `#ffffff` | `#000000` | 21.00 | 3 | pass |
| Search input text | `#000000` | `#ffffff` | 21.00 | 4.5 | pass |
| Search input placeholder | `#757575` | `#ffffff` | 4.61 | 4.5 | pass |
| Search input border vs input fill | `#800080` | `#ffffff` | 9.42 | 3 | pass |
| Autocomplete option text | `#000000` | `#f5f5f5` | 19.26 | 4.5 | pass |
| Autocomplete border vs option fill | `#8a6a00` | `#f5f5f5` | 4.65 | 3 | pass |
| Autocomplete option focus ring | `#0b7a5a` | `#f5f5f5` | 4.88 | 3 | pass |
| Autocomplete active option text | `#000000` | `#dcefe7` | 17.54 | 4.5 | pass |
| Autocomplete active option ring (inset) vs active fill | `#0b7a5a` | `#dcefe7` | 4.45 | 3 | pass |
| Autocomplete active option ring (inset) vs option fill | `#0b7a5a` | `#f5f5f5` | 4.88 | 3 | pass |
| Show More text (outlined button) | `#f50057` | `#000000` | 5.02 | 4.5 | pass |
| Show More focus ring | `#64dcb0` | `#000000` | 12.41 | 3 | pass |
| Dialog title text (white title bar) | `#212121` | `#ffffff` | 16.10 | 4.5 | pass |
| Dialog close icon | `#616161` | `#ffffff` | 6.19 | 3 | pass |
| Dialog close focus ring | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| Dialog body text | `#ffffff` | `#2d2626` | 14.82 | 4.5 | pass |
| Dialog links | `#ffffff` | `#2d2626` | 14.82 | 4.5 | pass |
| Dialog body focus ring | `#64dcb0` | `#2d2626` | 8.76 | 3 | pass |

### Light mode

| Element | Foreground | Background | Ratio | Min | Result |
|---|---|---|---|---|---|
| Header title (MOVIE ATLAS) | `#0b7a5a` | `#ffffff` | 5.32 | 4.5 | pass |
| Nav link, normal (desktop and mobile menu) | `#1a1f26` | `#ffffff` | 16.56 | 4.5 | pass |
| Nav link, hover | `#0b7a5a` | `#ffffff` | 5.32 | 4.5 | pass |
| Nav link, active (current page) | `#0b7a5a` | `#ffffff` | 5.32 | 4.5 | pass |
| Mobile menu link, pressed | `#0b7a5a` | `#ffffff` | 5.32 | 4.5 | pass |
| Mobile label (current section) | `#1a1f26` | `#ffffff` | 16.56 | 4.5 | pass |
| Focus ring on header (nav links, toggle, menu links) | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| Theme toggle icon | `#1a1f26` | `#ffffff` | 16.56 | 3 | pass |
| Hamburger icon | `#ffffff` | `#0b7a5a` | 5.32 | 3 | pass |
| Hamburger focus ring (inset) | `#ffffff` | `#0b7a5a` | 5.32 | 3 | pass |
| Skip link text | `#ffffff` | `#0b7a5a` | 5.32 | 4.5 | pass |
| Skip link focus ring | `#1a1f26` | `#ffffff` | 16.56 | 3 | pass |
| About card text | `#1a1f26` | `#ffffff` | 16.56 | 4.5 | pass |
| About card links | `#0b7a5a` | `#ffffff` | 5.32 | 4.5 | pass |
| About card focus ring | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| About card border vs card fill | `#1a1f26` | `#ffffff` | 16.56 | 3 | pass |
| Search input text | `#1a1f26` | `#ffffff` | 16.56 | 4.5 | pass |
| Search input placeholder | `#5c6670` | `#ffffff` | 5.85 | 4.5 | pass |
| Search input border vs input fill | `#5f6b76` | `#ffffff` | 5.45 | 3 | pass |
| Autocomplete option text | `#1a1f26` | `#ffffff` | 16.56 | 4.5 | pass |
| Autocomplete border vs option fill | `#5f6b76` | `#ffffff` | 5.45 | 3 | pass |
| Autocomplete option focus ring | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| Autocomplete active option text | `#1a1f26` | `#dcefe7` | 13.84 | 4.5 | pass |
| Autocomplete active option ring (inset) vs active fill | `#0b7a5a` | `#dcefe7` | 4.45 | 3 | pass |
| Autocomplete active option ring (inset) vs option fill | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| Show More text (outlined button) | `#c51162` | `#f3f5f7` | 5.29 | 4.5 | pass |
| Show More focus ring | `#0b7a5a` | `#f3f5f7` | 4.87 | 3 | pass |
| Dialog title text (white title bar) | `#212121` | `#ffffff` | 16.10 | 4.5 | pass |
| Dialog close icon | `#4a5560` | `#ffffff` | 7.61 | 3 | pass |
| Dialog close focus ring | `#0b7a5a` | `#ffffff` | 5.32 | 3 | pass |
| Dialog body text | `#1a1f26` | `#f6f8fa` | 15.56 | 4.5 | pass |
| Dialog links | `#0b7a5a` | `#f6f8fa` | 5.00 | 4.5 | pass |
| Dialog body focus ring | `#0b7a5a` | `#f6f8fa` | 5.00 | 3 | pass |

### Previous values that failed (before this step)

| Pair | Foreground | Background | Ratio | Min |
|---|---|---|---|---|
| Hamburger icon was white on mint | `#ffffff` | `#64dcb0` | 1.69 | 3 |
| Dialog close icon was grey[500] on the white title bar | `#9e9e9e` | `#ffffff` | 2.68 | 3 |
| Mobile pressed link was #cc0016 on the dark header | `#cc0016` | `#21252d` | 2.62 | 4.5 |
| Show More v4 pink #f50057 on the light list background | `#f50057` | `#f3f5f7` | 3.83 | 4.5 |

## Pairs on the wallpaper (measured, worst pixel of the element's surroundings)

The wallpaper is the same photo in both modes; light mode adds a white wash over it: since 2026-11-08 a gradient `linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.8) 35%)` (lighter at the top, flat 0.8 from 35% of the layer down). Values come from `e2e/a11y-contrast.spec.js` (it fails below 3:1).

| Pair | Dark | Light | Min |
|---|---|---|---|
| "Search for movies here" heading vs wallpaper behind the glyph box (large text) | 4.04 | 4.99 (heading token `#075c43`) | 3 |
| About card border vs wallpaper just outside the card | 6.78 | 3.20 (worst of five poses; static 3.65; border `#1a1f26`) | 3 |
| Search input boundary: border vs outside wallpaper / fill vs outside wallpaper (best of the two counts) | 1.00 / 6.91 | 3.40 / 1.35 | 3 |
| Search input focus ring vs wallpaper just outside the input | 4.26 | 3.31 | 3 |
| Placeholder `#757575` / `#5c6670` on the input fill | 4.61 | 5.85 | 4.5 |

Step 4b: the wallpaper now pans (BC-23), so the spec measures the static photo and the four extreme poses (zoom 1.3, shift +-10%) and asserts >= 3:1 for each. Worst case over the five poses: dark heading 3.95 (static 4.08; was 4.04 before the pan), dark card border 6.82, dark input ring 4.10 (static 4.33); light values did not change (heading 4.99, card border 3.40, input ring 3.31) because the 0.8 wash flattens the photo. The wash is unchanged, so no token changed. `--page-bg` (#121212 / #ffffff) is the solid colour behind the layer (axe reads it; the pixel test covers the photo).

Light mode has the thinnest margins here (card border 3.20, input ring 3.31). If the wash is ever made more transparent, re-run the spec; raising `--card-border` / `--focus-ring` darkness is the lever.

## Pairs that needed adjusting

| Where | Before | After |
|---|---|---|
| Mobile hamburger icon (both modes) | white on mint `#64dcb0`, 1.69:1 | dark `#21252d` on mint 9.07:1 (dark mode); white on `#0b7a5a` 5.32:1 (light) |
| Details dialog close icon (title bar is white in both modes) | MUI `grey[500]` `#9e9e9e`, 2.68:1 | `#616161` 6.19:1 (dark mode), `#4a5560` 7.61:1 (light) |
| Mobile menu link, pressed state | `#cc0016` on `#21252d`, 2.62:1 | nav-pressed token: `#99e4c8` 10.45:1 (dark), `#0b7a5a` 5.32:1 (light) |
| Autocomplete border, dark mode | goldenrod `#daa520` on `#f5f5f5`, 2.05:1 | `#8a6a00` 4.65:1 |
| Focus ring on light surfaces inside dark mode (autocomplete options, dialog title bar) | mint `#64dcb0` would be 1.55:1 / 1.69:1 | dedicated tokens `--option-focus`, `--dialog-title-focus` = `#0b7a5a` (4.88 / 5.32) |
| Show More text in light mode | v4 pink `#f50057` on `#f3f5f7`, 3.83:1 | light-mode secondary `#c51162`, 5.29:1 (dark mode keeps `#f50057`, 5.02:1 on black) |
| Light-mode heading | accent `#0b7a5a` was 3.31:1 on the worst wallpaper pixel | `#075c43`, 4.99:1 |

Unchanged in dark mode (already passing): header, nav (normal/hover/active), About cards and links, search input and placeholder, dialog text and links.

## Notes and known limits

- `Show More` is `visibility: hidden` in the current CSS (`.next-button`), so it is never visible or focusable today. Its colors are compliant anyway, in case it is revealed later.
- The active nav link differs from the others by color only (as before). Contrast is fine, but WCAG 1.4.1 (use of color) would prefer a second cue such as an underline: see FOLLOW-UPS.md.
- Hover states keep the 1.2em size bump from before; hover colors pass.
- Focus rings: `:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px }` globally; inset (-4px) rings on the mobile hamburger, theme toggle and menu links because the bar clips (`overflow: hidden`); the skip link uses a 3px ring.
- MUI Button/Typography/Dialog colors follow `src/theme.ts` (per mode). In dark mode the dialog chrome keeps today's white title bar (owner decision: dark = current look), which is why the close icon token is evaluated on `#ffffff` in both modes.


Step 4 (2026-11-07): the open autocomplete marks the active option (aria-activedescendant) with the new token `--option-active-bg` (`#dcefe7` in both modes) and a 2px inset `--option-focus` ring; rows added to the tables above.

## Step 5 (2026-11-08): poster placeholder
`--poster-placeholder` (dark #1c2128, light #e1e5ea) is the background of `.poster` behind the opaque poster image; it is visible only while an image has not loaded (or is missing). It carries no text and is not a UI boundary, so no contrast requirement applies; the list background pairs (BC-21) are unchanged.

## 2026-11-08: lighter light-mode wash (owner design change)

The owner changed the light wash from a flat 0.8 white to `linear-gradient(rgba(255,255,255,0.1), rgba(255,255,255,0.8))`. Measured with the unchanged spec thresholds, that failed in all five wallpaper poses: heading 1.35-2.26 (>= 3 needed), card border 1.00 (the border `#5f6b76` matches mid-grey photo pixels), input boundary 1.09-2.01, input ring 1.06-1.73. Before (flat 0.8, worst of 5 poses): heading 4.99, card border 3.40, input border 3.40, input ring 3.31.

Minimum change that keeps a lighter top: the wash is now `linear-gradient(rgba(255,255,255,0.2), rgba(255,255,255,0.8) 35%)` (top stop 0.1 -> 0.2, 0.8 reached at 35% instead of 100%) and light `--card-border` `#5f6b76` -> `#1a1f26`. Sweep results: with the owner's 0.1 top and a 35-40% stop the card border still failed (2.59 static at 40%) because the cards sit at 15-49% of the viewport; 0.2 / 35% is the lowest top stop that passes. Result, worst of five poses: heading 4.99, card border 3.20 (static 3.65), input border 3.40, input ring 3.31, placeholder 5.85. Heading, input border and ring are unchanged from the flat wash because they sit in the flat 0.8 zone. Thresholds untouched.
