import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import "@/i18n";
import "@/assets/scss/index.scss";
import App from "@/App";

createRoot(document.querySelector("#root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
