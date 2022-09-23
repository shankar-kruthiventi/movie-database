import React, { useState } from "react";
import "./movie-list.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";

import { Navigate } from "react-router-dom";

import Button from "@material-ui/core/Button";

import Scrollbar from "react-smooth-scrollbar";

import { Details, MovieListProps } from "../../types";
import { fetchMovieDetails } from "../../url-formatter";
import Movie from "../movie/movie";

const MovieList = ({ movieList, append }: MovieListProps) => {
  const [open, setOpen] = useState(false);

  const [details, setDetails] = useState<Details>({
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
      fetchMovieDetails(movieId)
    )
      .then((response) => response.json())
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

   let timer :ReturnType<typeof setTimeout>;
   const debounce = (fn: () => void, d: number) => {
    clearTimeout(timer);
    timer = setTimeout(fn, d);
  }
   const betterScroll = () => debounce(scrollDown, 600);

  const scrollDown = () => {
    let lastMovie = document.getElementById((movieList.length - 1).toString());
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

  return (
    <Scrollbar onScroll={betterScroll}>
      <div className="movies-container">
        <div className="movieList-container">
          {movieList && !movieList.length && (
            <Navigate
              to={{
                pathname: "/home",
              }}
            />
          )}
          {movieList &&
            movieList.length >= 1 &&
            movieList.map((movie, index) => (
              <Movie 
                movie={movie} 
                key={index} 
                index={index} 
                handleClickOpen={handleClickOpen}  
              />
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
