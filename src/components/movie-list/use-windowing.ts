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
/**
 * Extra px mounted beyond the viewport, as a fraction of the viewport height. Asymmetric (step 5b):
 * more on the side the user is scrolling towards, so tiles are mounted (and their posters requested)
 * well before they enter the viewport; a little on the other side for a change of direction.
 */
const OVERSCAN_AHEAD = 1.75;
const OVERSCAN_BEHIND = 0.5;
/** Hard cap on mounted tiles (BC-24 bound is 120); the visible rows are always mounted, the overscan gives way. */
const MAX_MOUNTED = 108;
/** Posters pre-warmed beyond the mounted window, as a fraction of the viewport height. */
const WARM_VIEWPORTS = 1.5;
/** A fling is assumed to travel at most this many viewports further (predicted from the velocity). */
const MAX_PREDICT_VIEWPORTS = 6;
/** The scroll counts as moving for this long after the last offset change. */
const MOVING_MS = 150;

interface WindowState {
  start: number; // first mounted tile index (always the first tile of a row)
  end: number; // one past the last mounted tile index
  cols: number; // tiles per row (>= 1)
  pitch: number; // row height in px, 0 until measured
}

/** Half-open tile index ranges whose posters should be fetched and decoded ahead of mounting. */
export type WarmRanges = ReadonlyArray<readonly [number, number]>;

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

export function useWindowing(itemCount: number, onWarm?: (ranges: WarmRanges) => void): Windowing {
  const rootRef = useRef<HTMLDivElement>(null);
  const topSpacerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<ReturnType<typeof SmoothScrollbar.get>>(undefined);
  const itemCountRef = useRef(itemCount);
  itemCountRef.current = itemCount;
  const onWarmRef = useRef(onWarm);
  onWarmRef.current = onWarm;
  const motionRef = useRef({ lastY: 0, delta: 0, movedAt: -Infinity, dir: 1, warmKey: "" });

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

  // Chooses the mounted range from the scroll offset, the viewport size and the scroll direction.
  const update = useCallback(() => {
    const scrollbar = scrollbarRef.current;
    const { cols, pitch, originY } = metricsRef.current;
    if (!scrollbar || pitch <= 0) return;
    const count = itemCountRef.current;
    const viewport = scrollbar.size.container.height;
    const y = scrollbar.offset.y;
    const rows = Math.ceil(count / cols);
    const clampRow = (row: number) => Math.min(rows, Math.max(0, row));
    const rowAt = (offset: number) => Math.floor((offset - originY) / pitch);

    // Direction and a prediction of where a fling lands. smooth-scrollbar moves `momentum * damping`
    // per frame, so the distance still to travel is about (px moved in the last frame) / damping.
    const motion = motionRef.current;
    const now = performance.now();
    const delta = y - motion.lastY;
    motion.lastY = y;
    if (Math.abs(delta) > 0.01) {
      motion.delta = delta;
      motion.movedAt = now;
      if (Math.abs(delta) > 0.5) motion.dir = delta > 0 ? 1 : -1;
    }
    const damping = scrollbar.options.damping > 0 ? scrollbar.options.damping : 0.1;
    const reach = MAX_PREDICT_VIEWPORTS * viewport;
    const remaining =
      now - motion.movedAt < MOVING_MS ? Math.min(reach, Math.max(-reach, motion.delta / damping)) : 0;
    const dir = motion.dir;

    // The rows that overlap the viewport are mandatory; the overscan shares the rest of the cap.
    const visibleFirst = clampRow(rowAt(y));
    const visibleEnd = Math.max(visibleFirst, clampRow(Math.ceil((y + viewport - originY) / pitch)));
    const maxRows = Math.max(visibleEnd - visibleFirst, Math.floor(MAX_MOUNTED / cols));
    const budget = maxRows - (visibleEnd - visibleFirst);
    const wantAhead = Math.ceil((OVERSCAN_AHEAD * viewport) / pitch);
    const wantBehind = Math.ceil((OVERSCAN_BEHIND * viewport) / pitch);
    const roomAhead = dir > 0 ? rows - visibleEnd : visibleFirst;
    const roomBehind = dir > 0 ? visibleFirst : rows - visibleEnd;
    let behind = Math.min(wantBehind, roomBehind, Math.floor(budget * 0.3));
    const ahead = Math.min(wantAhead, roomAhead, budget - behind);
    behind = Math.min(wantBehind, roomBehind, budget - ahead);
    const firstRow = dir > 0 ? visibleFirst - behind : visibleFirst - ahead;
    const endRow = dir > 0 ? visibleEnd + ahead : visibleEnd + behind;
    const next = { start: firstRow * cols, end: Math.min(count, endRow * cols), cols, pitch };
    setWin((prev) => (sameWindow(prev, next) ? prev : next));

    // Posters to warm (priority order): the rows just beyond the mounted window in the scroll
    // direction, then, for a fling, the zone it is predicted to land in.
    const warmRows = Math.ceil((WARM_VIEWPORTS * viewport) / pitch);
    const ranges: Array<readonly [number, number]> = [];
    const addRows = (fromRow: number, toRow: number) => {
      const from = clampRow(fromRow) * cols;
      const to = Math.min(count, clampRow(toRow) * cols);
      if (to > from) ranges.push([from, to]);
    };
    if (dir > 0) addRows(endRow, endRow + warmRows);
    else addRows(firstRow - warmRows, firstRow);
    if (Math.abs(remaining) > 0.75 * viewport) {
      addRows(rowAt(y + remaining - 0.25 * viewport), Math.ceil((y + remaining + 1.25 * viewport - originY) / pitch));
    }
    const key = `${count}|${ranges.map((r) => r.join("-")).join(",")}`;
    if (key !== motion.warmKey) {
      motion.warmKey = key;
      onWarmRef.current?.(ranges);
    }
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
