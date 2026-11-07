import { createTheme } from "@mui/material/styles";

export type ThemeMode = "dark" | "light";

// Pins the Material-UI v4 default look (Phase 0 baseline) on current MUI, per colour mode.
// Only the values that v4 and current MUI render differently are listed here.
//
// Dark is the default and today's look. Today's dialog has a white title bar over the dark body
// (owner: dark keeps the current look), so the dark theme uses palette.mode "dark" but pins the
// surface, text, divider and action colours the Dialog uses to the v4 light values. Making the
// dialog chrome truly dark later means deleting those pins (see FOLLOW-UPS.md).
// Light mode uses the stock light palette; its secondary is the v4 "dark" pink (#c51162) because
// #f50057 is only 3.9:1 on the light page (Show More text must reach 4.5:1).
export const createAppTheme = (mode: ThemeMode) =>
  createTheme({
    // v4 breakpoints; current MUI uses md 900 / lg 1200 / xl 1536, which would
    // shrink the maxWidth="md" Dialog from 960px to 900px.
    breakpoints: {
      values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1920 },
    },
    palette: {
      mode,
      primary: { main: "#3f51b5", light: "#7986cb", dark: "#303f9f" },
      secondary:
        mode === "light"
          ? { main: "#c51162", light: "#ff4081", dark: "#880e4f" }
          : { main: "#f50057", light: "#ff4081", dark: "#c51162" },
      ...(mode === "dark"
        ? {
            background: { default: "#ffffff", paper: "#ffffff" },
            text: {
              primary: "rgba(0, 0, 0, 0.87)",
              secondary: "rgba(0, 0, 0, 0.6)",
              disabled: "rgba(0, 0, 0, 0.38)",
            },
            divider: "rgba(0, 0, 0, 0.12)",
            action: {
              active: "rgba(0, 0, 0, 0.54)",
              hover: "rgba(0, 0, 0, 0.04)",
              selected: "rgba(0, 0, 0, 0.08)",
              disabled: "rgba(0, 0, 0, 0.26)",
              disabledBackground: "rgba(0, 0, 0, 0.12)",
              focus: "rgba(0, 0, 0, 0.12)",
            },
          }
        : {}),
    },
    components:
      mode === "dark"
        ? {
            // The dark palette adds an elevation overlay to Paper; today's dialog has none.
            MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
          }
        : {},
  });

// Default export kept for existing imports: the dark (default) theme.
export default createAppTheme("dark");
