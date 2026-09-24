import { useEffect, useRef } from "react";
import { isPwaEnabled } from "@/lib/pwa-registration";
import { muatUlangUntukVersiBaru } from "@/lib/app-refresh";

/**
 * Pemasang versi baru yang berjalan diam-diam.
 *
 * Sebelumnya bagian ini memunculkan dialog "Memperbarui Bluebook…" dengan
 * bilah progres, menghapus seluruh cache, lalu reload — dan justru itu yang
 * membuat halaman gagal muat sesudahnya (cache precache milik service worker
 * baru ikut terhapus). Sekarang urusannya diserahkan ke service worker:
 * begitu versi baru selesai dipasang dan mengambil alih halaman, Bluebook
 * hanya memuat ulang alamat yang sedang dibuka. Tidak ada dialog, tidak ada
 * cache yang dihapus, dan pengguna tetap berada di halaman yang sama.
 *
 * Komponen ini tidak menggambar apa pun.
 */
export const PWAUpdatePrompt = () => {
  const sudahJalan = useRef(false);

  useEffect(() => {
    if (!isPwaEnabled || !("serviceWorker" in navigator)) return;

    let idPoll: number | undefined;
    let batal = false;

    const pasangVersiBaru = (pekerjaBaru: ServiceWorker | null) => {
      if (sudahJalan.current) return;
      sudahJalan.current = true;

      // Versi baru diminta langsung aktif; begitu ia mengambil alih halaman,
      // barulah halaman dimuat ulang — jadi berkas yang diminta pasti sudah ada.
      const lanjut = () => muatUlangUntukVersiBaru("service worker versi baru aktif");
      navigator.serviceWorker.addEventListener("controllerchange", lanjut, { once: true });

      try {
        pekerjaBaru?.postMessage({ type: "SKIP_WAITING" });
      } catch {
        /* noop */
      }

      // Jaring aman: kalau controllerchange tidak pernah datang (mis. SKIP_WAITING
      // tidak terdengar), muat ulang sendiri setelah beberapa detik.
      window.setTimeout(() => {
        if (!batal) lanjut();
      }, 8000);
    };

    navigator.serviceWorker.ready.then((registration) => {
      if (batal) return;
      if (registration.waiting) pasangVersiBaru(registration.waiting);

      registration.addEventListener("updatefound", () => {
        const baru = registration.installing;
        if (!baru) return;
        baru.addEventListener("statechange", () => {
          // Hanya kalau sudah ada controller — kalau belum, ini pemasangan pertama
          // (belum pernah ada versi lama), tidak perlu muat ulang apa pun.
          if (baru.state === "installed" && navigator.serviceWorker.controller) {
            pasangVersiBaru(baru);
          }
        });
      });

      idPoll = window.setInterval(() => registration.update().catch(() => {}), 60_000);
    });

    return () => {
      batal = true;
      if (idPoll) window.clearInterval(idPoll);
    };
  }, []);

  return null;
};
