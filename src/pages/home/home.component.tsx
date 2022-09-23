import React, { useEffect, useState, useRef } from "react";
import "./home.style.css";

import MovieDetails from "../../components/movie-details/movie-details.component";
import Scrollbar from "react-smooth-scrollbar";
import { Movie } from "../../types";
import { 
  facebook_url, 
  fetchMovieDetails, 
  fetchPoster, 
  github_url, 
  instagram_url, 
  linkedin_url, 
  searchMovies 
} from "../../url-formatter";

const Home = () => {
  const [display, setDisplay] = useState<boolean>(false);
  let [options, setOptions] = useState<Movie[]>([]);
  const [search, setSearch] = useState<string>("");
  const wrapperRef = useRef<HTMLInputElement>(null);
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  });

  const handleClickOutside = (event: MouseEvent): void => {
    // const { current: wrap } = wrapperRef;
    if (wrapperRef.current && event.target instanceof HTMLElement && !wrapperRef.current.contains(event.target)) {
      setDisplay(false);
    }
  };

  const searchMovie = (event: React.SyntheticEvent) => {
    options = [];
    setMovies([]);

    fetch(
      searchMovies(event)
    )
      .then((value) => value.json())
      .then((value: { results: Array<any>}) => {
        if (value.results && value.results.length !== 0) {
          movies.push(...value.results);
          setOptions(movies);
        }
      });
  };
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
    setDisplay(false);
  };
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
                This app is developed by <b>ShankarKruthiventi</b>. You can
                reach out to me at
              </div>
              <ul>
                <li>
                  <a
                    href={linkedin_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href={github_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Github
                  </a>
                </li>

                <li>
                  <a
                    href={facebook_url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Facebook
                  </a>
                </li>
                <li>
                  <a
                    href={instagram_url}
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
              <div className="find-text">Search for movies here</div>

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
                    (document.getElementById("test") as HTMLElement).scrollIntoView();
                    // let movie = document.querySelector("[data-scrollbar]");
                    // var myElement = document.getElementById("test");
                    // var topPos = myElement.offsetTop;
                    // movie.scroll(0, topPos)
                    // console.log(movie.scrollTop, topPos);
                  }}
                  onKeyUp={(event: React.SyntheticEvent) => {searchMovie(event)}}
                />
                {display && options && options.length && (
                  <div className="autoContainer">
                    {options.map((movie: Movie, index: number) => {
                      return (
                        <div key={index}>
                          {index < 3 && (
                            <div
                              // onClick={() => updatePokeDex(value.name)}
                              className="option"
                              key={index}
                              onKeyPress={(event) => {
                                if (event.key === "Enter")
                                  handleClickOpen(movie.id);
                              }}
                              onClick={() => {
                                handleClickOpen(movie.id);
                              }}
                            >
                              <span>{movie.original_title}</span>
                              <div className="movie-search-poster-container">
                                <img
                                  className="movie-search-poster"
                                  src={fetchPoster(movie.poster_path)}
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
