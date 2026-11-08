import { useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { TMDB_API_KEY } from "./config";
import type { AppendResult, MovieListItem, MovieListResponse } from "./types/tmdb";

// Ordered, pipelined next-page loader for the list prefetch (Movie Atlas step 5b).
//
// The legacy `append` in App (kept for the hidden Show More button and the BC-10 tablet quirk) reads
// the list and the page counter from its render closure, so it cannot run twice at once. This loader
// keeps its own bookkeeping in refs, so a few pages can be in flight at once (network latency is the
// bottleneck of a fast scroll) while they are still committed to the list strictly in page order:
//   - pages are numbered from the shared page counter and the counter is advanced, so the legacy path and
//     this one keep one numbering. The counter is reset to 2 when the category changes (BC-05/BC-32, owner
//     decision 2026-11-08): each category starts again at page 1 (the page-1 load) then 2, 3, ..;
//   - a page that arrives early waits in a stash until the pages before it have been committed;
//   - a failed page is queued for retry (the caller backs off); later pages stay stashed, so nothing is
//     requested twice and nothing is skipped;
//   - the list is replaced by `reset` when a category's page 1 loads: in-flight results are dropped;
//   - the category a page belongs to is fixed at `reset` (not read at request time), and `generation`
//     changes only when the category changes, so the legacy `append` can drop a response that was
//     requested for the previous category.

/** TMDB serves at most 500 pages per list (assumption from the API docs, not checked against the live API). */
const TMDB_MAX_PAGE = 500;
/** The page after page 1: where the counter starts for every category. */
const FIRST_NEXT_PAGE = 2;

interface Inputs {
  /** Page counter (App state; the next page the legacy `append` would request). */
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  setList: Dispatch<SetStateAction<MovieListItem[]>>;
}

export interface PagePipeline {
  /** Requests the next page. "ok": a page arrived (it may wait for earlier ones); "wait": nothing to request
   *  right now; "end": no more pages; "error": the request failed (it is retried by the next call). */
  loadMore: () => Promise<AppendResult>;
  /** Call when a list is (re)loaded from page 1: drops everything in flight and learns the page count.
   *  A different `category` than the previous reset also restarts the page counter at 2 (BC-32). */
  reset: (category: string, totalPages: number | undefined) => void;
  /** Changes whenever the category changes; a response requested under an older value is stale. */
  generation: () => number;
}

export function usePagePipeline(inputs: Inputs): PagePipeline {
  const live = useRef(inputs);
  live.current = inputs;
  const state = useRef({
    epoch: 0,
    generation: 0,
    category: "",
    next: 0,
    expected: 0,
    inFlight: 0,
    totalPages: TMDB_MAX_PAGE,
    stash: new Map<number, MovieListItem[]>(),
    retry: [] as number[],
  });

  const reset = useCallback((category: string, totalPages: number | undefined) => {
    const s = state.current;
    s.epoch += 1;
    if (category !== s.category) {
      // Category change (BC-32): the new list restarts at page 2 after its page 1, for Show More and the prefetch alike.
      s.category = category;
      s.generation += 1;
      s.next = FIRST_NEXT_PAGE;
      s.expected = FIRST_NEXT_PAGE;
      live.current.setPage(FIRST_NEXT_PAGE);
    } else {
      // Same category reloaded (initial load then the nav click, BC-10): the counter is left alone.
      s.next = 0;
      s.expected = 0;
    }
    s.inFlight = 0;
    s.totalPages = Math.min(TMDB_MAX_PAGE, totalPages ?? TMDB_MAX_PAGE);
    s.stash.clear();
    s.retry.length = 0;
  }, []);

  const flush = useCallback(() => {
    const s = state.current;
    for (let results = s.stash.get(s.expected); results; results = s.stash.get(s.expected)) {
      s.stash.delete(s.expected);
      s.expected += 1;
      if (results.length > 0) {
        const added = results;
        live.current.setList((prev) => [...prev, ...added]);
      }
    }
  }, []);

  const load = useCallback(
    async (n: number, epoch: number, category: string): Promise<AppendResult> => {
      const s = state.current;
      let data: MovieListResponse | undefined;
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${category}?api_key=${TMDB_API_KEY}&language=en-US&page=${n}`
        );
        data = await response.json();
      } catch {
        data = undefined;
      }
      if (epoch !== s.epoch) return "wait";
      s.inFlight -= 1;
      if (!data || !Array.isArray(data.results)) {
        s.retry.push(n);
        s.retry.sort((a, b) => a - b);
        return "error";
      }
      if (typeof data.total_pages === "number") s.totalPages = Math.min(TMDB_MAX_PAGE, data.total_pages);
      if (data.results.length === 0) s.totalPages = Math.min(s.totalPages, n - 1);
      s.stash.set(n, data.results);
      flush();
      return "ok";
    },
    [flush]
  );

  const loadMore = useCallback((): Promise<AppendResult> => {
    const s = state.current;
    const idle = s.inFlight === 0 && s.stash.size === 0 && s.retry.length === 0;
    if (idle) {
      // Nothing pending: follow the shared counter (the legacy append, or a category change, may have moved it).
      s.next = Math.max(s.next, live.current.page);
      s.expected = s.next;
    }
    const retryPage = s.retry.shift();
    const n = retryPage ?? s.next;
    if (retryPage === undefined) {
      if (n > s.totalPages) return Promise.resolve(idle ? "end" : "wait");
      s.next = n + 1;
      live.current.setPage((p) => Math.max(p, n + 1));
    }
    s.inFlight += 1;
    return load(n, s.epoch, s.category);
  }, [load]);

  const generation = useCallback(() => state.current.generation, []);

  return { loadMore, reset, generation };
}
