import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { signalUpdateReady } from "./lib/updateSignal";
import "./index.css";

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
