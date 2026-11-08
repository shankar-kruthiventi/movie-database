import { TMDB_API_KEY } from '../../config';
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import "./movie-list.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";

import { Navigate } from "react-router-dom";

import Button from "@mui/material/Button";

import Scrollbar from "../smooth-scrollbar/smooth-scrollbar.component";
import { useWindowing } from "./use-windowing";
import type { WarmRanges } from "./use-windowing";
import { usePrefetch } from "./use-prefetch";
import { createPosterPreloader } from "./poster-preloader";
import type { AppendResult, MovieDetailsData, MovieDetailsResponse, MovieListItem } from "../../types/tmdb";

const posterUrl = (movie: MovieListItem) => `https://image.tmdb.org/t/p/w500${movie.poster_path}`;

interface MovieListProps {
  movieList: MovieListItem[];
  append: () => void;
  // Ordered next-page loader for the prefetch (App pipeline); `append` stays the Show More handler.
  loadMore: () => Promise<AppendResult>;
  // The category this route shows, the category App has loaded, and whether a page-1 load is in
  // flight: the next-page prefetch waits until the list on screen is the one for this route.
  movieType?: string;
  loadedType?: string;
  loading?: boolean;
}

const MovieList = ({ movieList, append, loadMore, movieType, loadedType, loading }: MovieListProps) => {
  const [open, setOpen] = useState(false);

  const [details, setDetails] = useState<MovieDetailsData>({
    title: "",
    poster: "",
    genres: [],
    homepage: "",
    overview: "",
    release_date: "",
    popularity: 0,
    vote_average: 0,
  });

  const handleClickOpen = async (movieId: number) => {
    await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`
    )
      .then((response): Promise<MovieDetailsResponse> => response.json())
      .then((data) => {
        setDetails({
          title: data.original_title,
          poster: data.poster_path,
          genres: data.genres,
          homepage: data.homepage,
          overview: data.overview,
          release_date: data.release_date,
          popularity: data.popularity,
          vote_average: data.vote_average,
        });
      });
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  // Next page (BC-09, changed in step 5b): the list prefetches the next page when the sentinel below
  // the grid comes within three viewport heights of the viewport, no scroll or debounce needed (see use-prefetch.ts).
  const ready = !loading && (loadedType === undefined || movieType === undefined || loadedType === movieType);
  const prefetch = usePrefetch({ length: movieList.length, loadMore, ready });
  // BC-10: at 768-1024 px the five stale-closure appends below are the page requests for this list; the
  // prefetch stays quiet until they have changed the list length, then continues the numbering. Runs
  // before any effect, so the prefetch's first check (a mount effect) cannot request a page first.
  const { hold } = prefetch;
  useLayoutEffect(() => {
    if (window.innerWidth >= 768 && window.innerWidth <= 1024) hold();
  }, [hold]);
  useEffect(() => {
    const nextButton = document.querySelector<HTMLElement>('.next-button');
    if(window.innerWidth >= 768 && window.innerWidth <= 1024 && nextButton) {
      for(let click=0; click <=4; click++) {
        nextButton.click();
        console.log('clicked');
      }
    }
  }, []);

  // Posters just beyond the mounted window (and the landing zone of a fling) are fetched and decoded ahead of time.
  const movieListRef = useRef(movieList);
  movieListRef.current = movieList;
  const [preloader] = useState(() => createPosterPreloader());
  useEffect(() => () => preloader.clear(), [preloader]);
  const warm = (ranges: WarmRanges) => {
    const urls: string[] = [];
    for (const [from, to] of ranges) {
      for (const movie of movieListRef.current.slice(from, to)) {
        if (movie.poster_path) urls.push(posterUrl(movie));
      }
    }
    preloader.warm(urls);
  };

  const windowing = useWindowing(movieList.length, warm);

  return (
    <Scrollbar onScroll={prefetch.onScroll}>
      <div className="movies-container" ref={windowing.rootRef}>
        <div className="movieList-container" data-total={movieList.length}>
          {movieList && !movieList.length && (
            <Navigate to="/home" replace />
          )}
          <div
            ref={windowing.topSpacerRef}
            className="list-spacer"
            style={{ height: windowing.topSpacer }}
            aria-hidden="true"
          />
          {movieList &&
            movieList.length >= 1 &&
            movieList.slice(windowing.start, windowing.end).map((movie, offset) => {
              const index = windowing.start + offset;
              return (
              <div id={String(index)} key={index} className="poster-container">
                <img
                  src={posterUrl(movie)}
                  onClick={() => handleClickOpen(movie.id)}
                  onKeyPress={(event) => {
                    if (event.key === "Enter") handleClickOpen(movie.id);
                  }}
                  alt={movie.original_title}
                  className="poster"
                  decoding="async"
                />
              </div>
              );
            })}
          <div
            className="list-spacer"
            style={{ height: windowing.bottomSpacer }}
            aria-hidden="true"
          />
        </div>
        <div ref={prefetch.sentinelRef} className="list-sentinel" aria-hidden="true" />
        <div className="next-button-container">
          {movieList && movieList.length && (
            <Button
              onClick={append}
              className="next-button"
              variant="outlined"
              color="secondary"
            >
              Show More
            </Button>
          )}
        </div>
        <MovieDetails
          open={open}
          details={details}
          handleClose={handleClose}
        ></MovieDetails>
      </div>
    </Scrollbar>
  );
};

export default MovieList;
