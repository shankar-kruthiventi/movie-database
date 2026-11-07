import { TMDB_API_KEY } from '../../config';
import React, { useEffect, useState, useRef } from "react";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import "./home.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";
import Scrollbar from "../../components/smooth-scrollbar/smooth-scrollbar.component";
import type { MovieDetailsData, MovieDetailsResponse, MovieListItem, MovieListResponse } from "../../types/tmdb";

const Home = () => {
  const [display, setDisplay] = useState(false);
  let [options, setOptions] = useState<MovieListItem[]>([]);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [movies, setPokemon] = useState<MovieListItem[]>([]);

  const [activeIndex, setActiveIndex] = useState(-1);

  // Click/tap outside closes the popup. Document level, capture phase (so a component that stops
  // propagation, e.g. the custom scrollbar, cannot swallow it), pointer events cover mouse, touch and pen.
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      const { current: wrap } = wrapperRef;
      if (wrap && event.target instanceof Node && !wrap.contains(event.target)) {
        setDisplay(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside, true);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside, true);
    };
  }, []);

  // Combobox state (WAI-ARIA APG: editable combobox with list autocomplete). Only the first 3 results are shown.
  const visibleOptions = options ? options.slice(0, 3) : [];
  const expanded = display && visibleOptions.length > 0;
  const activeValid = expanded && activeIndex >= 0 && activeIndex < visibleOptions.length;
  const optionId = (index: number) => `movie-search-option-${index}`;
  let liveMessage = "";
  if (expanded) {
    liveMessage = `${visibleOptions.length} ${visibleOptions.length === 1 ? "result" : "results"} available`;
  } else if (display && search.trim() !== "") {
    liveMessage = "No results";
  }

  const closePopup = () => {
    setDisplay(false);
    setActiveIndex(-1);
  };

  const handleComboKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = visibleOptions.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (count === 0) return;
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!expanded) {
        setDisplay(true);
        setActiveIndex(down ? 0 : count - 1);
      } else if (!activeValid) {
        setActiveIndex(down ? 0 : count - 1);
      } else {
        setActiveIndex((activeIndex + (down ? 1 : count - 1)) % count);
      }
    } else if (event.key === "Enter") {
      if (activeValid) {
        event.preventDefault();
        handleClickOpen(visibleOptions[activeIndex].id);
      }
    } else if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        closePopup();
      }
    } else if (event.key === "Tab") {
      closePopup();
    }
  };

  const searchMovie = (event: KeyboardEvent<HTMLInputElement>) => {
    options = [];
    setPokemon([]);

    fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${event.currentTarget.value}&page=1`
    )
      .then((value): Promise<MovieListResponse> => value.json())
      .then((value) => {
        if (value.results && value.results.length !== 0) {
          movies.push(...value.results);
          setOptions(movies);
        }
      });
  };
  //   -------------------------------

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

  async function handleClickOpen(movieId: number) {
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
    closePopup();
  }
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Scrollbar>
      <div className="home-contianer">
        <div className="wallpaper-container">
          <div className="home-view-container">
            <div className="about-container">
              <div className="about">About this app</div>
              <div>
                Movie Atlas is made using React. This app helps the user to:{" "}
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
                This app is developed by <b>Sankar Kruthiventi</b>. You can
                reach out to me at
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

          <div className="finder-container">
            <div className="finder">
              <div className="find-text" id="auto-label">Search for movies here</div>

              <div
                ref={wrapperRef}
                className="flex-container flex-column pos-rel"
              >
                <input
                  id="auto"
                  role="combobox"
                  aria-labelledby="auto-label"
                  aria-autocomplete="list"
                  aria-expanded={expanded}
                  aria-controls="movie-search-listbox"
                  aria-activedescendant={activeValid ? optionId(activeIndex) : undefined}
                  onClick={() => {
                    setDisplay(!display);
                    setActiveIndex(-1);
                  }}
                  onKeyDown={handleComboKeyDown}
                  onBlur={(event) => {
                    const { current: wrap } = wrapperRef;
                    if (!(wrap && event.relatedTarget instanceof Node && wrap.contains(event.relatedTarget))) {
                      closePopup();
                    }
                  }}
                  placeholder="Type to search"
                  value={search}
                  autoComplete="off"
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setDisplay(true);
                    setActiveIndex(-1);
                    document.getElementById("test")?.scrollIntoView();
                    // let movie = document.querySelector("[data-scrollbar]");
                    // var myElement = document.getElementById("test");
                    // var topPos = myElement.offsetTop;
                    // movie.scroll(0, topPos)
                    // console.log(movie.scrollTop, topPos);
                  }}
                  onKeyUp={(event) => {searchMovie(event)}}
                />
                {expanded && (
                  <div
                    id="movie-search-listbox"
                    role="listbox"
                    aria-label="Movie suggestions"
                    className="autoContainer"
                    // keep focus in the input when the list is pressed (a blur would close it before the click lands)
                    onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) => event.preventDefault()}
                  >
                    {visibleOptions.map((movie, index) => (
                      <div
                        id={optionId(index)}
                        role="option"
                        aria-selected={activeValid && index === activeIndex}
                        className={activeValid && index === activeIndex ? "option option-active" : "option"}
                        key={index}
                        onMouseMove={() => {
                          if (activeIndex !== index) setActiveIndex(index);
                        }}
                        onKeyPress={(event) => {
                          // options are not focusable (focus stays in the input); kept for parity with the old handler
                          if (event.key === "Enter") handleClickOpen(movie.id);
                        }}
                        onClick={() => {
                          handleClickOpen(movie.id);
                        }}
                      >
                        <span>{movie.original_title}</span>
                        <div className="movie-search-poster-container">
                          <img
                            className="movie-search-poster"
                            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                            alt=""
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
                  {liveMessage}
                </div>
              </div>
            </div>
          </div>
          <div id="test"></div>
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
