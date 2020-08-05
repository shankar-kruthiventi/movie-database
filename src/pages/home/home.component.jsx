import React, { useEffect, useState, useRef } from "react";
import "./home.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";
import Scrollbar from "react-smooth-scrollbar";

const Home = () => {
  const [display, setDisplay] = useState(false);
  let [options, setOptions] = useState([]);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const [movies, setPokemon] = useState([]);

  useEffect(() => {
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  });

  const handleClickOutside = (event) => {
    const { current: wrap } = wrapperRef;
    if (wrap && !wrap.contains(event.target)) {
      setDisplay(false);
    }
  };

  const searchMovie = (event) => {
    options = [];
    setPokemon([]);
    fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=${event.target.value}&page=1`
    )
      .then((value) => value.json())
      .then(value => {
          if (value.results && value.results.length !== 0) {
            movies.push(...value.results);
            setOptions(movies);
          }
      })
  }
  //   -------------------------------

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
        console.log(data);
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
    console.log(details.original_title);
    setOpen(true);
    setDisplay(false);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Scrollbar>
      <div className="home-contianer">
        <div className="finder-container">
          <div className="finder">
            <div className="find-text">Search for movies</div>

            <div
              ref={wrapperRef}
              className="flex-container flex-column pos-rel"
            >
              <input
                id="auto"
                onClick={() => setDisplay(!display)}
                placeholder="Type to search"
                value={search}
                autoComplete="off"
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                onKeyUp={searchMovie}
              />
              {display && options && options.length && (
                <div className="autoContainer">
                  {options.map((movie, index) => {
                    return (
                      <div key={index}>
                        {index < 3 && (
                          <div
                            // onClick={() => updatePokeDex(value.name)}
                            className="option"
                            key={index}
                            tabIndex="0"
                            onKeyPress={(event) => { if(event.key === 'Enter') handleClickOpen(movie.id)}}
                            onClick={() => handleClickOpen(movie.id)}
                            tabIndex="0"
                          >
                            <span>{movie.original_title}</span>
                            <div className="movie-search-poster-container">
                              <img
                                className="movie-search-poster"
                                src={
                                  "https://image.tmdb.org/t/p/w500" +
                                  movie.poster_path
                                }
                                alt="poster"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="home-view-container">
          <div className="about-container">
            <div className="about">About this app</div>
            <div>
              Movie City is made using React. This app helps the user to:{" "}
            </div>
            <ol>
              <li>Search for his/her favourite movies.</li>
              <li>Allows the user to get respective movie details.</li>
              <li>
                Gives the user info about popular, top rated and now playing
                movies.
              </li>
            </ol>
            This app uses themoviedb.org REST API to fetch the movie details.
          </div>
          <div className="about-container">
            <div className="about">About me</div>
            <div>
              This app is developed by <b>ShankarKruthiventi</b>. You can reach
              out to me at
            </div>
            <ul>
              <li>
                <a
                  href={"https://www.linkedin.com/in/shankarkruthiventi/"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href={"https://github.com/shankar-kruthiventi"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Github
                </a>
              </li>

              <li>
                <a
                  href={"https://www.facebook.com/shankar.kruthiventi/"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Facebook
                </a>
              </li>
              <li>
                <a
                  href={"https://www.instagram.com/madhav_kruthiventi/"}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>
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

export default Home;
