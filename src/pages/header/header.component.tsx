import React, { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { NavLink, Link } from "react-router-dom";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import { useThemeMode } from "../../theme-mode";
import "./header.style.css";

interface HeaderProps {
  fetchData: (category: string) => void;
}

// Icon button that switches between dark (default) and light mode. The accessible name states
// the action, so the name itself carries the state (no aria-pressed: the two would contradict).
const ThemeToggle = ({ className }: { className: string }) => {
  const { mode, toggle } = useThemeMode();
  const next = mode === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${next} mode`}
      onClick={toggle}
    >
      {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
    </button>
  );
};

const Header = ({ fetchData }: HeaderProps) => {
  let [type, setType] = useState<string>("Home");
  const [menuOpen, setMenuOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // Choosing a mobile menu item: update the label, close the menu and give focus back to the
  // hamburger (the focused link is about to be hidden, so focus would otherwise fall to <body>).
  const chooseItem = (label: string) => {
    setType(label);
    setMenuOpen(false);
    burgerRef.current?.focus();
  };
  const onMobileKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpen(false);
      burgerRef.current?.focus();
    }
  };
  return (
    <div className="header-view">
      <div className="header-container">
        <h1>MOVIE ATLAS</h1>
        <NavLink to="/home">
          <h3>Home</h3>
        </NavLink>
        <NavLink onClick={() => fetchData("popular")} to="/popular">
          <h3>Popular Movies</h3>
        </NavLink>
        <NavLink onClick={() => fetchData("top_rated")} to="/top_rated">
          <h3>Top Rated Movies</h3>
        </NavLink>
        <NavLink onClick={() => fetchData("now_playing")} to="/now_playing">
          <h3>Now Playing</h3>
        </NavLink>
        <ThemeToggle className="theme-toggle-desktop" />
      </div>
      <div className="header-mobile-container" onKeyDown={onMobileKeyDown}>
        {/* Hamburger and theme toggle come first in the DOM so Tab order matches the visual order
            (both are absolutely positioned, so the layout is unchanged). */}
        <button
          type="button"
          ref={burgerRef}
          className="icon"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="myLinks"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <i className="fa fa-bars" aria-hidden="true"></i>
        </button>
        <ThemeToggle className="theme-toggle-mobile" />
        {/* Plain label: it shows the current section and does nothing, so it is not interactive. */}
        <div id="home">
          <span>{type}</span>
        </div>
        <div id="myLinks" style={menuOpen ? { display: "block" } : undefined}>
          <Link
            to="/home"
            onClick={() => {
              chooseItem("Home");
            }}
          >
            Home
          </Link>
          <Link
            to="/popular"
            onClick={() => {
              fetchData("popular");
              chooseItem("Popular Movies");
            }}
          >
            Popular Movies
          </Link>
          <Link
            to="/top_rated"
            onClick={() => {
              fetchData("top_rated");
              chooseItem("Top Rated Movies");
            }}
          >
            Top Rated Movies
          </Link>
          <Link
            to="/now_playing"
            onClick={() => {
              fetchData("now_playing");
              chooseItem("Now Playing");
            }}
          >
            Now Playing
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Header;
