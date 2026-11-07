import React from "react";
import "./movie-details.style.css";

import Dialog from "@mui/material/Dialog";
import MuiDialogTitle from "@mui/material/DialogTitle";
import MuiDialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Typography from "@mui/material/Typography";

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

// Current MUI renders DialogTitle as a Typography (class MuiTypography-h6), so the
// global rule `.MuiTypography-root.MuiTypography-h6 { padding: 0 25px }` in
// movie-details.style.css would also hit the title bar (v4 disableTypography did
// not). The tripled "&" raises specificity so the v4 padding (16px) is kept
// without editing the CSS file.
const DialogTitle = (props) => {
  const { children, onClose, ...other } = props;
  return (
    <MuiDialogTitle
      component="div"
      sx={{ m: 0, "&&&": { p: 2 } }}
      {...other}
    >
      <Typography variant="h6">{children}</Typography>
      {onClose ? (
        <IconButton
          aria-label="close"
          sx={{
            position: "absolute",
            right: (theme) => theme.spacing(1),
            top: (theme) => theme.spacing(1),
            color: (theme) => theme.palette.grey[500],
          }}
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      ) : null}
    </MuiDialogTitle>
  );
};

const DialogContent = (props) => <MuiDialogContent sx={{ p: 2 }} {...props} />;
