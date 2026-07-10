import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mercurjs/vendor/index.css";
import App from "@mercurjs/vendor";
import { MessengerVendorBootstrap } from "./lib/messenger/MessengerVendorBootstrap";

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root was not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <MessengerVendorBootstrap>
      <App />
    </MessengerVendorBootstrap>
  </StrictMode>,
);
