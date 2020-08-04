import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";

import "./header.style.css";

const Header = ({ fetchData }) => {
  let [type, setType] = useState("Home");
  const showMenu = (type, value) => {
    setType(type);
    var element = document.getElementById("myLinks");
    if (value === "hide") {
      element.style.display = "none";
    } else {
      element.style.display = "block";
    }
  };
  const toggleMenu = () => {
    var element = document.getElementById("myLinks");
    if(element.style.display === 'block') {
      element.style.display = 'none'
    } else {
      element.style.display = 'block'
    }
  }
  return (
    <div className="header-view">
      <div className="header-container">
        <h1>MOVIE CITY</h1>
        <NavLink to="/home">
          <h3>Home</h3>
        </NavLink>
        <NavLink extact activeClassName="active" onClick={() => fetchData("popular")} to="/popular">
          <h3>Popular Movies</h3>
        </NavLink>
        <NavLink onClick={() => fetchData("top_rated")} to="/top_rated">
          <h3>Top Rated Movies</h3>
        </NavLink>
        <NavLink onClick={() => fetchData("now_playing")} to="/now_playing">
          <h3>Now Playing</h3>
        </NavLink>
      </div>
      <div className="header-mobile-container">
        <Link 
          // to="/home"
          id="home">
          <span>{type}</span>
        </Link>
        <div id="myLinks">
          <Link
            to="/home"
            onClick={() => {
              showMenu("Home", "hide");
            }}
          >
            Home
          </Link>
          <Link
            to="/popular"
            onClick={() => {
              fetchData("popular");
              showMenu("Popular Movies", "hide");
            }}
          >
            Popular Movies
          </Link>
          <Link
            to="/top_rated"
            onClick={() => {
              fetchData("top_rated");
              showMenu("Top Rated Movies", "hide");
            }}
          >
            Top Rated Movies
          </Link>
          <Link
            to="/now_playing"
            onClick={() => {
              fetchData("now_playing");
              showMenu("Now Playing", "hide");
            }}
          >
            Now Playing
          </Link>
        </div>
        <a
          href="javascript:void(0)"
          className="icon"
          // onClick={() => showMenu(type, "show")}
          onClick={toggleMenu}
        >
          <i className="fa fa-bars"></i>
        </a>
      </div>
    </div>
  );
};

export default Header;
