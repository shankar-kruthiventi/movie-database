import { createTheme } from "@mui/material/styles";

// Pins the Material-UI v4 default look (Phase 0 baseline) on current MUI.
// Only the values that v4 and current MUI render differently are listed here.
const theme = createTheme({
  // v4 breakpoints; current MUI uses md 900 / lg 1200 / xl 1536, which would
  // shrink the maxWidth="md" Dialog from 960px to 900px.
  breakpoints: {
    values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
  },
  palette: {
    primary: { main: "#3f51b5", light: "#7986cb", dark: "#303f9f" },
    secondary: { main: "#f50057", light: "#ff4081", dark: "#c51162" },
  },
});

export default theme;
