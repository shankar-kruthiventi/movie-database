// Single source of truth for list routes. `path` is the URL segment (kebab-case, shown in the
// hash); `category` is the TMDB API path segment (/movie/{category}) and must not change.
export interface ListRoute {
  path: string;
  category: string;
  /** Old URL segment that now redirects to `path` (bookmarks keep working). */
  legacyPath?: string;
}

export const LIST_ROUTES: readonly ListRoute[] = [
  { path: "popular", category: "popular" },
  { path: "top-rated", category: "top_rated", legacyPath: "top_rated" },
  { path: "now-playing", category: "now_playing", legacyPath: "now_playing" },
];

const find = (path: string): ListRoute => {
  const route = LIST_ROUTES.find((r) => r.path === path);
  if (!route) {
    throw new Error(`Unknown list route: ${path}`);
  }
  return route;
};

export const POPULAR = find("popular");
export const TOP_RATED = find("top-rated");
export const NOW_PLAYING = find("now-playing");
