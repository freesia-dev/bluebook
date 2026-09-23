// Draf isian form yang tersimpan sendiri di perangkat (localStorage).
//
// Kejadian nyata yang mau dicegah: AO sedang mengisi kalkulator, lalu keluar
// halaman, PWA di-swipe, atau HP-nya mati. Isian yang sudah setengah jalan
// hilang semua. Dengan ini, isiannya disimpan diam-diam di perangkat sendiri
// (tidak dikirim ke server), lalu saat kembali ditawari "Lanjutkan isian tadi?".
import { useEffect, useRef, useState } from 'react';

const PREFIX = 'bluebook-draf:';
const SIMPAN_TIAP_MS = 800;
/** Draf lebih tua dari ini dianggap sudah tidak relevan. */
const KEDALUWARSA_MS = 3 * 24 * 60 * 60 * 1000;

interface DrafTersimpan<T> {
  at: string;
  data: T;
}

export function bacaDraf<T>(key: string): DrafTersimpan<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DrafTersimpan<T>;
    if (!parsed?.at || !parsed?.data) return null;
    if (Date.now() - new Date(parsed.at).getTime() > KEDALUWARSA_MS) {
      window.localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hapusDraf(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* noop */
  }
}

function tulisDraf<T>(key: string, data: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: new Date().toISOString(), data }));
  } catch {
    /* penyimpanan penuh / mode privat — draf memang bonus, jangan sampai bikin error */
  }
}

interface OpsiDraf<T> {
  /** Kunci penyimpanan, mis. 'kalkulator'. */
  key: string;
  /** Nilai form saat ini — disimpan otomatis setiap berubah (didebounce). */
  values: T;
  /** Simpan hanya kalau true (mis. form sudah mulai diisi, dan bukan mode edit). */
  enabled: boolean;
}

interface HasilDraf<T> {
  /** Draf yang ditemukan saat halaman dibuka (null kalau tidak ada). */
  draf: DrafTersimpan<T> | null;
  /** Buang draf dan sembunyikan tawaran. */
  buang: () => void;
  /** Sembunyikan tawaran tanpa menghapus (dipakai setelah dipulihkan). */
  tutup: () => void;
}

/**
 * Menyimpan draf form ke perangkat dan menyediakan draf lama (kalau ada) untuk
 * ditawarkan ke user. Pemulihannya dilakukan pemanggil, karena hanya dia yang
 * tahu cara memasang nilainya kembali ke state masing-masing.
 */
export function useFormDraft<T>({ key, values, enabled }: OpsiDraf<T>): HasilDraf<T> {
  // Draf lama dibaca SEKALI saat mount, sebelum penyimpanan jalan — kalau tidak,
  // draf lama langsung tertimpa form yang masih kosong.
  const [draf, setDraf] = useState<DrafTersimpan<T> | null>(() => (typeof window === 'undefined' ? null : bacaDraf<T>(key)));

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!enabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => tulisDraf(key, values), SIMPAN_TIAP_MS);
    return () => window.clearTimeout(timer.current);
  }, [key, values, enabled]);

  return {
    draf,
    buang: () => {
      hapusDraf(key);
      setDraf(null);
    },
    tutup: () => setDraf(null),
  };
}
