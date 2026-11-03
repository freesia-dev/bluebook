import type { MLFRow } from '@/hooks/use-mlf-data';
import { getAngsuranPokok, isProduktif } from '@/lib/produktif-utils';

/* -------------------------------------------------------------------------- */
/*  Pemetaan portofolio MLF ke segmen Laporan Pipeline kantor pusat            */
/*                                                                            */
/*  Portal Weekly Pipeline meminta angka per produk berikut:                  */
/*    Segmen Mikro    : a. Mikro KUR (Inc. Kecil KUR)                         */
/*                      b. Mikro Non KUR                                      */
/*    Segmen Kecil    : Modal Kerja, Investasi                                */
/*    Segmen Konsumen : Multiguna, KPR, Pembiayaan Karyawan                   */
/*                                                                            */
/*  Aturan yang dipakai (dari penjelasan KCP Telihan):                        */
/*  - Kredit produktif dikenali dari group2 (Kredit Modal Kerja / Investasi).  */
/*  - KUR memakai bunga sliding, non-KUR anuitas. Jadi produktif dengan        */
/*    lytitl bertuliskan SLIDING dihitung KUR, yang ANUITAS bukan KUR.         */
/*  - Batas Mikro dan Kecil ada di plafon 100 juta: sampai dengan 100 juta     */
/*    masuk Mikro, di atasnya Kecil. Berlaku untuk KUR maupun non-KUR.         */
/*  - Kecil KUR tetap dihitung terpisah di sini supaya komposisinya kelihatan, */
/*    tetapi saat mengisi portal digabung ke baris "Mikro KUR (Inc. Kecil      */
/*    KUR)" — lihat BARIS_PORTAL di bawah.                                     */
/*  - Selain produktif dianggap Konsumen, dipecah dari nama produknya.         */
/* -------------------------------------------------------------------------- */

export type KodeProduk =
  | 'mikro_kur'
  | 'kecil_kur'
  | 'mikro_non_kur'
  | 'kecil_mk'
  | 'kecil_inv'
  | 'konsumen_multiguna'
  | 'konsumen_kpr'
  | 'konsumen_karyawan';

export type KodeSegmen = 'mikro' | 'kecil' | 'konsumen';

export const BATAS_MIKRO_DEFAULT = 100_000_000;

export const PRODUK_LABEL: Record<KodeProduk, string> = {
  mikro_kur: 'Mikro KUR',
  kecil_kur: 'Kecil KUR',
  mikro_non_kur: 'Mikro Non KUR',
  kecil_mk: 'Kecil — Modal Kerja',
  kecil_inv: 'Kecil — Investasi',
  konsumen_multiguna: 'Konsumen — Multiguna',
  konsumen_kpr: 'Konsumen — KPR',
  konsumen_karyawan: 'Konsumen — Pembiayaan Karyawan',
};

export const SEGMEN_LABEL: Record<KodeSegmen, string> = {
  mikro: 'Kredit Mikro',
  kecil: 'Kredit Kecil',
  konsumen: 'Kredit Konsumen',
};

export const SEGMEN_DARI_PRODUK: Record<KodeProduk, KodeSegmen> = {
  mikro_kur: 'mikro',
  kecil_kur: 'mikro', // ikut baris Mikro KUR di portal
  mikro_non_kur: 'mikro',
  kecil_mk: 'kecil',
  kecil_inv: 'kecil',
  konsumen_multiguna: 'konsumen',
  konsumen_kpr: 'konsumen',
  konsumen_karyawan: 'konsumen',
};

/**
 * Baris persis seperti di portal Weekly Pipeline, beserta produk Bluebook yang
 * dijumlahkan ke dalamnya. Inilah yang disalin ke portal.
 */
export const BARIS_PORTAL: { segmen: KodeSegmen; label: string; produk: KodeProduk[] }[] = [
  { segmen: 'mikro', label: 'a. Mikro KUR (Inc. Kecil KUR)', produk: ['mikro_kur', 'kecil_kur'] },
  { segmen: 'mikro', label: 'b. Mikro Non KUR', produk: ['mikro_non_kur'] },
  { segmen: 'kecil', label: 'a. Modal Kerja', produk: ['kecil_mk'] },
  { segmen: 'kecil', label: 'b. Investasi', produk: ['kecil_inv'] },
  { segmen: 'konsumen', label: 'a. Multiguna', produk: ['konsumen_multiguna'] },
  { segmen: 'konsumen', label: 'b. KPR', produk: ['konsumen_kpr'] },
  { segmen: 'konsumen', label: 'c. Pembiayaan Karyawan', produk: ['konsumen_karyawan'] },
];

export const URUTAN_PRODUK: KodeProduk[] = [
  'mikro_kur',
  'kecil_kur',
  'mikro_non_kur',
  'kecil_mk',
  'kecil_inv',
  'konsumen_multiguna',
  'konsumen_kpr',
  'konsumen_karyawan',
];

/** KUR memakai bunga sliding; non-KUR anuitas. */
export const isKUR = (row: Pick<MLFRow, 'lytitl'>): boolean =>
  /SLIDING/i.test(row.lytitl || '');

const produkKonsumen = (lytitl: string): KodeProduk => {
  const s = lytitl.toUpperCase();
  if (/\bKPR\b|GRIYA|RUMAH|PEMILIKAN RUMAH/.test(s)) return 'konsumen_kpr';
  if (/KARYAWAN|PEGAWAI/.test(s)) return 'konsumen_karyawan';
  return 'konsumen_multiguna';
};

/**
 * Tentukan produk portal untuk satu baris MLF.
 * `batasMikro` bisa diubah kalau ketentuan plafonnya berubah.
 */
