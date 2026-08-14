/** Tema kartu simulasi (JPG & pratinjau) — dapat dikonfigurasi admin. */

export type SimulasiSectionKey =
  | 'header'
  | 'sorotan'
  | 'chips'
  | 'angsuran'
  | 'penghasilan'
  | 'potongan'
  | 'pelunasan'
  | 'dana'
  | 'footer';

export const SECTION_LABELS: Record<SimulasiSectionKey, string> = {
  header: 'Header (Nama Debitur & Bank)',
  sorotan: 'Sorotan (Plafon & Jangka Waktu)',
  chips: 'Chip Ringkas (Skema, Bunga, DSR)',
  angsuran: 'Angsuran per Bulan',
  penghasilan: 'Penghasilan Debitur',
  potongan: 'Rincian Potongan di Muka',
  pelunasan: 'Pelunasan Pinjaman Lama',
  dana: 'Dana Diterima Debitur',
  footer: 'Catatan Kaki & Account Officer',
};

export interface SimulasiTheme {
  /** identitas */
  bankName: string;
  branchName: string;
  title: string;
  footerNote: string;
  /** tipografi */
  fontFamily: string;
  fontScale: number; // 0.8 - 1.4
  /** ukuran */
  cardWidth: number; // px
  padding: number;
  radius: number;
  /** warna */
  bgColor: string;
  cardColor: string;
  inkColor: string;
  subColor: string;
  lineColor: string;
  primaryColor: string;
  primaryColor2: string;
  accentColor: string;
  accentColor2: string;
  successColor: string;
  successColor2: string;
  warnColor: string;
  headerTextColor: string;
  useGradient: boolean;
  /** susunan & visibilitas */
  order: SimulasiSectionKey[];
  hidden: SimulasiSectionKey[];
}

export const DEFAULT_SIMULASI_THEME: SimulasiTheme = {
  bankName: 'Bankaltimtara',
  branchName: 'KCP Telihan',
  title: 'Simulasi Angsuran Kredit',
  footerNote: 'Simulasi — bukan dokumen perjanjian kredit. Nilai dapat berubah sewaktu-waktu.',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontScale: 1,
  cardWidth: 900,
  padding: 36,
  radius: 14,
  bgColor: '#ffffff',
  cardColor: '#f5f7fa',
  inkColor: '#0f172a',
  subColor: '#64748b',
  lineColor: '#e2e8f0',
  primaryColor: '#003f7f',
  primaryColor2: '#1181c4',
  accentColor: '#5b34c7',
  accentColor2: '#8b6ff0',
  successColor: '#047857',
  successColor2: '#10a06b',
  warnColor: '#b45309',
  headerTextColor: '#ffffff',
  useGradient: true,
  order: ['header', 'sorotan', 'chips', 'angsuran', 'penghasilan', 'potongan', 'pelunasan', 'dana', 'footer'],
  hidden: [],
};

export const FONT_OPTIONS = [
  { label: 'Inter (default)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Plus Jakarta Sans', value: '"Plus Jakarta Sans", Inter, sans-serif' },
  { label: 'Georgia (serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Arial / Helvetica', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Roboto Mono', value: '"Roboto Mono", ui-monospace, monospace' },
];

export const SIMULASI_THEME_KEY = 'simulasi_card_theme';

/** Gabungkan nilai tersimpan dengan default agar aman terhadap field baru. */
export function mergeTheme(raw: unknown): SimulasiTheme {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<SimulasiTheme>;
  const order = Array.isArray(v.order) && v.order.length
    ? (v.order.filter((k) => DEFAULT_SIMULASI_THEME.order.includes(k)) as SimulasiSectionKey[])
    : DEFAULT_SIMULASI_THEME.order;
  const missing = DEFAULT_SIMULASI_THEME.order.filter((k) => !order.includes(k));
  return {
    ...DEFAULT_SIMULASI_THEME,
    ...v,
    order: [...order, ...missing],
    hidden: Array.isArray(v.hidden) ? (v.hidden as SimulasiSectionKey[]) : [],
  };
}
