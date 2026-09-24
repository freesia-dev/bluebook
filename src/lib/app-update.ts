// Utilitas update aplikasi (web & PWA) tanpa user perlu hapus cache manual.
//
// Dua lapis:
// 1. Service worker (vite-plugin-pwa) — sudah otomatis polling & reload
//    lewat <PWAUpdatePrompt />.
// 2. Lapis cadangan di file ini: membandingkan ID build yang tertanam di
//    bundle (__APP_BUILD_ID__) dengan /version.json di server (selalu fresh,
//    no-store). Kalau beda → ada versi baru, dan forceUpdateAndReload() bisa
//    memasangnya dengan bersih (update SW, hapus cache, reload).

import { muatUlangUntukVersiBaru } from '@/lib/app-refresh';

export const CURRENT_BUILD_ID: string =
  typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';
export const CURRENT_BUILT_AT: string =
  typeof __APP_BUILT_AT__ !== 'undefined' ? __APP_BUILT_AT__ : '';

export interface RemoteVersion {
  build: string;
  builtAt?: string;
}

/** Ambil info versi terbaru dari server. null kalau gagal (offline, dev, dsb). */
export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    // Kalau file belum ada, _redirects Cloudflare mengembalikan index.html (bukan JSON)
    if (!ct.includes('json')) return null;
    const data = (await res.json()) as RemoteVersion;
    return data && typeof data.build === 'string' ? data : null;
  } catch {
    return null;
  }
}

export type UpdateCheckResult =
  | { status: 'update-available'; remote: RemoteVersion }
  | { status: 'up-to-date'; remote: RemoteVersion }
  | { status: 'unknown' };

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  // Minta service worker cek juga (kalau ada) — tidak menunggu hasilnya.
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    regs?.forEach((r) => r.update().catch(() => {}));
  } catch {
    /* noop */
  }
  const remote = await fetchRemoteVersion();
  if (!remote) return { status: 'unknown' };
  if (remote.build !== CURRENT_BUILD_ID) return { status: 'update-available', remote };
  return { status: 'up-to-date', remote };
}

let updating = false;

/**
 * Pasang versi terbaru lalu muat ulang halaman yang sedang dibuka.
 *
 * CATATAN PENTING (pernah jadi bug): jangan menghapus cache atau melepas
 * service worker di sini. Versi lama fungsi ini menghapus semua cache lalu
 * reload — termasuk precache milik service worker yang baru saja terpasang —
 * sehingga setelah reload tidak ada berkas yang bisa dilayani dan halaman
 * gagal muat. Di browser alamatnya harus diketik ulang, di PWA aplikasinya
 * harus di-force close. Cukup minta versi baru aktif, tunggu ia mengambil
 * alih halaman, lalu muat ulang. Pembersihan cache lama sudah ditangani
 * workbox lewat cleanupOutdatedCaches.
 */
export async function forceUpdateAndReload(): Promise<void> {
  if (updating) return;
  updating = true;

  const withTimeout = <T,>(p: Promise<T>, ms: number) =>
    Promise.race([p, new Promise<undefined>((r) => setTimeout(() => r(undefined), ms))]);

  let ambilAlih: Promise<unknown> = Promise.resolve();

  try {
    if ('serviceWorker' in navigator) {
      ambilAlih = withTimeout(
        new Promise<void>((resolve) =>
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }),
        ),
        6000,
      );
      const regs = await withTimeout(navigator.serviceWorker.getRegistrations(), 3000);
      if (regs) {
        await withTimeout(Promise.all(regs.map((r) => r.update().catch(() => {}))), 5000);
        regs.forEach((r) => {
          try {
            r.waiting?.postMessage({ type: 'SKIP_WAITING' });
          } catch {
            /* noop */
          }
        });
      }
    }
  } catch {
    /* noop */
  }

  await ambilAlih;

  if (!muatUlangUntukVersiBaru('tombol perbarui ditekan')) {
    // Baru saja muat ulang — paksa sekali lagi supaya tombolnya tidak terasa mati
    window.location.replace(window.location.pathname + window.location.search);
  }
}

/** Format waktu build untuk ditampilkan, mis. "22 Sep 2026, 14.05". */
export function formatBuildTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
