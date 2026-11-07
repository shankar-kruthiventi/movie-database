import { TMDB_API_KEY } from '../../config';
import React, { useState, useEffect } from "react";
import "./movie-list.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";

import { Navigate } from "react-router-dom";

import Button from "@mui/material/Button";

import Scrollbar from "../smooth-scrollbar/smooth-scrollbar.component";
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

  let timer: ReturnType<typeof setTimeout> | undefined;
  const debounce = (fn: () => void, d: number) => {
    clearTimeout(timer);
    timer = setTimeout(fn, d);
  }
  const betterScroll = () => debounce(scrollDown, 600);

  const scrollDown = () => {
    let lastMovie = document.getElementById(String(movieList.length - 1));
    let callback = (entries: IntersectionObserverEntry[]) => {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          append();
          break;
        }
      }
    };
    let observer = new IntersectionObserver(callback);
    if(lastMovie) {
      observer.observe(lastMovie);
    }
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

  /* const scrollDown = () => {
    let movie = document.querySelector('[data-scrollbar]');
    if (
      movie.scrollTop + movie.clientHeight >=
      movie.scrollHeight
    ) {
      append();
    }
  } */
  return (
    <Scrollbar onScroll={betterScroll}>
      <div className="movies-container">
        <div className="movieList-container">
          {movieList && !movieList.length && (
            <Navigate to="/home" replace />
          )}
          {movieList &&
            movieList.length >= 1 &&
            movieList.map((movie, index) => (
              <div id={String(index)} key={index} className="poster-container">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  onClick={() => handleClickOpen(movie.id)}
                  onKeyPress={(event) => {
                    if (event.key === "Enter") handleClickOpen(movie.id);
                  }}
                  alt={movie.original_title}
                  className="poster"
                />
              </div>
            ))}
        </div>
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
