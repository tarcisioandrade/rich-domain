import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { PackageGuard } from "./components/PackageGuard";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PackageGuard>
      <App />
    </PackageGuard>
  </React.StrictMode>
);
