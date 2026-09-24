import { formatNominal, formatRupiah } from '@/lib/uang';

/* -------------------------------------------------------------------------- */
/*  Format isian nominal saat diketik                                          */
/*                                                                            */
/*  Semua field nominal di Bluebook memakai fungsi ini supaya pemisah ribuan   */
/*  muncul otomatis ("10000000" → "10.000.000") tanpa pengguna mengetik titik. */
/*                                                                            */
/*  Sebagian kolom di database masih bilangan bulat (BIGINT), jadi desimal     */
/*  tidak dinyalakan di semua field — kalau dinyalakan padahal kolomnya bulat, */
/*  simpanan justru gagal. Field yang kolomnya numeric (Bilyet Deposito,       */
/*  Standing Instruction) memanggilnya dengan opsi { desimal: true } sehingga   */
/*  sen benar-benar tersimpan.                                                 */
/* -------------------------------------------------------------------------- */

export interface OpsiIsianNominal {
  /** Izinkan koma desimal (maksimal 2 angka). Default: tidak. */
  desimal?: boolean;
}

const pisahRibuan = (angkaBulat: string): string => {
  const bersih = angkaBulat.replace(/^0+(?=\d)/, '');
  if (!bersih) return '';
  return bersih.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Format teks yang sedang diketik pengguna. Titik dianggap pemisah ribuan
 * (diabaikan), koma dianggap pemisah desimal. Desimal yang sedang setengah
 * diketik ("10.000," atau "10.000,2") sengaja dibiarkan apa adanya supaya
 * kursor tidak melompat — pembulatan ke dua angka baru terjadi saat disimpan.
 */
export const formatCurrencyInput = (
  value: string | number | null | undefined,
  opsi: OpsiIsianNominal = {},
): string => {
  if (value === null || value === undefined || value === '') return '';

  // Angka (mis. saat mengisi ulang form dari data tersimpan) langsung diformat
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    if (opsi.desimal) return formatNominal(value);
    return pisahRibuan(String(Math.round(Math.abs(value)) * (value < 0 ? -1 : 1)).replace('-', ''));
  }

  if (!opsi.desimal) {
    const digit = value.replace(/\D/g, '');
    return pisahRibuan(digit);
  }

  const bersih = value.replace(/[^\d,]/g, '');
  const [bulat, ...sisa] = bersih.split(',');
  const adaKoma = sisa.length > 0;
  const desimal = sisa.join('').slice(0, 2);
  const depan = pisahRibuan(bulat);
  if (!adaKoma) return depan;
  return `${depan || '0'},${desimal}`;
};

/**
 * Teks isian → angka bulat rupiah. Dipakai untuk kolom BIGINT: kalau pengguna
 * mengetik sen, nilainya dibulatkan ke rupiah terdekat.
 */
export const parseCurrencyValue = (formatted: string | number | null | undefined): number =>
  Math.round(parseCurrencyDecimal(formatted));

/** Teks isian → angka dengan sen utuh. Untuk kolom numeric. */
export const parseCurrencyDecimal = (formatted: string | number | null | undefined): number => {
  if (formatted === null || formatted === undefined || formatted === '') return 0;
  if (typeof formatted === 'number') return Number.isFinite(formatted) ? formatted : 0;
  const bersih = formatted.replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Number.parseFloat(bersih);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/** Tampilan dengan simbol mata uang — selalu dua angka desimal. */
export const formatCurrencyDisplay = (value: number): string => formatRupiah(value);
