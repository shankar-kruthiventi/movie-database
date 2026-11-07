#!/usr/bin/env node
// Computes WCAG 2.x contrast ratios for every colour pair used by the app, in both modes, from the
// tokens in src/theme.css, and prints a markdown table. Usage:
//   node scripts/a11y/contrast-table.mjs            (print the tables)
//   node scripts/a11y/contrast-table.mjs --check    (exit 1 if any pair is below its minimum)
// Pairs that sit on the wallpaper photo cannot be computed from tokens; the e2e spec
// e2e/a11y-contrast.spec.js measures them from real pixels (worst case over the element box).
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../../src/theme.css', import.meta.url), 'utf8');
const block = (selectorRe) => {
  const m = css.match(selectorRe);
  const vars = {};
  for (const [, k, v] of m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[k] = v.trim();
  return vars;
};
const dark = block(/:root,\s*:root\[data-theme="dark"\]\s*\{([^}]*)\}/);
const light = { ...dark, ...block(/:root\[data-theme="light"\]\s*\{([^}]*)\}/) };

const hex = (h) => {
  const n = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const ratio = (a, b) => {
  const [l1, l2] = [lum(hex(a)), lum(hex(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// [element, foreground, background, minimum]; "#rrggbb" literals or token names.
const PAIRS = [
  ['Header title (MOVIE ATLAS)', 'title', 'header-bg', 4.5],
  ['Nav link, normal (desktop and mobile menu)', 'header-text', 'header-bg', 4.5],
  ['Nav link, hover', 'nav-hover', 'header-bg', 4.5],
  ['Nav link, active (current page)', 'nav-active', 'header-bg', 4.5],
  ['Mobile menu link, pressed', 'nav-pressed', 'header-bg', 4.5],
  ['Mobile label (current section)', 'header-text', 'header-bg', 4.5],
  ['Focus ring on header (nav links, toggle, menu links)', 'focus-ring', 'header-bg', 3],
  ['Theme toggle icon', 'header-text', 'header-bg', 3],
  ['Hamburger icon', 'on-accent', 'accent-bg', 3],
  ['Hamburger focus ring (inset)', 'on-accent', 'accent-bg', 3],
  ['Skip link text', 'on-accent', 'accent-bg', 4.5],
  ['Skip link focus ring', 'header-text', 'header-bg', 3],
  ['About card text', 'card-text', 'card-bg', 4.5],
  ['About card links', 'link', 'card-bg', 4.5],
  ['About card focus ring', 'focus-ring', 'card-bg', 3],
  ['About card border vs card fill', 'card-border', 'card-bg', 3],
  ['Search input text', 'input-text', 'input-bg', 4.5],
  ['Search input placeholder', 'input-placeholder', 'input-bg', 4.5],
  ['Search input border vs input fill', 'input-border', 'input-bg', 3],
  ['Autocomplete option text', 'option-text', 'option-bg', 4.5],
  ['Autocomplete border vs option fill', 'option-border', 'option-bg', 3],
  ['Autocomplete option focus ring', 'option-focus', 'option-bg', 3],
  ['Show More text (outlined button)', 'show-more', 'list-bg', 4.5],
  ['Show More focus ring', 'focus-ring', 'list-bg', 3],
  ['Dialog title text (white title bar)', '#212121', '#ffffff', 4.5],
  ['Dialog close icon', 'dialog-close', '#ffffff', 3],
  ['Dialog close focus ring', 'dialog-title-focus', '#ffffff', 3],
  ['Dialog body text', 'dialog-body-text', 'dialog-body-bg', 4.5],
  ['Dialog links', 'dialog-link', 'dialog-body-bg', 4.5],
  ['Dialog body focus ring', 'dialog-body-focus', 'dialog-body-bg', 3],
];

// Values that were in the app before this step, for the "before" column of fixes.
const LEGACY = [
  ['Hamburger icon was white on mint', '#ffffff', '#64dcb0', 3],
  ['Dialog close icon was grey[500] on the white title bar', '#9e9e9e', '#ffffff', 3],
  ['Mobile pressed link was #cc0016 on the dark header', '#cc0016', '#21252d', 4.5],
  ['Show More v4 pink #f50057 on the light list background', '#f50057', '#f3f5f7', 4.5],
];

const val = (vars, x) => (x.startsWith('#') ? x : vars[x]);
let failures = 0;
const rows = (vars) => PAIRS.map(([name, fg, bg, min]) => {
  const f = val(vars, fg), b = val(vars, bg), r = ratio(f, b);
  const ok = r >= min;
  if (!ok) failures++;
  return `| ${name} | \`${f}\` | \`${b}\` | ${r.toFixed(2)} | ${min} | ${ok ? 'pass' : 'FAIL'} |`;
});
const head = '| Element | Foreground | Background | Ratio | Min | Result |\n|---|---|---|---|---|---|';

console.log('### Dark mode (default)\n\n' + head + '\n' + rows(dark).join('\n'));
console.log('\n### Light mode\n\n' + head + '\n' + rows(light).join('\n'));
console.log('\n### Previous values that failed (before this step)\n\n| Pair | Foreground | Background | Ratio | Min |\n|---|---|---|---|---|\n' +
  LEGACY.map(([n, f, b, m]) => `| ${n} | \`${f}\` | \`${b}\` | ${ratio(f, b).toFixed(2)} | ${m} |`).join('\n'));
if (process.argv.includes('--check') && failures) { console.error(`\n${failures} pair(s) below minimum`); process.exit(1); }
