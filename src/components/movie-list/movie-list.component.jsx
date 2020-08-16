import React, { useState, useEffect } from "react";
import "./movie-list.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";

import { Redirect } from "react-router-dom";

import Button from "@material-ui/core/Button";

import Scrollbar from "react-smooth-scrollbar";

const MovieList = ({ movieList, append }) => {
  const [open, setOpen] = useState(false);

  const [details, setDetails] = useState({
    title: "",
    poster: "",
    genres: [],
    homepage: "",
    overview: "",
    release_date: "",
    popularity: 0,
    vote_average: 0,
  });

  const handleClickOpen = async (movieId) => {
    await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US`
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

  let timer;
  const debounce = (fn, d) => {
    clearTimeout(timer);
    timer = setTimeout(fn, d);
  }
  const betterScroll = () => debounce(scrollDown, 600);

  const scrollDown = () => {
    let lastMovie = document.getElementById(movieList.length - 1);
    let callback = (entries) => {
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
    const nextButton = document.getElementsByClassName('next-button')[0];
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
            <Redirect
              to={{
                pathname: "/home",
              }}
            />
          )}
          {movieList &&
            movieList.length >= 1 &&
            movieList.map((movie, index) => (
              <div id={index} key={index} className="poster-container">
                <img
                  src={"https://image.tmdb.org/t/p/w500" + movie.poster_path}
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
