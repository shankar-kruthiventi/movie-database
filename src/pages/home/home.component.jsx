import React from "react";
import "./home.style.css";

import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";

import Scrollbar from "react-smooth-scrollbar";

let top100Films = [
  /* { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 }, */
];

const Home = () => {
  const fetchOptions = (event, value) => {
    console.log(value);
    fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US&query=${value}&page=1`
    )
      .then((response) => response.json())
      .then((data) => {
        // console.log(data);
        let movies = [];
        data.results.map((movie) => {
          return movies.push({ title: movie.original_title, id: movie.id });
        });
        console.log(movies);
        top100Films = movies;
      });
  };

  return (
    <Scrollbar>
      <div className="home-contianer">
        <div className="finder-container">
          <Autocomplete
            id="movie-name"
            freeSolo
            options={top100Films}
            getOptionLabel={(option) => option.title}
            //   style={{ width: 300 }}
            className="autocomplete"
            variant="outlined" 
            onInputChange={fetchOptions}
            renderInput={(params) => (
              <TextField {...params} label="Type to Search Movies" />
            )}
          />
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
              This app is developed by <b>ShankarKruthiventi</b>. You can find
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
      </div>
    </Scrollbar>
  );
};

export default Home;
