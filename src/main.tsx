import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { signalUpdateReady } from "./lib/updateSignal";
import "@fontsource/baloo-da-2/500.css";
import "@fontsource/baloo-da-2/600.css";
import "@fontsource/baloo-da-2/700.css";
import "@fontsource/baloo-da-2/800.css";
import "./index.css";
import "./styles/buzzer.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    signalUpdateReady(() => void updateSW(true));
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
