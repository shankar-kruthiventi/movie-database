// TMDB v3 response shapes, limited to the fields this app reads (see e2e/fixtures).

export interface Genre {
  id: number;
  name: string;
}

/** One entry of `/movie/{category}` and `/search/movie` results. */
export interface MovieListItem {
  id: number;
  original_title: string;
  title?: string;
  poster_path: string | null;
  overview?: string;
  vote_average?: number;
  release_date?: string;
}

/**
 * Response of `/movie/{category}` and `/search/movie` (success shape). TMDB error bodies have no
 * `results`; the app does not model them and its runtime checks for a missing `results` are kept as is.
 */
export interface MovieListResponse {
  page?: number;
  total_pages?: number;
  results: MovieListItem[];
}

/** Response of `/movie/{id}` (only the fields the details dialog uses). */
export interface MovieDetailsResponse {
  id?: number;
  original_title: string;
  poster_path: string | null;
  overview: string;
  homepage: string;
  release_date: string;
  genres: Genre[];
  popularity: number;
  vote_average: number;
}

/** View model shown by the details dialog (what `handleClickOpen` stores). */
export interface MovieDetailsData {
  title: string;
  poster: string | null;
  genres: Genre[];
  homepage: string;
  overview: string;
  release_date: string;
  popularity: number;
  vote_average: number;
  /**
   * Never set by the app, but the dialog reads it for the poster `alt` (so the attribute is always
   * missing). Kept as-is to preserve behavior; see FOLLOW-UPS.md.
   */
  original_title?: string;
}
