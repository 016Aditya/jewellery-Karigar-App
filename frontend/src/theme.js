import { createTheme } from "@mui/material/styles";

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    primary: {
      main: mode === "light" ? "#B8860B" : "#D4AF37",
      contrastText: mode === "light" ? "#FFFFFF" : "#000000",
    },
    background: {
      default: mode === "light" ? "#F5F5F7" : "#0A0A0A",
      paper: mode === "light" ? "#FFFFFF" : "#141414",
    },
    text: {
      primary: mode === "light" ? "#1A1A1A" : "#F0E8D5",
      secondary: mode === "light" ? "#666666" : "#9E927A",
    },
    divider: mode === "light" ? "#E0E0E0" : "#2A2418",
    // NEW: Dynamic custom colors for our Catalogue Cards
    goldAccent: {
      main: mode === "light" ? "#D4AF37" : "#C9A84C",
      lightBg: mode === "light" ? "#FFF8E1" : "rgba(212, 175, 55, 0.08)",
      border: mode === "light" ? "#F9E4A0" : "rgba(212, 175, 55, 0.3)",
      text: mode === "light" ? "#7D5A00" : "#E8C96A",
    },
    surface: {
      light: mode === "light" ? "#FAFAFA" : "#1A1A1A", // Replaces grey.50
    },
    status: {
      Design: "#6C8EBF",
      Manufacturing: "#C9A84C",
      "Stone Setting": "#A07BC4",
      Polishing: "#4DA9A9",
      "Quality Check": "#E09C4B",
      Ready: "#5BAA72",
      Dispatched: "#888888",
    },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    h4: { fontFamily: "Georgia, serif", fontWeight: 800 },
    h5: { fontFamily: "Georgia, serif", fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundImage: "none",
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow:
            theme.palette.mode === "light"
              ? "0px 2px 8px rgba(0,0,0,0.04)"
              : "none",
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
          textTransform: "none",
          boxShadow: "none",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
  },
});

export const getAppTheme = (mode) => createTheme(getDesignTokens(mode));
