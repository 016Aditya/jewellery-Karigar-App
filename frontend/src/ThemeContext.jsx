import { createContext, useState, useMemo, useContext, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getAppTheme } from "./theme"; // Import the function from step 1

// Create the context
const ThemeModeContext = createContext();

// Custom hook to easily grab the toggle function anywhere in the app
export const useThemeMode = () => useContext(ThemeModeContext);

export function AppThemeProvider({ children }) {
  // Default to dark, but check if the user previously chose light
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    const savedMode = localStorage.getItem("appThemeMode");
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === "light" ? "dark" : "light";
      localStorage.setItem("appThemeMode", newMode);
      return newMode;
    });
  };

  // Only re-calculate the theme if the mode actually changes
  const theme = useMemo(() => getAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline applies the background color globally */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
