export function fetchPoster(poster: string): string {
    return `https://image.tmdb.org/t/p/w500${poster}`;
}

export function fetchMovieDetails(id: number):string {
    return `https://api.themoviedb.org/3/movie/${id}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US`;
}

export function searchMovies(event: React.SyntheticEvent):string {
    return `https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=${(event.target as HTMLInputElement).value}&page=1`
}

export function fetchMoviesByCategory(category: string): string {
    return `https://api.themoviedb.org/3/movie/${category}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=1`
}

export function appendMoviesByCategory(category: string, page: number): string {
    return `https://api.themoviedb.org/3/movie/${category}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&page=${page}`
}

export const linkedin_url = 'https://www.linkedin.com/in/shankarkruthiventi/';

export const github_url = 'https://github.com/shankar-kruthiventi';

export const facebook_url = 'https://www.facebook.com/shankar.kruthiventi/'

export const instagram_url = 'https://www.instagram.com/madhav_kruthiventi/'
