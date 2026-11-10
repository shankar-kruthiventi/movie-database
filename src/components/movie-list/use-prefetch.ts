import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AppendResult } from "../../types/tmdb";
import { backoffDelay, canRearm, isStalled, MAX_CONSECUTIVE_FAILURES } from "./prefetch-policy";

const MAX_FAILURES_AFTER_REARM = MAX_CONSECUTIVE_FAILURES - 1;

// Next-page prefetch for the poster list (Movie Atlas step 5b, owner decision 2026-11-08: the user
// must never see empty or loading tiles at the bottom). Supersedes the BC-09 trigger (scroll, 600 ms
// debounce, no margin).
//
// A zero-height sentinel sits below the grid. An IntersectionObserver rooted on the scrollbar
// viewport with a bottom margin of PREFETCH_VIEWPORTS viewport heights wakes the loader as soon as
// the sentinel gets that close; the same check also runs when a page arrives and on every scroll
// frame. The loader asks for the next page right away (no debounce) under these rules:
//   - at most MAX_IN_FLIGHT requests at once (the pipeline commits pages in order, see
//     use-page-pipeline.ts), so the supply is not limited to one page per network round trip;
//   - when a page arrives and the sentinel is still inside the margin (tall screens, zoomed out) the
//     next one is requested, at most MAX_BURST pages in a row without a scroll in between;
//   - an error (network, HTTP error body) pauses all requests for an exponential backoff (1 s, 2 s,
//     ... 15 s), then the failed page is requested again; after MAX_CONSECUTIVE_FAILURES failures in a row the
//     automatic retries stop and `stalled` is true (see prefetch-policy.ts: a scroll after the cool-down, a new
//     list, or a success re-arms it);
//   - "end" (no pages left) stops requests for this list; a shorter list (reloaded) re-arms it.

/** The sentinel counts as near when it is within this many viewport heights below the viewport. */
export const PREFETCH_VIEWPORTS = 3;
/** Requests in flight at once. */
export const MAX_IN_FLIGHT = 2;
/** Pages requested in a row without any scroll between them. */
export const MAX_BURST = 8;

interface PrefetchOptions {
  /** Current list length. */
  length: number;
  /** Requests the next page (ordered pipeline); resolves with how it went. */
  loadMore: () => Promise<AppendResult>;
  /** False while the list is not the one the route shows or is being (re)loaded: nothing is requested. */
  ready: boolean;
  /** Pages that failed and are not loaded yet; a success only counts as recovery when 0 (default: always 0). */
  failedPages?: () => number;
}

export interface Prefetch {
  sentinelRef: RefObject<HTMLDivElement | null>;
  /** True while the automatic retries are exhausted (persistent errors); the list shows what it has. */
  stalled: boolean;
  /** Call on every scroll update of the scrollbar. */
  onScroll: () => void;
  /** Suppresses requests until the list length changes (used around the BC-10 tablet auto-clicks). */
  hold: () => void;
}

/** Safety net for `hold`: if the list length never changes the loader wakes up again after this long. */
const HOLD_MAX_MS = 3000;

