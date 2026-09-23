// Pencatat kejadian pemakaian aplikasi — bahan untuk "Bluebook Wrapped".
//
// Prinsipnya: sekecil dan sesunyi mungkin.
//   - Tidak pernah mencatat data nasabah, cuma jenis kejadian (+ nama halaman).
//   - Dikumpulkan dulu di memori, baru dikirim sekaligus tiap beberapa detik,
//     jadi tidak menambah permintaan jaringan di tengah kerja.
//   - Kalau gagal (offline, tabel belum dibuat, RLS menolak), diam saja. Fitur
//     ini tidak boleh pernah bikin aplikasi error atau terasa lambat.
//
// Tabelnya dibuat lewat supabase/manual/2026-09-23_wrapped_events.sql. Selama
// tabel itu belum ada, semua pencatatan gagal tanpa efek apa pun.
import { supabase } from '@/integrations/supabase/client';

export type JenisKejadian =
  /** Hari pertama kali membuka Bluebook di tanggal tersebut (untuk runtutan hari) */
  | 'buka_harian'
  /** Command bar Ctrl+K dibuka */
  | 'command_palette'
  /** Simulasi kredit disimpan */
  | 'simulasi_simpan'
  /** Hasil diekspor (JPG/Excel/PDF) */
  | 'export';

interface Kejadian {
  jenis: JenisKejadian;
  meta?: Record<string, unknown> | null;
  created_at: string;
}

const JEDA_KIRIM_MS = 5000;
const MAKS_ANTRE = 50;
const KUNCI_HARIAN = 'bluebook-kejadian-harian';

let antre: Kejadian[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let pendengarTerpasang = false;

async function kirim(): Promise<void> {
  if (antre.length === 0) return;
  const batch = antre;
  antre = [];
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return; // belum login → tidak ada yang perlu dicatat
    const nama = (user.user_metadata?.nama as string | undefined) ?? user.email ?? null;
    await (supabase as any).from('app_event').insert(
      batch.map((k) => ({
        user_id: user.id,
        user_nama: nama,
        jenis: k.jenis,
        meta: k.meta ?? null,
        created_at: k.created_at,
      })),
    );
  } catch {
    // Sengaja dibuang: statistik pemakaian tidak sepenting pekerjaan user.
  }
}

function pasangPendengar(): void {
  if (pendengarTerpasang || typeof document === 'undefined') return;
  pendengarTerpasang = true;
  // Halaman ditutup / pindah ke belakang → kirim yang masih tertahan
  const kirimSekarang = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    void kirim();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') kirimSekarang();
  });
  window.addEventListener('pagehide', kirimSekarang);
}

/** Catat satu kejadian. Tidak pernah melempar error, tidak menunggu jaringan. */
export function catatKejadian(jenis: JenisKejadian, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  pasangPendengar();
  if (antre.length >= MAKS_ANTRE) return; // jaga-jaga kalau jaringan lama mati
  antre.push({ jenis, meta: meta ?? null, created_at: new Date().toISOString() });
  if (timer) return;
  timer = setTimeout(() => {
    timer = undefined;
    void kirim();
  }, JEDA_KIRIM_MS);
}

/**
 * Catat "hari ini saya buka Bluebook" — maksimal sekali per tanggal per
 * perangkat. Dipakai untuk menghitung runtutan hari di Wrapped.
 */
export function catatBukaHarian(): void {
  if (typeof window === 'undefined') return;
  const hariIni = new Date().toISOString().slice(0, 10);
  try {
    if (window.localStorage.getItem(KUNCI_HARIAN) === hariIni) return;
    window.localStorage.setItem(KUNCI_HARIAN, hariIni);
  } catch {
    // Tanpa localStorage, paling-paling tercatat lebih dari sekali sehari —
    // tidak fatal, dan tetap dihitung per hari saat Wrapped dirangkum.
  }
  catatKejadian('buka_harian');
}