export const produkPipeline = (
  row: Pick<MLFRow, 'lytitl' | 'group2' | 'pla'>,
  batasMikro: number = BATAS_MIKRO_DEFAULT,
): KodeProduk => {
  const plafon = Number(row.pla) || 0;
  const mikro = plafon <= batasMikro;

  if (!isProduktif(row as MLFRow)) return produkKonsumen(row.lytitl || '');

  if (isKUR(row)) return mikro ? 'mikro_kur' : 'kecil_kur';
  if (mikro) return 'mikro_non_kur';

  const g = (row.group2 || '').toLowerCase();
  return g === 'kredit investasi' ? 'kecil_inv' : 'kecil_mk';
};

/**
 * Produk portal untuk satu baris Riwayat Simulasi Kalkulator Kredit.
 *
 * Simulasi konsumtif — termasuk kredit PNS — masuk segmen Konsumen, dipecah
 * dari nama produknya. Simulasi produktif memakai aturan yang sama dengan MLF:
 * skema sliding berarti KUR, anuitas berarti bukan. Simulasi tidak menyimpan
 * pembedaan Modal Kerja dan Investasi, jadi produktif non-KUR di atas batas
 * mikro ditaruh di Modal Kerja; pindahkan lewat rencana manual bila perlu.
 */
export const produkSimulasi = (
  s: { segmen?: string | null; skema?: string | null; plafon: number; product_nama?: string | null },
  batasMikro: number = BATAS_MIKRO_DEFAULT,
): KodeProduk => {
  const plafon = Number(s.plafon) || 0;
  const mikro = plafon <= batasMikro;

  if ((s.segmen || 'konsumtif') === 'konsumtif') return produkKonsumen(s.product_nama || '');

  const kur = /sliding/i.test(s.skema || '');
  if (kur) return mikro ? 'mikro_kur' : 'kecil_kur';
  return mikro ? 'mikro_non_kur' : 'kecil_mk';
};

/* -------------------------------------------------------------------------- */
/*  Tanggal angsuran                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Tanggal berapa dalam sebulan debitur ini mengangsur.
 *
 * Sumber utama kolom tglbyrak dari berkas MLF. Untuk baris lama yang diunggah
 * sebelum kolom itu disimpan, dipakai tanggal mulai kredit sebagai perkiraan —
 * angsuran biasanya jatuh pada tanggal yang sama tiap bulan.
 */
export const tanggalAngsuran = (
  row: Pick<MLFRow, 'tglbyrak' | 'date'>,
): { hari: number | null; perkiraan: boolean } => {
  const dari = (v?: string | null) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.getUTCDate();
  };
  const pasti = dari(row.tglbyrak);
  if (pasti !== null) return { hari: pasti, perkiraan: false };
  const kira = dari(row.date);
  return { hari: kira, perkiraan: kira !== null };
};

/** Angsuran pokok sebulan — dipakai sebagai nilai Run Off. */
export const runOffBulanan = (row: MLFRow): number => getAngsuranPokok(row);

/* -------------------------------------------------------------------------- */
/*  Minggu                                                                    */
/* -------------------------------------------------------------------------- */

export interface Minggu {
  nomor: number;
  mulai: string; // yyyy-MM-dd
  selesai: string; // yyyy-MM-dd
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Bagi satu bulan menjadi beberapa minggu yang berakhir pada hari tertentu.
 *
 * Contoh di panduan kantor pusat (November 2026) berakhir tiap hari Rabu:
 * 01–04, 05–11, 12–18, 19–25, 26–30. Karena itu hari Rabu jadi bawaan, tapi
 * tiap tanggal tetap bisa diubah sendiri di halaman laporan.
 */
export const mingguBawaan = (tahun: number, bulan0: number, hariTutup = 3): Minggu[] => {
  const awal = new Date(Date.UTC(tahun, bulan0, 1));
  const akhir = new Date(Date.UTC(tahun, bulan0 + 1, 0));
  const hasil: Minggu[] = [];
  let mulai = awal;

  while (mulai <= akhir) {
    // maju sampai ketemu hari tutup
    let selesai = new Date(mulai);
    while (selesai.getUTCDay() !== hariTutup && selesai < akhir) {
      selesai = new Date(selesai.getTime() + 86400000);
    }
    if (selesai > akhir) selesai = akhir;
    hasil.push({ nomor: hasil.length + 1, mulai: iso(mulai), selesai: iso(selesai) });
    mulai = new Date(selesai.getTime() + 86400000);
  }

  return hasil;
};

/** Apakah tanggal (yyyy-MM-dd) berada di dalam rentang minggu. */
export const dalamMinggu = (tanggal: string | null | undefined, m: Minggu): boolean =>
  !!tanggal && tanggal >= m.mulai && tanggal <= m.selesai;

/**
 * Apakah angsuran yang jatuh pada tanggal `hari` tiap bulan mengenai minggu ini.
 * Rentang minggu bisa melewati pergantian bulan, jadi dicek hari demi hari.
 */
export const angsuranKenaMinggu = (hari: number | null, m: Minggu): boolean => {
  if (!hari) return false;
  const mulai = new Date(`${m.mulai}T00:00:00Z`);
  const selesai = new Date(`${m.selesai}T00:00:00Z`);
  for (let d = new Date(mulai); d <= selesai; d = new Date(d.getTime() + 86400000)) {
    const akhirBulan = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    // Tanggal 31 pada bulan 30 hari dianggap jatuh di hari terakhir bulan itu
    const hariEfektif = Math.min(hari, akhirBulan);
    if (d.getUTCDate() === hariEfektif) return true;
  }
  return false;
};
