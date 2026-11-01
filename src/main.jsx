import React from "react";
import "./components.css";
import { createRoot } from "react-dom/client";
import App from "./ui/App.jsx";
import { TooltipProvider } from "./ui/Tooltip.jsx";
createRoot(document.getElementById("root")).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>,
);
