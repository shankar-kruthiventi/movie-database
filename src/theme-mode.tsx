import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "./theme";
import type { ThemeMode } from "./theme";

export type { ThemeMode };
export const THEME_STORAGE_KEY = "movie-atlas-theme";

interface ThemeModeValue {
  mode: ThemeMode;
  toggle: () => void;
}

// Default (no provider, e.g. a bare <App /> in unit tests): dark, toggle does nothing.
const ThemeModeContext = createContext<ThemeModeValue>({ mode: "dark", toggle: () => {} });

export const useThemeMode = () => useContext(ThemeModeContext);

// Every storage access is wrapped: the app must work with storage blocked (private mode, site data off).
const readStoredMode = (): ThemeMode => {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};
const writeStoredMode = (mode: ThemeMode) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* storage blocked: the choice just lasts for this page view */
  }
};

// The inline script in index.html has already put data-theme on <html> before first paint; start from it.
const initialMode = (): ThemeMode => {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : readStoredMode();
};

export const ThemeModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<ThemeMode>(initialMode);

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    setMode(next);
    writeStoredMode(next);
  }, [mode]);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
