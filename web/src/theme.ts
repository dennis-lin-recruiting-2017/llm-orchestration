import { createTheme } from "@mui/material/styles"

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#2fbfa5" },
    secondary: { main: "#ffb454" },
    background: { default: "#121212", paper: "#1b1b1b" },
    text: { primary: "#f4f1ea", secondary: "#c8c2b8" },
    divider: "#383632",
    success: { main: "#6edb8f" },
    error: { main: "#ff6f61" },
    warning: { main: "#ffca6a" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    h1: { fontSize: "2rem", fontWeight: 700, letterSpacing: 0 },
    h2: { fontSize: "1.25rem", fontWeight: 700, letterSpacing: 0 },
    h3: { fontSize: "1rem", fontWeight: 700, letterSpacing: 0 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #383632",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "#1b1b1b",
          border: "1px solid #383632",
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#383632" },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 700, color: "#c8c2b8", borderColor: "#383632" },
        body: { borderColor: "#383632" },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: "transparent",
          border: "1px solid #383632",
          borderRadius: "8px !important",
          "&:before": { display: "none" },
          "&.Mui-expanded": { margin: 0 },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: { background: "#20201f", borderRadius: 8, fontWeight: 700 },
      },
    },
    MuiAccordionDetails: {
      styleOverrides: {
        root: { background: "#171716", borderRadius: "0 0 8px 8px" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
  },
})
