import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import SmoothScrollbar from "smooth-scrollbar";

// Windowing for the poster grid (Movie Atlas step 5).
//
// Only the tiles near the viewport are mounted. Two fixed-height spacers stand in for the rows that
// are not mounted, so the grid keeps exactly the height (and every tile exactly the position) it has
// when all tiles are rendered. The tile size is set by CSS (vw / vh units), so the hook measures one
// real tile instead of assuming numbers: `cols` (tiles per row) and `pitch` (row height in px).
// The scroll offset and the viewport height are read from the smooth-scrollbar instance that wraps
// the list (offset.y, size.container.height), because the page itself never scrolls natively.

/** Mounted tiles before the first measurement (the first layout effect corrects it before paint). */
const INITIAL_TILES = 40;
/** Extra px mounted above and below the viewport, as a fraction of the viewport height. */
const OVERSCAN_VIEWPORTS = 0.75;

interface WindowState {
  start: number; // first mounted tile index (always the first tile of a row)
  end: number; // one past the last mounted tile index
  cols: number; // tiles per row (>= 1)
  pitch: number; // row height in px, 0 until measured
}

export interface Windowing {
  /** Attach to the element that wraps the grid (inside the scrollbar). */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Attach to the first spacer, it marks where the first row starts. */
  topSpacerRef: RefObject<HTMLDivElement | null>;
  /** Index of the first tile to render. */
  start: number;
  /** One past the index of the last tile to render. */
  end: number;
  /** Height in px of the spacer above the mounted tiles. */
  topSpacer: number;
  /** Height in px of the spacer below the mounted tiles. */
  bottomSpacer: number;
}

const sameWindow = (a: WindowState, b: WindowState) =>
  a.start === b.start && a.end === b.end && a.cols === b.cols && a.pitch === b.pitch;

const px = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export function useWindowing(itemCount: number): Windowing {
  const rootRef = useRef<HTMLDivElement>(null);
  const topSpacerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<ReturnType<typeof SmoothScrollbar.get>>(undefined);
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;

  const [win, setWin] = useState<WindowState>({ start: 0, end: INITIAL_TILES, cols: 1, pitch: 0 });
  const metricsRef = useRef({ cols: 1, pitch: 0, originY: 0 });

  // Reads cols / pitch / originY from the DOM (one real tile and the first spacer).
  const measure = useCallback(() => {
    const root = rootRef.current;
    const spacer = topSpacerRef.current;
    const scrollbar = scrollbarRef.current;
    if (!root || !spacer || !scrollbar) return false;
    const grid = spacer.parentElement;
    const tile = grid?.querySelector<HTMLElement>(".poster-container");
    if (!grid || !tile) return false;
    const tileRect = tile.getBoundingClientRect();
    if (tileRect.width <= 0 || tileRect.height <= 0) return false;
    const style = getComputedStyle(grid);
    const inner = grid.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
    metricsRef.current = {
      cols: Math.max(1, Math.floor((inner + 0.5) / tileRect.width)),
      pitch: tileRect.height,
      // Both rects move together while the scrollbar translates its content.
      originY: spacer.getBoundingClientRect().top - scrollbar.contentEl.getBoundingClientRect().top,
    };
    return true;
  }, []);

  // Chooses the mounted range from the scroll offset and the viewport size.
  const update = useCallback(() => {
    const scrollbar = scrollbarRef.current;
    const { cols, pitch, originY } = metricsRef.current;
    if (!scrollbar || pitch <= 0) return;
    const count = itemCountRef.current;
    const viewport = scrollbar.size.container.height;
    const overscan = viewport * OVERSCAN_VIEWPORTS;
    const rows = Math.ceil(count / cols);
    const firstRow = Math.min(rows, Math.max(0, Math.floor((scrollbar.offset.y - overscan - originY) / pitch)));
    const lastRow = Math.min(rows, Math.max(firstRow, Math.ceil((scrollbar.offset.y + viewport + overscan - originY) / pitch)));
    const next = { start: firstRow * cols, end: Math.min(count, lastRow * cols), cols, pitch };
    setWin((prev) => (sameWindow(prev, next) ? prev : next));
  }, []);

  // Binds to the scrollbar (created by the Scrollbar wrapper, an ancestor of the grid).
  useLayoutEffect(() => {
    const root = rootRef.current;
    const container = root?.closest<HTMLElement>("[data-scrollbar]");
    const scrollbar = container ? SmoothScrollbar.get(container) : undefined;
    if (!scrollbar) return;
    scrollbarRef.current = scrollbar;
    if (measure()) update();
    scrollbar.addListener(update);
    const onResize = () => {
      if (measure()) update();
    };
    window.addEventListener("resize", onResize);
    return () => {
      scrollbar.removeListener(update);
      window.removeEventListener("resize", onResize);
      scrollbarRef.current = undefined;
    };
  }, [measure, update]);

  // The list grew or shrank: keep the metrics current and re-pick the range before paint.
  useLayoutEffect(() => {
    if (!scrollbarRef.current) return;
    if (measure()) update();
  }, [itemCount, measure, update]);

  const { start, end, cols, pitch } = win;
  const shownEnd = Math.min(end, itemCount);
  const shownStart = Math.min(start, shownEnd);
  const bottomRows = pitch > 0 ? Math.ceil((itemCount - shownEnd) / cols) : 0;
  return {
    rootRef,
    topSpacerRef,
    start: shownStart,
    end: shownEnd,
    topSpacer: pitch > 0 ? (shownStart / cols) * pitch : 0,
    bottomSpacer: bottomRows * pitch,
  };
}
