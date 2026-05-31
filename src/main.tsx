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

// PWA auto-update: when a new service worker takes control,
// reload installed (home-screen) apps so users always see the latest version.
if ("serviceWorker" in navigator) {
  // Reload once the new SW activates and claims the page
  let didReload = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (didReload) return;
    didReload = true;
    window.location.reload();
  });

  // Poll for SW updates every 60s while the app is open (helps standalone PWAs
  // that rarely get a hard reload)
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {});
    check();
    setInterval(check, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });

    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          // Activate the new SW immediately so controllerchange fires and we reload
          nw.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });
  });
}
