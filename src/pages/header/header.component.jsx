import React from "react";
import { Link } from 'react-router-dom';

import TextField from "@material-ui/core/TextField";
import Autocomplete from "@material-ui/lab/Autocomplete";
import "./header.style.css";

const Header = ({fetchData}) => {
  return (
    <div className="header-container">
      <Link to="/home">
        <h1>MOVIE CITY</h1>
      </Link>
      <Link onClick={() => fetchData('popular')} to="/popular">
        <h3>Popular Movies</h3>
      </Link>
      <Link onClick={() => fetchData('top_rated')} to="/top_rated">
        <h3>Top Rated Movies</h3>
      </Link>
      <Link onClick={() => fetchData('now_playing')} to="/now_playing">
        <h3>Now Playing</h3>
      </Link>
      <Autocomplete
        id="movie-name"
        options={top100Films}
        getOptionLabel={(option) => option.title}
        style={{ width: 300 }}
        renderInput={(params) => (
          <TextField {...params} label="Search Movies" />
        )}
      />
    </div>
  );
};
const top100Films = [
  { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 },
];
export default Header;
