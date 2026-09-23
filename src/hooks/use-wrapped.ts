// Rangkuman setahun untuk "Bluebook Wrapped".
//
// Hampir semua angkanya dihitung dari data yang memang sudah ada:
//   - activity_log      → berapa kali menambah/mengubah/menghapus, di modul apa,
//                         bulan tersibuk, hari & jam favorit
//   - loan_simulation   → jumlah simulasi & total plafon yang dihitung
//   - app_event         → pemakaian Ctrl+K dan hari-hari membuka Bluebook
//                         (tabel baru, lihat supabase/manual/2026-09-23_wrapped_events.sql)
//
// Semua kueri dibatasi tahun berjalan dan hanya mengambil kolom yang dipakai,
// supaya ringan. Kalau salah satu sumber gagal (mis. app_event belum dibuat),
// bagian itu saja yang kosong — halaman tetap tampil.
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getTableLabel } from '@/hooks/use-activity-log';

const BATAS_BARIS = 20000;

export interface WrappedData {
  tahun: number;
  nama: string;
  /** Jumlah perubahan data oleh user ini sepanjang tahun */
  totalAktivitas: number;
  /** Jumlah perubahan data oleh SEMUA orang (konteks tingkat kantor) */
  totalAktivitasKantor: number;
  /** Modul paling sering disentuh, urut dari terbanyak */
  modulTeratas: { label: string; jumlah: number }[];
  /** Jumlah per bulan (indeks 0 = Januari) */
  perBulan: number[];
  bulanTersibuk: { nama: string; jumlah: number } | null;
  /** Jumlah per hari dalam seminggu (0 = Minggu) */
  perHari: number[];
  hariFavorit: { nama: string; jumlah: number } | null;
  jamFavorit: { jam: number; jumlah: number } | null;
  simulasi: { jumlah: number; totalPlafon: number; plafonTerbesar: number };
  commandPalette: number;
  hariAktif: number;
  runtutanTerpanjang: number;
  /** true kalau memang belum ada apa-apa untuk dirangkum */
  kosong: boolean;
}

const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Runtutan hari berturut-turut terpanjang dari daftar tanggal (yyyy-mm-dd). */
function hitungRuntutan(tanggal: string[]): number {
  const unik = Array.from(new Set(tanggal)).sort();
  let terbaik = 0;
  let berjalan = 0;
  let sebelumnya: number | null = null;
  for (const t of unik) {
    const hari = Math.floor(new Date(t + 'T00:00:00').getTime() / 86400000);
    berjalan = sebelumnya !== null && hari - sebelumnya === 1 ? berjalan + 1 : 1;
    sebelumnya = hari;
    if (berjalan > terbaik) terbaik = berjalan;
  }
  return terbaik;
}

const puncak = <T,>(arr: number[], buat: (i: number, n: number) => T): T | null => {
  let idx = -1;
  let maks = 0;
  arr.forEach((n, i) => {
    if (n > maks) {
      maks = n;
      idx = i;
    }
  });
  return idx < 0 ? null : buat(idx, maks);
};

export function useWrapped(namaUser: string, tahun = new Date().getFullYear()) {
  return useQuery<WrappedData>({
    queryKey: ['wrapped', namaUser, tahun],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const awal = `${tahun}-01-01T00:00:00.000Z`;
      const akhir = `${tahun + 1}-01-01T00:00:00.000Z`;
      const aman = async <T,>(p: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
        try {
          const { data, error } = await p;
          if (error) return [];
          return (data ?? []) as T[];
        } catch {
          return [];
        }
      };

      const [aktivitas, simulasi, kejadian] = await Promise.all([
        aman<{ user_name: string | null; table_name: string; created_at: string }>(
          (supabase as any)
            .from('activity_log')
            .select('user_name, table_name, created_at')
            .gte('created_at', awal)
            .lt('created_at', akhir)
            .limit(BATAS_BARIS),
        ),
        aman<{ created_by_nama: string | null; plafon: number; created_at: string }>(
          (supabase as any)
            .from('loan_simulation')
            .select('created_by_nama, plafon, created_at')
            .gte('created_at', awal)
            .lt('created_at', akhir)
            .limit(BATAS_BARIS),
        ),
        aman<{ jenis: string; created_at: string }>(
          (supabase as any)
            .from('app_event')
            .select('jenis, created_at')
            .gte('created_at', awal)
            .lt('created_at', akhir)
            .limit(BATAS_BARIS),
        ),
      ]);

      const milikku = aktivitas.filter((a) => (a.user_name ?? '') === namaUser);

      const perBulan = new Array(12).fill(0);
      const perHari = new Array(7).fill(0);
      const perJam = new Array(24).fill(0);
      const perModul = new Map<string, number>();
      milikku.forEach((a) => {
        const d = new Date(a.created_at);
        if (Number.isNaN(d.getTime())) return;
        perBulan[d.getMonth()] += 1;
        perHari[d.getDay()] += 1;
        perJam[d.getHours()] += 1;
        perModul.set(a.table_name, (perModul.get(a.table_name) ?? 0) + 1);
      });

      const simulasiku = simulasi.filter((s) => (s.created_by_nama ?? '') === namaUser);
      const plafonku = simulasiku.map((s) => Number(s.plafon) || 0);

      const commandPalette = kejadian.filter((k) => k.jenis === 'command_palette').length;
      const tanggalBuka = kejadian.filter((k) => k.jenis === 'buka_harian').map((k) => k.created_at.slice(0, 10));

      const totalAktivitas = milikku.length;

      return {
        tahun,
        nama: namaUser,
        totalAktivitas,
        totalAktivitasKantor: aktivitas.length,
        modulTeratas: Array.from(perModul.entries())
          .map(([t, jumlah]) => ({ label: getTableLabel(t), jumlah }))
          .sort((a, b) => b.jumlah - a.jumlah)
          .slice(0, 3),
        perBulan,
        bulanTersibuk: puncak(perBulan, (i, n) => ({ nama: NAMA_BULAN[i], jumlah: n })),
        perHari,
        hariFavorit: puncak(perHari, (i, n) => ({ nama: NAMA_HARI[i], jumlah: n })),
        jamFavorit: puncak(perJam, (i, n) => ({ jam: i, jumlah: n })),
        simulasi: {
          jumlah: simulasiku.length,
          totalPlafon: plafonku.reduce((a, b) => a + b, 0),
          plafonTerbesar: plafonku.length ? Math.max(...plafonku) : 0,
        },
        commandPalette,
        hariAktif: new Set(tanggalBuka).size,
        runtutanTerpanjang: hitungRuntutan(tanggalBuka),
        kosong: totalAktivitas === 0 && simulasiku.length === 0 && tanggalBuka.length === 0,
      };
    },
  });
}
