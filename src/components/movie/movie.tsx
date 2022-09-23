import React from "react";

import { MovieProps } from "../../types";
import { fetchPoster } from "../../url-formatter";

const Movie: React.FC<MovieProps> = ({movie, index, handleClickOpen}: MovieProps) => {
    return (
        <div id={index.toString()} key={index} className="poster-container">
            <img
            src={fetchPoster(movie.poster_path)}
            onClick={() => handleClickOpen(movie.id)}
            onKeyPress={(event) => {
                if (event.key === "Enter") handleClickOpen(movie.id);
            }}
            alt={movie.original_title}
            className="poster"
            />
        </div>
    );
}

export default Movie;