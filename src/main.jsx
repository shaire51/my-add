import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.jsx";
import { MeetingsProvider } from "./stores/meetingsStore.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MeetingsProvider>
      <App />
    </MeetingsProvider>
  </StrictMode>
);
