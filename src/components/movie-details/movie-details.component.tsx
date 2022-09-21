import React from "react";
import "./movie-details.style.css";

import { withStyles } from "@material-ui/core/styles";
import Dialog from "@material-ui/core/Dialog";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";

const MovieDetails = ({ open, details, handleClose }) => {
  return (
    <div>
      <Dialog
        onClose={handleClose}
        maxWidth={"md"}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogTitle id="movie-title" onClose={handleClose}>
          {details.title}
        </DialogTitle>
        <DialogContent dividers id="dialog-content">
          <div className="movie-details-container">
            <div className="details-poster-container">
              <img
                src={"https://image.tmdb.org/t/p/w500" + details.poster}
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
                  {details.popularity}
                </div>
              )}
              {details.vote_average && (
                <div>
                  <b>Rating: </b>
                  {details.vote_average}/10
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovieDetails;

const styles: any = (theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
    color: theme.palette.grey[500],
  },
});

const DialogTitle = withStyles(styles)(({ children, classes, onClose, ...other }: any) => {
  // const { children, classes, onClose, ...other } = props;
  return (
    <MuiDialogTitle disableTypography className={classes.root} {...other}>
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          className={classes.closeButton}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
});

const DialogContent = withStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
  },
}))(MuiDialogContent);
