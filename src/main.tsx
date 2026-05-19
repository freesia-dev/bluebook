import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload when a stale chunk fails to load after a new deploy
const handleChunkError = (msg: string) => {
  if (
    msg &&
    (msg.includes("Importing a module script failed") ||
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("error loading dynamically imported module"))
  ) {
    const key = "__chunk_reload_at";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
};

window.addEventListener("error", (e) => handleChunkError(e.message));
window.addEventListener("unhandledrejection", (e) =>
  handleChunkError(String((e.reason && e.reason.message) || e.reason || ""))
);

createRoot(document.getElementById("root")!).render(<App />);
