import React from "react";
import "./movie-details.style.css";

import Dialog from "@material-ui/core/Dialog";
import { MovieDetailProps } from "../../types";
import DialogContainer from "./Dialog/DialogContainer";
import DialogContents from "./Dialog/DialogContent";

const MovieDetails = ({ open, details, handleClose }: MovieDetailProps) => {
  return (
    <div>
      <Dialog
        onClose={handleClose}
        maxWidth={"md"}
        aria-labelledby="customized-dialog-title"
        open={open}
      >
        <DialogContainer id="movie-title" onClose={handleClose}>
          {details.title}
        </DialogContainer>
        <DialogContents details={details} />
      </Dialog>
    </div>
  );
};

export default MovieDetails;

