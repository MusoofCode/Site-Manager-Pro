import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  // Force a single theme across the app (no light-mode toggle anywhere)
  <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
    <App />
  </ThemeProvider>,
);
