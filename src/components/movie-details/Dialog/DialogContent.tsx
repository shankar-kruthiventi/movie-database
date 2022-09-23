import React from "react";

import { withStyles } from "@material-ui/core/styles";

import { fetchPoster } from "../../../url-formatter";
import MuiDialogContent from "@material-ui/core/DialogContent";
import { Details } from "../../../types";

const DialogContent = withStyles((theme) => ({
    root: {
      padding: theme.spacing(2),
    },
  }))(MuiDialogContent);
  

const DialogContents = ({details}: {details: Details}) => (
    <DialogContent dividers id="dialog-content">
        <div className="movie-details-container">
        <div className="details-poster-container">
            <img
            src={fetchPoster(details.poster)}
            className="details-poster"
            alt={details.original_title}
            />
        </div>
        <div className="details-other-container">
            {details.overview && (
            <div className="overview">{details.overview}</div>
            )}
            {details.homepage && (
            <div>
                <a
                target="_blank"
                className="movie-home-page"
                rel="noopener noreferrer"
                href={details.homepage}
                >
                {details.homepage}
                </a>
            </div>
            )}
            {details.release_date && (
            <div>
                <b>Release date: </b>
                {details.release_date}
            </div>
            )}
            {details.genres.length && (
            <div>
                <b>Genres: </b>
                {details.genres.map((gener, index) => (
                <span key={index}>{gener.name} </span>
                ))}
            </div>
            )}
            {details.popularity && (
            <div>
                <b>Popularity: </b>
                {details.popularity.toFixed(2)}
            </div>
            )}
            {details.vote_average && (
            <div>
                <b>Rating: </b>
                {details.vote_average.toFixed(2)}/10
            </div>
            )}
        </div>
        </div>
    </DialogContent>
)

export default DialogContents;

