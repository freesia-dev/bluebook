import { registerSW } from "virtual:pwa-register";

const hostname = window.location.hostname;
const isLovablePreview =
  window.self !== window.top ||
  hostname.startsWith("id-preview--") ||
  hostname.startsWith("preview--") ||
  hostname === "lovableproject.com" ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "lovableproject-dev.com" ||
  hostname.endsWith(".lovableproject-dev.com") ||
  hostname === "beta.lovable.dev" ||
  hostname.endsWith(".beta.lovable.dev");

export const isPwaEnabled = import.meta.env.PROD && !isLovablePreview && !new URLSearchParams(window.location.search).has("sw");

const clearStaleAppWorker = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.active?.scriptURL.endsWith("/sw.js"))
      .map((registration) => registration.unregister()),
  );

  if (!("caches" in window)) return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => /workbox|precache|html-pages/i.test(name))
      .map((name) => caches.delete(name)),
  );
};

export const initializePwa = () => {
  if (!isPwaEnabled) {
    void clearStaleAppWorker();
    return;
  }

  registerSW({ immediate: true });
};