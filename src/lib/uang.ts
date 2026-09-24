/* -------------------------------------------------------------------------- */
/*  Satu tempat untuk semua format nominal uang di Bluebook                    */
/*                                                                            */
/*  Aturannya satu: nominal uang selalu ditulis dengan pemisah ribuan titik    */
/*  dan dua angka desimal — 10.000.000,22 dan 10.000.000,00. Dulu setiap       */
/*  modul punya formatternya sendiri (ada yang tanpa desimal, ada yang pakai   */
/*  style: 'currency' sehingga spasi setelah "Rp" jadi spasi tak-putus dan     */
/*  bikin baris angka susah dibaca di HP), jadi tampilannya beda-beda antar    */
/*  halaman. Semua formatter lama sekarang menunjuk ke sini.                   */
/* -------------------------------------------------------------------------- */

const PEMFORMAT = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Angka apa pun jadi angka yang aman diformat (null/NaN/'' → 0). */
const keAngka = (nilai: unknown): number => {
  const n = typeof nilai === 'number' ? nilai : Number(nilai);
  return Number.isFinite(n) ? n : 0;
};

/** 10000000.22 → "10.000.000,22" (tanpa "Rp"). */
export const formatNominal = (nilai: unknown): string => PEMFORMAT.format(keAngka(nilai));

/** 10000000.22 → "Rp 10.000.000,22". Spasi biasa, bukan spasi tak-putus. */
export const formatRupiah = (nilai: unknown): string => `Rp ${formatNominal(nilai)}`;

/**
 * Untuk tabel/daftar: nilai kosong ditulis "-" supaya beda dengan nol.
 */
export const formatRupiahAtauStrip = (nilai: unknown): string =>
  nilai === null || nilai === undefined || nilai === '' ? '-' : formatRupiah(nilai);

/**
 * Nominal ringkas untuk ruang sempit (kartu statistik, sumbu grafik):
 * 1.234.567.890 → "1,23 M". Tetap pakai gaya Indonesia (koma desimal).
 */
export const formatNominalRingkas = (nilai: unknown): string => {
  const n = keAngka(nilai);
  const besar = Math.abs(n);
  const ringkas = (pembagi: number, satuan: string, desimal: number) =>
    `${(n / pembagi).toLocaleString('id-ID', {
      minimumFractionDigits: desimal,
      maximumFractionDigits: desimal,
    })} ${satuan}`;
  if (besar >= 1e12) return ringkas(1e12, 'T', 2);
  if (besar >= 1e9) return ringkas(1e9, 'M', 2);
  if (besar >= 1e6) return ringkas(1e6, 'jt', 1);
  if (besar >= 1e3) return ringkas(1e3, 'rb', 0);
  return formatNominal(n);
};

/** Versi ringkas dengan "Rp" di depan. */
export const formatRupiahRingkas = (nilai: unknown): string => `Rp ${formatNominalRingkas(nilai)}`;

/** Bilangan biasa (lembar, baris, hari) — pemisah ribuan, tanpa desimal. */
export const formatAngka = (nilai: unknown): string =>
  keAngka(nilai).toLocaleString('id-ID', { maximumFractionDigits: 0 });
