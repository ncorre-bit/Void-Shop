// frontend/src/main.jsx - ИСПРАВЛЕНО: прямой импорт global.css
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css"; // ИСПРАВЛЕНО: прямой импорт без костыля
import { SettingsProvider } from "./contexts/SettingsContext";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
);