import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@mercurjs/admin/index.css";
import App from "@mercurjs/admin";
import { MessengerAdminBootstrap } from "./lib/messenger/MessengerAdminBootstrap";

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root was not found")
}

createRoot(rootElement).render(
  <StrictMode>
    <MessengerAdminBootstrap>
      <App />
    </MessengerAdminBootstrap>
  </StrictMode>,
);
