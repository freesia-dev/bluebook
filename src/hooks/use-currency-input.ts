import { formatNominal, formatRupiah } from '@/lib/uang';

/* -------------------------------------------------------------------------- */
/*  Format isian nominal saat diketik                                          */
/*                                                                            */
/*  Semua kolom uang di Bluebook memakai aturan yang sama: pemisah ribuan       */
/*  titik muncul otomatis sambil mengetik, koma jadi pemisah desimal, dan       */
/*  begitu kursor pindah angkanya dirapikan ke dua desimal penuh.              */
/*                                                                            */
/*  Biasanya dipakai lewat <InputNominal> (src/components/ui/input-nominal.tsx) */
/*  supaya perilakunya tidak perlu diulang di tiap halaman.                    */
/* -------------------------------------------------------------------------- */

const pisahRibuan = (angkaBulat: string): string => {
  const bersih = angkaBulat.replace(/^0+(?=\d)/, '');
  if (!bersih) return '';
  return bersih.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Format teks yang sedang diketik. Titik dianggap pemisah ribuan (diabaikan),
 * koma dianggap pemisah desimal. Desimal yang baru setengah diketik ("10.000,"
 * atau "10.000,2") dibiarkan apa adanya supaya kursor tidak melompat —
 * perapian ke dua desimal dilakukan rapikanNominalInput() saat kolom dilepas.
 */
export const formatCurrencyInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';

  // Angka (mis. mengisi ulang form dari data tersimpan) langsung diformat penuh
  if (typeof value === 'number') {
    return Number.isFinite(value) ? formatNominal(value) : '';
  }

  // Angka mentah yang datang sebagai teks — kolom numeric di Supabase dibaca
  // sebagai string ("150000000.00"), begitu juga String(1000.5). Titik di situ
  // pemisah desimal, bukan pemisah ribuan. Aman dibedakan karena teks hasil
  // formatter ini selalu berkelompok tiga angka, jadi tidak pernah berbentuk
  // "…​.5" atau "….00".
  if (/^-?\d+\.\d{1,2}$/.test(value.trim())) {
    return formatNominal(Number.parseFloat(value.trim()));
  }

  const bersih = value.replace(/[^\d,]/g, '');
  const [bulat, ...sisa] = bersih.split(',');
  const adaKoma = sisa.length > 0;
  const desimal = sisa.join('').slice(0, 2);
  const depan = pisahRibuan(bulat);
  if (!adaKoma) return depan;
  return `${depan || '0'},${desimal}`;
};

/** Rapikan jadi dua desimal penuh: "500" → "500,00", "" tetap kosong. */
export const rapikanNominalInput = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
  const angka = parseCurrencyValue(value);
  if (typeof value === 'string' && value.replace(/[^\d]/g, '') === '') return '';
  return formatNominal(angka);
};

/**
 * Teks isian → angka, sen ikut terbawa. Kolom uang di database sudah
 * numeric(18,2) (lihat supabase/manual/2026-09-24_nominal_dua_desimal.sql),
 * jadi nilai pecahan memang disimpan apa adanya.
 */
export const parseCurrencyValue = (formatted: string | number | null | undefined): number => {
  if (formatted === null || formatted === undefined || formatted === '') return 0;
  if (typeof formatted === 'number') return Number.isFinite(formatted) ? formatted : 0;
  const bersih = formatted.replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Number.parseFloat(bersih);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/** Untuk kolom yang memang harus bilangan bulat (jumlah lembar, dsb). */
export const parseCurrencyBulat = (formatted: string | number | null | undefined): number =>
  Math.round(parseCurrencyValue(formatted));

/** Tampilan dengan simbol mata uang — selalu dua angka desimal. */
export const formatCurrencyDisplay = (value: number): string => formatRupiah(value);
