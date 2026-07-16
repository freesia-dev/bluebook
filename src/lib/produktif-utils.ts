import type { MLFRow } from '@/hooks/use-mlf-data';

/**
 * Nomor loan (l0lnno) untuk 5 PK dengan format lama "BPD-TLH" tapi sebenarnya milik Unit Meranti.
 * Tambahkan di sini jika ada penambahan/pengurangan whitelist.
 */
export const MERANTI_OVERRIDE_L0LNNO = new Set<string>([
  '14306737', // SULIS - 087/886/59/6500/BPD-TLH/2023
  '14306741', // BAHARUDDIN - 101/886/59/6500/BPD-TLH/2023
  '14306742', // TASNADI - 102/886/59/1171/BPD-TLH/2023
  '14306744', // YANA - 113/886/59/8900/BPD-TLH/2023
  '14306753', // WINDI - 004/886/59/1160/BPD-TLH/2024
]);

export type UnitKredit = 'telihan' | 'meranti' | 'unknown';

export const UNIT_LABEL: Record<UnitKredit, string> = {
  telihan: 'Telihan',
  meranti: 'Meranti',
  unknown: 'Tanpa Unit',
};

/** Tentukan unit berdasarkan whitelist l0lnno lalu pola l0narr. */
export const getUnit = (row: MLFRow): UnitKredit => {
  if (row.l0lnno && MERANTI_OVERRIDE_L0LNNO.has(row.l0lnno)) return 'meranti';
  const narr = (row.l0narr || '').toUpperCase();
  if (narr.includes('/ULM-TLH/')) return 'meranti';
  if (narr.includes('/BPD-TLH/')) return 'telihan';
  return 'unknown';
};

/** Kredit produktif = Modal Kerja atau Investasi (dari kolom group2 MLF). */
export const isProduktif = (row: MLFRow): boolean => {
  const g = (row.group2 || '').toLowerCase();
  return g === 'kredit modal kerja' || g === 'kredit investasi';
};

export const jenisProduktif = (row: MLFRow): 'Modal Kerja' | 'Investasi' | '-' => {
  const g = (row.group2 || '').toLowerCase();
  if (g === 'kredit modal kerja') return 'Modal Kerja';
  if (g === 'kredit investasi') return 'Investasi';
  return '-';
};

/** Jangka waktu dalam bulan = selisih bulan antara date (mulai) dan date1 (jatuh tempo). */
export const getJangkaWaktuBulan = (row: any): number => {
  const start = row.date ? new Date(row.date) : null;
  const end = row.date1 ? new Date(row.date1) : null;
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  // tambahkan hitungan hari sisa agar lebih akurat pada bulan sebagian
  const dayDiff = end.getDate() - start.getDate();
  const totalMonths = months + (dayDiff >= 15 ? 1 : 0);
  return Math.max(0, totalMonths);
};

/** Angsuran pokok per bulan = plafon / jangka waktu (bulan). 0 kalau tidak bisa dihitung. */
export const getAngsuranPokok = (row: MLFRow): number => {
  const pla = Number(row.pla) || 0;
  const jw = getJangkaWaktuBulan(row);
  if (jw <= 0) return 0;
  return Math.round(pla / jw);
};
