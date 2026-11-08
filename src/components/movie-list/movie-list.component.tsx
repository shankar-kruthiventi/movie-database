import { TMDB_API_KEY } from '../../config';
import React, { useState, useEffect, useRef } from "react";
import "./movie-list.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";

import { Navigate } from "react-router-dom";

import Button from "@mui/material/Button";

import Scrollbar from "../smooth-scrollbar/smooth-scrollbar.component";
import { useWindowing } from "./use-windowing";
import type { MovieDetailsData, MovieDetailsResponse, MovieListItem } from "../../types/tmdb";

interface MovieListProps {
  movieList: MovieListItem[];
  append: () => void;
  // Passed by App's routes but never read (kept to leave the route elements untouched).
  movieType?: string;
}

const MovieList = ({ movieList, append }: MovieListProps) => {
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

  // Next page (BC-09): a scroll still starts a 600 ms debounce, as before. When it fires, the
  // sentinel below the grid decides: an IntersectionObserver rooted on the scrollbar viewport (no
  // margin: "sentinel visible" equals the old "last poster visible") keeps `visible` current. A page is requested once, the gate re-opens
  // when the list grows (or on a later scroll after 3 s, e.g. a failed or empty response).
  const sentinelRef = useRef<HTMLDivElement>(null);
  const appendRef = useRef(append);
  appendRef.current = append;
  const gate = useRef({
    visible: false,
    armed: true,
    firedAt: 0,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const state = gate.current;
    if (!sentinel) return;
    const root = sentinel.closest<HTMLElement>("[data-scrollbar]");
    const observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) state.visible = last.isIntersecting;
      },
      { root, rootMargin: "0px" }
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
      clearTimeout(state.timer);
    };
  }, []);

  useEffect(() => {
    gate.current.armed = true;
  }, [movieList.length]);

  const scrollDown = () => {
    const state = gate.current;
    if (!state.armed && Date.now() - state.firedAt > 3000) state.armed = true;
    if (state.visible && state.armed) {
      state.armed = false;
      state.firedAt = Date.now();
      appendRef.current();
    }
  };
  const betterScroll = () => {
    clearTimeout(gate.current.timer);
    gate.current.timer = setTimeout(scrollDown, 600);
  };
  useEffect(() => {
    const nextButton = document.querySelector<HTMLElement>('.next-button');
    if(window.innerWidth >= 768 && window.innerWidth <= 1024 && nextButton) {
      for(let click=0; click <=4; click++) {
        nextButton.click();
        console.log('clicked');
      }
    }
  }, []);

  const windowing = useWindowing(movieList.length);

  return (
    <Scrollbar onScroll={betterScroll}>
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
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
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
        <div ref={sentinelRef} className="list-sentinel" aria-hidden="true" />
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
