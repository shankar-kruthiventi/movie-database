import React, { useEffect, useState, useRef } from "react";
import "./home.style.css";

import Scrollbar from "react-smooth-scrollbar";

const Home = () => {
  const [display, setDisplay] = useState(false);
  let [options, setOptions] = useState([]);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef(null);
  const [pokemon, setPokemon] = useState([]);

  useEffect(() => {
    /* const promises = new Array(1)
      .fill()
      .map((value, i) =>
        fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=${value}&page=1`
        )
      );
    Promise.all(promises).then((pokemonArr) => {
      return pokemonArr.map((value) => {
        value
          .json()
          /* .then(({ name, sprites: { front_default: sprite } }) =>
            pokemon.push({ name, sprite })
          //) 
          
          .then(({ results }) => pokemon.push(...results));
          setOptions(pokemon);
      });
    }); */
  });

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

  const updatePokeDex = (poke) => {
    setSearch(poke);
    setDisplay(false);
  };

  const searchMovie = (event) => {
    console.log(event.target.value);
    options = [];
    setPokemon([]);
    const promises = new Array(1)
      .fill()
      .map((value, i) =>
        fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=${event.target.value}&page=1`
        )
      );
    Promise.all(promises).then((pokemonArr) => {
      return pokemonArr.map((value, index) => {
        value
          .json()
          .then(({ results }) => {
            if (results && results.length !== 0) {
              pokemon.push(...results);
              setOptions(pokemon);
            }
          });
      });
    });
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
                autocomplete="off"
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                onKeyUp={searchMovie}
              />
              {display && options &&
                      options.length && (
                <div className="autoContainer">
                  {
                      options.map((movie, index) => {
                        return (
                          <div>
                            {index < 3 && (
                              <div
                                // onClick={() => updatePokeDex(value.name)}
                                className="option"
                                key={index}
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
                      })
                  }
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
      </div>
    </Scrollbar>
  );
};

export default Home;
