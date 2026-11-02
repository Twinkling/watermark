import React, { useLayoutEffect } from "react";
import "./components.css";
import { createRoot } from "react-dom/client";
import App from "./ui/App.jsx";
import { TooltipProvider } from "./ui/Tooltip.jsx";
function ReadyMarker() {
  useLayoutEffect(() => {
    performance.mark("watermark-ready");
  }, []);
  return null;
}
createRoot(document.getElementById("root")).render(
  <TooltipProvider>
    <App />
    <ReadyMarker />
  </TooltipProvider>,
);
