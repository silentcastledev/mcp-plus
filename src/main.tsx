import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.jsx";
import "@radix-ui/themes/styles.css";
import "./main.css";

const element = document.getElementById("root");
if (element) {
  ReactDOM.createRoot(element).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.error(`No root element found`);
}
