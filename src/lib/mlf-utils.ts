export const fmtIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtNum = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);

export const KOL_LABEL: Record<number, string> = {
  0: 'Ekstrakomtabel',
  1: 'Lancar',
  2: 'DPK',
  3: 'Kurang Lancar',
  4: 'Diragukan',
  5: 'Macet',
};

export const KOL_COLOR: Record<number, string> = {
  0: '#64748b',
  1: '#22c55e',
  2: '#eab308',
  3: '#f97316',
  4: '#ef4444',
  5: '#991b1b',
};

// Display label for KOL value (0 -> "E")
export const kolDisplay = (k: number | null | undefined): string => {
  const n = Number(k) || 0;
  return n === 0 ? 'E' : String(n);
};

// Parse date from filename like "mlf_13-05-2026.xls" -> "2026-05-13"
export const parseDateFromFilename = (filename: string): string | null => {
  const m = filename.match(/(\d{1,2})[-_](\d{1,2})[-_](\d{4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const dd = d.padStart(2, '0');
  const mm = mo.padStart(2, '0');
  return `${y}-${mm}-${dd}`;
};
