import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/export-guard";
import { initializePwa, isPwaEnabled } from "./lib/pwa-registration";
import { pasangHurufBesarAwal } from "./components/FontSizeToggle";
import { pasangPenjagaChunk } from "./lib/app-refresh";

initializePwa();

// Pasang pilihan ukuran huruf sebelum React render, supaya tidak ada kedipan
pasangHurufBesarAwal();

// Berkas halaman (chunk) yang hilang setelah deploy baru ditangani di satu
// tempat — lihat src/lib/app-refresh.ts.
pasangPenjagaChunk();

createRoot(document.getElementById("root")!).render(<App />);

// Pengecekan versi baru: minta service worker mengecek saat aplikasi dibuka,
// saat kembali ke layar, dan saat koneksi pulih. Pemasangannya sendiri berjalan
// diam-diam lewat <PWAUpdatePrompt />.
if (isPwaEnabled && "serviceWorker" in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    const cek = () => reg.update().catch(() => {});
    cek();
    setInterval(cek, 60_000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") cek();
    });
    window.addEventListener("focus", cek);
    window.addEventListener("online", cek);
  });
}
