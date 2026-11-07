// Contrast helpers for the a11y specs (own computed-style / pixel checks; axe handles the rest).
const channel = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** "rgb(r, g, b)" / "rgba(r, g, b, a)" -> [r, g, b, a] */
const parseColor = (s) => {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) throw new Error('unsupported colour: ' + s);
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
};

/** Solid colour behind an element, from its ancestors' background colours (image: true when a background image is involved). */
async function effectiveBackground(locator, { includeSelf = false } = {}) {
  const css = await locator.evaluate((el, self) => {
    const layers = [];
    let image = false;
    for (let n = self ? el : el.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      layers.push(cs.backgroundColor);
      if (cs.backgroundImage !== 'none') image = true;
      if (/^rgb\(/.test(cs.backgroundColor)) break; // opaque (no alpha channel): nothing behind it shows
    }
    return { layers, image, scheme: getComputedStyle(document.documentElement).colorScheme };
  }, includeSelf);
  let base = css.scheme.includes('dark') && !css.scheme.includes('light') ? [18, 18, 18] : [255, 255, 255];
  for (const layer of css.layers.reverse()) {
    const [r, g, b, a] = parseColor(layer);
    base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)];
  }
  return { rgb: base, image: css.image };
}

/** Pixels of a page region as [[r,g,b], ...] (decoded in the page with a canvas). */
async function samplePixels(page, clip) {
  const png = await page.screenshot({ clip, animations: 'disabled' });
  return page.evaluate(async (b64) => {
    const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
    const bmp = await createImageBitmap(blob);
    const c = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(bmp, 0, 0);
    const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
    const out = [];
    for (let i = 0; i < d.length; i += 4) out.push([d[i], d[i + 1], d[i + 2]]);
    return out;
  }, png.toString('base64'));
}

/** Worst (lowest) contrast of a colour against every pixel of the given regions. */
async function worstAgainstRegions(page, fg, clips) {
  let worst = Infinity;
  let at = null;
  for (const clip of clips) {
    for (const px of await samplePixels(page, clip)) {
      const r = ratio(fg, px);
      if (r < worst) { worst = r; at = px; }
    }
  }
  return { worst, at };
}

module.exports = { luminance, ratio, parseColor, effectiveBackground, samplePixels, worstAgainstRegions };
