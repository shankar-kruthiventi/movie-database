import React, { useState } from "react";
import "./movie-list.style.css";

import { Redirect } from "react-router-dom";

import Button from "@material-ui/core/Button";

import { withStyles } from "@material-ui/core/styles";
import Dialog from "@material-ui/core/Dialog";
import MuiDialogTitle from "@material-ui/core/DialogTitle";
import MuiDialogContent from "@material-ui/core/DialogContent";
import MuiDialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Typography from "@material-ui/core/Typography";
import Scrollbar from "react-smooth-scrollbar";

const MovieList = ({ movieList, append }) => {
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

  const handleClickOpen = async (movieId) => {
    await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=fceee37c892707ca488b3969171ef2b9&language=en-US`
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
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
    console.log(details.original_title);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Scrollbar>
      <div className="movies-container">
        <div className="movieList-container">
          {movieList && !movieList.length && (
            <Redirect
              to={{
                pathname: "/home",
              }}
            />
          )}
          {movieList &&
            movieList.length >= 1 &&
            movieList.map((movie, index) => (
              <div id={index} key={index} className="poster-container">
                <img
                  src={"https://image.tmdb.org/t/p/w500" + movie.poster_path}
                  onClick={() => handleClickOpen(movie.id)}
                  alt={movie.original_title}
                  className="poster"
                />
              </div>
            ))}
        </div>
        <div className="next-button-container">
          {movieList && movieList.length && (
            <Button
              onClick={append}
              className="next-button"
              variant="outlined"
              color="secondary"
            >
              Show More
            </Button>
          )}
        </div>

        <div>
          <Dialog
            onClose={handleClose}
            maxWidth={"md"}
            aria-labelledby="customized-dialog-title"
            open={open}
          >
            <DialogTitle id="movie-title" onClose={handleClose}>
              something{details.original_title}
            </DialogTitle>
            <DialogContent dividers>
              <div className="movie-details-container">
                <div className="details-poster-container">
                  <img
                    src={
                      "https://image.tmdb.org/t/p/w500" + details.poster_path
                    }
                    className="details-poster"
                    alt={details.original_title}
                  />
                </div>
                <div class="details-other-container">
                  <div class="overview">{details.overview}</div>
                  <span>{details.homepage}</span>
                </div>
              </div>
              {/* <Typography gutterBottom>
                Cras mattis consectetur purus sit amet fermentum. Cras justo
                odio, dapibus ac facilisis in, egestas eget quam. Morbi leo
                risus, porta ac consectetur ac, vestibulum at eros.
              </Typography>
              <Typography gutterBottom>
                Praesent commodo cursus magna, vel scelerisque nisl consectetur
                et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus
                dolor auctor.
              </Typography>
              <Typography gutterBottom>
                Aenean lacinia bibendum nulla sed consectetur. Praesent commodo
                cursus magna, vel scelerisque nisl consectetur et. Donec sed
                odio dui. Donec ullamcorper nulla non metus auctor fringilla.
              </Typography> */}
            </DialogContent>
            {/* <DialogActions>
              <Button autoFocus onClick={handleClose} color="primary">
                Save changes
              </Button>
            </DialogActions> */}
          </Dialog>
        </div>
      </div>
    </Scrollbar>
  );
};

export default MovieList;

const styles = (theme) => ({
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

const DialogTitle = withStyles(styles)((props) => {
  const { children, classes, onClose, ...other } = props;
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

const DialogActions = withStyles((theme) => ({
  root: {
    margin: 0,
    padding: theme.spacing(1),
  },
}))(MuiDialogActions);

/* export function CustomizedDialogs() {
  return (

  );
}
 */
