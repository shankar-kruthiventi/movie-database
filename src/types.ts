export type Genre = {
    name: string;
} 
  
export type Details= {
    title: string;
    poster: string;
    genres: Genre[];
    homepage: string;
    overview: string;
    release_date: string;
    popularity: number;
    vote_average: number;
    original_title?: string;
};

export type MovieDetailProps = {
    open: boolean;
    details: Details;
    handleClose: () => void;
};

export type Movie = {
    adult: boolean;
    backdrop_path: string;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string
    popularity: number;
    poster_path: string;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number
}
  
export type MovieListProps = {
    movieList: Movie[];
    append: () => void;
}

export type HeaderProps = {
    fetchData: (movieCategory: string) => void
}

export type MovieProps = {
    movie: Movie;
    index: number;
    handleClickOpen: (id: number) => void;
}