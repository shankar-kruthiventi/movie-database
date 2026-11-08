// Pre-warms poster images that are about to be mounted (Movie Atlas step 5b).
//
// The windowed grid only mounts the tiles near the viewport. Posters just beyond that window (and
// the landing zone of a fast fling) are fetched and decoded here ahead of time, so that when a tile
// mounts its <img> is served from the in-memory image cache instead of showing the placeholder.
// Bounded on purpose: at most `concurrency` downloads at once, at most `limit` images kept alive,
// and every call replaces the queue, so images that are no longer ahead of the viewport are skipped.

export interface PosterPreloader {
  /** Desired posters in priority order. Queued work not in this list is dropped. */
  warm(urls: readonly string[]): void;
  /** Drops the queue and every held image (safe to call repeatedly; the preloader stays usable). */
  clear(): void;
}

interface Options {
  /** Images held (and therefore kept decoded) at once. */
  limit?: number;
  /** Downloads in flight at once. */
  concurrency?: number;
}

export function createPosterPreloader({ limit = 36, concurrency = 6 }: Options = {}): PosterPreloader {
  const held = new Map<string, HTMLImageElement>(); // insertion order = least recently wanted first
  let queue: string[] = [];
  let active = 0;
  let epoch = 0;

  const pump = () => {
    while (active < concurrency && queue.length > 0) {
      const url = queue.shift();
      if (url === undefined || held.has(url)) continue;
      const image = new Image();
      image.decoding = "async";
      held.set(url, image);
      active += 1;
      const mine = epoch;
      const done = () => {
        if (mine === epoch) active -= 1;
        pump();
      };
      image.src = url;
      // decode() resolves once the bitmap is ready (and rejects on a broken image): both end the slot.
      image.decode().then(done, done);
    }
  };

  return {
    warm(urls) {
      const wanted = new Set(urls);
      // Refresh recency of what is still wanted, evict the oldest unwanted images beyond the limit.
      for (const url of urls) {
        const image = held.get(url);
        if (image) {
          held.delete(url);
          held.set(url, image);
        }
      }
      queue = urls.filter((url) => !held.has(url)).slice(0, limit);
      for (const url of Array.from(held.keys())) {
        if (held.size + queue.length <= limit) break;
        if (!wanted.has(url)) held.delete(url);
      }
      pump();
    },
    clear() {
      epoch += 1;
      active = 0;
      queue = [];
      held.clear();
    },
  };
}
