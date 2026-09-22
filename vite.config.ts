import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
// Identitas build untuk fitur "Cek Update" (halaman About) & pengecek versi
// otomatis. Di Cloudflare Pages, CF_PAGES_COMMIT_SHA otomatis tersedia saat
// build, jadi ID build = commit yang sedang ter-deploy.
const APP_BUILT_AT = new Date().toISOString();
const APP_BUILD_ID =
  (process.env.CF_PAGES_COMMIT_SHA || "").slice(0, 7) ||
  Date.now().toString(36);

/**
 * Menulis /version.json saat build. Aplikasi membandingkan isi file ini
 * (selalu diambil fresh dari server, tanpa cache) dengan ID build yang
 * tertanam di bundle-nya sendiri — kalau beda, berarti ada versi baru.
 * Sengaja TIDAK ikut di-precache service worker (globPatterns tidak
 * mencakup .json), supaya selalu mencerminkan deploy terbaru.
 */
const versionFilePlugin = (): Plugin => ({
  name: "bluebook-version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({
      type: "asset",
      fileName: "version.json",
      source: JSON.stringify({ build: APP_BUILD_ID, builtAt: APP_BUILT_AT }),
    });
  },
});

export default defineConfig(() => ({
  define: {
    __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
    __APP_BUILT_AT__: JSON.stringify(APP_BUILT_AT),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    versionFilePlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "pwa-icon-192.png", "pwa-icon-512.png"],
      manifest: {
        name: "Bluebook Telihan - Digital Log Book",
        short_name: "Bluebook",
        description: "Portal Administrasi Digital KCP Telihan - Bankaltimtara",
        theme_color: "#0B5394",
        background_color: "#0a1628",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        categories: ["business", "productivity"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            // HTML navigations — always try the network first so new deploys
            // reach installed home-screen apps without a manual reinstall.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // CATATAN: sempat dicoba manualChunks untuk memisahkan library pihak ketiga
    // (recharts/d3, xlsx, dst.) ke chunk vendor tersendiri demi bundle awal yang
    // lebih kecil. Ternyata itu memicu DUA jenis crash "halaman blank total" yang
    // berbeda di produksi:
    // 1. xlsx dipisah chunk -> src/lib/export-guard.ts (dan >10 halaman lain) yang
    //    melakukan `import * as XLSX from 'xlsx'` lalu menimpa XLSX.writeFile jadi
    //    memutasi ES module namespace object asli lintas-chunk yang read-only di
    //    browser -> "Assignment to constant variable" saat boot.
    // 2. recharts/d3 dipisah ke 'vendor-charts' -> circular-dependency/TDZ issue
    //    antar chunk hasil Rollup -> "Cannot access 'S' before initialization"
    //    saat boot.
    // Karena manualChunks kustom di sini terus memunculkan crash baru setiap
    // library dipisah manual (butuh audit dependency graph tiap library satu per
    // satu untuk aman), untuk sekarang bundling dikembalikan ke default Vite/Rollup
    // (otomatis, tanpa manualChunks kustom). Code-splitting per halaman via
    // React.lazy() di routing tetap jalan seperti biasa. Kalau mau optimasi bundle
    // vendor lagi nanti, lakukan satu library dalam satu waktu + full regression
    // test tiap kali, jangan sekaligus banyak seperti sebelumnya.
  },
}));