export function usePrefetch({ length, loadMore, ready, failedPages }: PrefetchOptions): Prefetch {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const live = useRef({ length, loadMore, ready, failedPages });
  live.current = { length, loadMore, ready, failedPages };
  const state = useRef({
    alive: false,
    inFlight: 0,
    burst: 0,
    failures: 0,
    ended: false,
    stalledAt: 0,
    heldLength: -1,
    retryAt: 0,
    lastLength: length,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  const [stalled, setStalled] = useState(false);

  const nearEnd = useCallback(() => {
    const sentinel = sentinelRef.current;
    const root = sentinel?.closest<HTMLElement>("[data-scrollbar]");
    if (!sentinel || !root) return false;
    const rootRect = root.getBoundingClientRect();
    if (rootRect.height <= 0) return false;
    return sentinel.getBoundingClientRect().top <= rootRect.bottom + PREFETCH_VIEWPORTS * rootRect.height;
  }, []);

  const tryLoad = useCallback(() => {
    const s = state.current;
    const { length: count, ready: isReady } = live.current;
    if (!s.alive || !isReady || s.ended || count === 0) return;
    if (s.inFlight >= MAX_IN_FLIGHT || s.burst >= MAX_BURST || s.heldLength === count) return;
    if (Date.now() < s.retryAt) return;
    if (isStalled(s.failures)) return; // retries exhausted: only a re-arm (scroll after the cool-down, new list) continues
    if (!nearEnd()) return;
    s.inFlight += 1;
    s.burst += 1;
    const finish = (result: AppendResult) => {
      s.inFlight -= 1;
      if (!s.alive) return;
      if (result === "error") {
        s.failures += 1;
        clearTimeout(s.timer);
        if (isStalled(s.failures)) {
          s.stalledAt = Date.now();
          s.timer = undefined;
          setStalled(true);
          return;
        }
        const delay = backoffDelay(s.failures);
        s.retryAt = Date.now() + delay;
        s.timer = setTimeout(tryLoad, delay);
        return;
      }
      if (result === "end") s.ended = true;
      else if (result === "wait") s.burst -= 1;
      // A success inside the backoff window (a page requested together with the failed one) does not end the backoff,
      // and neither does a page that arrived while an earlier page is still failing (it is stashed, not progress).
      else if (Date.now() >= s.retryAt && !isStalled(s.failures) && (live.current.failedPages?.() ?? 0) === 0) {
        s.failures = 0;
        setStalled(false);
      }
      // On "ok" the list may grow, which wakes the loader again (effect below).
    };
    let outcome: Promise<AppendResult>;
    try {
      outcome = live.current.loadMore();
    } catch {
      finish("error");
      return;
    }
    outcome.then(finish, () => finish("error"));
    // A second request may follow at once while there is room (e.g. a long way to the end).
    tryLoad();
  }, [nearEnd]);

  // The sentinel observer: wakes the loader when the sentinel enters the prefetch margin.
  useEffect(() => {
    const s = state.current;
    s.alive = true;
    const sentinel = sentinelRef.current;
    const root = sentinel?.closest<HTMLElement>("[data-scrollbar]") ?? null;
    let observer: IntersectionObserver | undefined;
    const connect = () => {
      observer?.disconnect();
      if (!sentinel || !root) return;
      const margin = Math.round(PREFETCH_VIEWPORTS * root.getBoundingClientRect().height);
      observer = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1];
          if (last?.isIntersecting) tryLoad();
        },
        { root, rootMargin: `0px 0px ${margin}px 0px` }
      );
      observer.observe(sentinel);
    };
    connect();
    window.addEventListener("resize", connect);
    return () => {
      s.alive = false;
      window.removeEventListener("resize", connect);
      observer?.disconnect();
      clearTimeout(s.timer);
      s.inFlight = 0;
    };
  }, [tryLoad]);

  // A page arrived (or the list became ready): the sentinel may still be inside the margin.
  useEffect(() => {
    const s = state.current;
    if (length < s.lastLength) {
      // The list was replaced by a shorter one (page 1 reloaded): start over.
      s.ended = false;
      s.burst = 0;
      // A reloaded page 1 answered: the service works again.
      s.failures = 0;
      s.retryAt = 0;
      setStalled(false);
    }
    s.lastLength = length;
    if (s.heldLength !== length) s.heldLength = -1;
    tryLoad();
  }, [length, ready, tryLoad]);

  const onScroll = useCallback(() => {
    const s = state.current;
    s.burst = 0;
    if (isStalled(s.failures) && canRearm(s.stalledAt, Date.now())) {
      // Re-arm after the cool-down: the failure count stays one below the cap, so this attempt is a single try
      // (a failure stalls again at once, a success resets the count).
      s.failures = MAX_FAILURES_AFTER_REARM;
      s.retryAt = 0;
      setStalled(false);
    }
    tryLoad();
  }, [tryLoad]);

  const hold = useCallback(() => {
    const s = state.current;
    s.heldLength = live.current.length;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.heldLength = -1;
      tryLoad();
    }, HOLD_MAX_MS);
  }, [tryLoad]);

  return { sentinelRef, stalled, onScroll, hold };
}
