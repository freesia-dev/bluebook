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

// PWA update detection: poll for updates; the <PWAUpdatePrompt /> component
// shows a modal when a new service worker is waiting and handles activation.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {});
    check();
    setInterval(check, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
  });
}
