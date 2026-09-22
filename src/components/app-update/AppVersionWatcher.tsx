import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { checkForAppUpdate, forceUpdateAndReload } from '@/lib/app-update';

const CHECK_INTERVAL_MS = 5 * 60_000;
const FIRST_CHECK_DELAY_MS = 15_000;

/**
 * Lapis cadangan pengecek versi (di luar service worker). Kalau server sudah
 * punya build lebih baru dari yang sedang berjalan, tampilkan notifikasi
 * dengan tombol "Perbarui" — satu klik, tanpa perlu hapus cache manual.
 * Sengaja tidak auto-reload supaya isian form yang belum disimpan aman.
 */
export const AppVersionWatcher = () => {
  const notifiedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    let stopped = false;

    const run = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      const res = await checkForAppUpdate();
      if (stopped || res.status !== 'update-available') return;
      if (notifiedFor.current === res.remote.build) return;
      notifiedFor.current = res.remote.build;
      toast('Versi baru Bluebook tersedia', {
        description: 'Klik Perbarui untuk memasang — tidak perlu hapus cache.',
        duration: Infinity,
        action: { label: 'Perbarui', onClick: () => void forceUpdateAndReload() },
      });
    };

    const first = window.setTimeout(run, FIRST_CHECK_DELAY_MS);
    const interval = window.setInterval(run, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
};

export default AppVersionWatcher;
