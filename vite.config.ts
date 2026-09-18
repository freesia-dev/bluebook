import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
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
    rollupOptions: {
      output: {
        // Pisahkan library pihak ketiga yang berat ke chunk vendor tersendiri.
        // Rollup sudah otomatis memisahkan sebagian (lihat chunk BarChart/PieChart
        // hasil code-splitting recharts per halaman lazy-load), tapi manualChunks
        // di sini memastikan library besar (chart, export Excel/PDF, tanggal) tidak
        // ikut tercampur ke bundle utama dan bisa di-cache terpisah oleh browser
        // karena jarang berubah dibanding kode aplikasi sendiri.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          // xlsx SENGAJA TIDAK dipisah manual ke chunk sendiri. Alasan: src/lib/export-guard.ts
          // dan lebih dari selusin halaman (ConfigPage, AuditPublicPage, KreditProduktifPage,
          // LaporanBulananPage, RiwayatPage, halaman-halaman CS, dst.) semuanya melakukan
          // `import * as XLSX from 'xlsx'` lalu export-guard.ts menimpa XLSX.writeFile satu
          // kali secara global untuk memaksa guard permission export di seluruh app. Begitu
          // xlsx dipaksa jadi chunk terpisah, import namespace lintas-chunk itu menjadi ES
          // module namespace object asli yang read-only di browser (bukan lagi objek CJS
          // interop biasa yang bisa ditimpa), sehingga penimpaan `XLSX.writeFile = ...` throw
          // "Assignment to constant variable" saat modul dievaluasi (boot time) dan membuat
          // seluruh app blank. Karena xlsx tidak punya default export di build ESM-nya (jadi
          // tidak bisa disiasati dengan default import), dan guard globalnya dipakai banyak
          // halaman tanpa masing-masing punya izin check sendiri, xlsx TIDAK BOLEH dipisah ke
          // manualChunks sampai guard-nya direfactor jadi wrapper terpisah (bukan monkey-patch
          // namespace). xlsx tetap lazy untuk beberapa jalur export via dynamic import('xlsx')
          // di src/lib/export.ts, tapi halaman-halaman lain masih static-import xlsx sehingga
          // ukurannya ikut ke chunk masing-masing/entry utama — trade-off yang lebih aman
          // daripada app blank total.
          if (id.includes('jspdf') || id.includes('html2canvas')) return 'vendor-pdf';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('date-fns')) return 'vendor-date';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) return 'vendor-react';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          return undefined;
        },
      },
    },
  },
}));
