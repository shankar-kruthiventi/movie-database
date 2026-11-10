import { TMDB_API_KEY } from '../../config';
import React, { useCallback, useEffect, useState, useRef } from "react";
import type { KeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import "./home.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";
import Scrollbar from "../../components/smooth-scrollbar/smooth-scrollbar.component";
import type { MovieDetailsData, MovieDetailsResponse, MovieListItem, MovieListResponse } from "../../types/tmdb";

/** The search request is sent this long after the last change of the input (Follow-up D, 2026-11-10). */
export const SEARCH_DEBOUNCE_MS = 250;

const Home = () => {
  const [display, setDisplay] = useState(false);
  const [options, setOptions] = useState<MovieListItem[]>([]);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  // Search-as-you-type (Follow-up D, 2026-11-10): one request per pause in typing, not one per key.
  //   - fires on a changed value (typing, paste, cut, IME), never on arrow/Shift/Tab/Enter key releases;
  //   - trailing debounce SEARCH_DEBOUNCE_MS; the suggestions on screen stay until the new answer arrives;
  //   - a newer search aborts the older request, and a late older answer can never replace a newer one;
  //   - an empty (or blank) box clears the suggestions at once and sends nothing.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchAbort = useRef<AbortController | undefined>(undefined);

  const cancelSearch = useCallback(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = undefined;
    searchAbort.current?.abort();
    searchAbort.current = undefined;
  }, []);

  useEffect(() => cancelSearch, [cancelSearch]);

  const searchMovie = (query: string) => {
    cancelSearch();
    if (query.trim() === "") {
      setOptions([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      const controller = new AbortController();
      searchAbort.current = controller;
      // the raw, unencoded query is part of the contract (BC-14)
      fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=en-US&query=${query}&page=1`,
        { signal: controller.signal }
      )
        .then((value): Promise<MovieListResponse> => value.json())
        .then((value) => {
          if (controller.signal.aborted) return;
          // zero results (or an error body without `results`): clear the suggestions, no stale list
          setOptions(value.results && value.results.length !== 0 ? value.results : []);
        })
        .catch(() => {
          // aborted by a newer search: that one decides. Otherwise a network failure (offline, blocked
          // request, DNS): no unhandled rejection, no stale suggestions.
          if (!controller.signal.aborted) setOptions([]);
        });
    }, SEARCH_DEBOUNCE_MS);
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
                Movie Atlas is a sleek React web application designed to elevate your cinematic exploration. The platform empowers users to{" "}
              </div>
              <ul>
                <li><b>Discover Favorites:</b> Search seamlessly for any movie in cinematic history.</li>
                <li><b>Unlock Deep Insights:</b> Access comprehensive, real-time details for any selected title.</li>
                <li>
                  <b>Track Trends:</b> Instantly stream curated feeds of popular, top-rated, and now-playing releases.
                </li>
              </ul>
              Powered by the robust themoviedb.org REST API, Movie Atlas delivers a fast, data-rich experience for film enthusiasts.
            </div>
            <div className="about-container">
              <div className="about">About me</div>
              <div>
                Movie Atlas was engineered by <b>Sankar Kruthiventi</b>. Feel free to explore my work or get in touch through my professional and social channels:
              </div>
              <ul className="about-me-list">
                <li>
                  <b>Professional Networking:</b> <a
                    href={"https://www.linkedin.com/in/shankarkruthiventi/"}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <b>Code & Repositories:</b> <a
                    href={"https://github.com/shankar-kruthiventi"}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Github
                  </a>
                </li>

                <li>
                  <b>Social & Community:</b> <a
                    href={"https://www.facebook.com/shankar.kruthiventi/"}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Facebook
                  </a>{" "}<span aria-hidden="true">|</span>{" "}<a
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
                    searchMovie(event.target.value);
                    setDisplay(true);
                    setActiveIndex(-1);
                    document.getElementById("test")?.scrollIntoView();
                    // let movie = document.querySelector("[data-scrollbar]");
                    // var myElement = document.getElementById("test");
                    // var topPos = myElement.offsetTop;
                    // movie.scroll(0, topPos)
                    // console.log(movie.scrollTop, topPos);
                  }}
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
