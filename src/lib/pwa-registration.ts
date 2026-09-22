import { registerSW } from "virtual:pwa-register";

// Jangan pasang service worker kalau aplikasi dibuka di dalam iframe
// (mis. pratinjau), supaya cache-nya tidak nyangkut di tempat lain.
const isFramed = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

export const isPwaEnabled = import.meta.env.PROD && !isFramed && !new URLSearchParams(window.location.search).has("sw");

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