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

/** Judul/label teks tetap di kartu yang bisa diganti admin/user (mis. "Plafon Pengajuan" -> "Plafon Diajukan"). */
export type SimulasiLabelKey =
  | 'sorotan.plafon'
  | 'sorotan.tenor'
  | 'angsuran.title'
  | 'penghasilan.title'
  | 'potongan.title'
  | 'pelunasan.title'
  | 'dana.title';

export const LABEL_DEFAULTS: Record<SimulasiLabelKey, string> = {
  'sorotan.plafon': 'Plafon Pengajuan',
  'sorotan.tenor': 'Jangka Waktu',
  'angsuran.title': 'Angsuran per Bulan',
  'penghasilan.title': 'Penghasilan Debitur',
  'potongan.title': 'Rincian Potongan di Muka',
  'pelunasan.title': 'Pelunasan Pinjaman Lama',
  'dana.title': 'Dana Diterima Debitur',
};

/** Nama field yang ditampilkan di editor untuk tiap SimulasiLabelKey. */
export const LABEL_FIELD_TITLES: Record<SimulasiLabelKey, string> = {
  'sorotan.plafon': 'Judul kartu Plafon',
  'sorotan.tenor': 'Judul kartu Jangka Waktu',
  'angsuran.title': 'Judul kartu Angsuran per Bulan',
  'penghasilan.title': 'Judul kartu Penghasilan Debitur',
  'potongan.title': 'Judul kartu Rincian Potongan',
  'pelunasan.title': 'Judul kartu Pelunasan Pinjaman Lama',
  'dana.title': 'Judul kartu Dana Diterima Debitur',
};

export const LABEL_KEYS = Object.keys(LABEL_DEFAULTS) as SimulasiLabelKey[];

/** Perataan mendatar & tegak isi tiap bagian kartu. */
export type RataMendatar = 'kiri' | 'tengah' | 'kanan';
export type RataTegak = 'atas' | 'tengah' | 'bawah';

export const RATA_MENDATAR_LABEL: Record<RataMendatar, string> = {
  kiri: 'Kiri',
  tengah: 'Tengah',
  kanan: 'Kanan',
};

export const RATA_TEGAK_LABEL: Record<RataTegak, string> = {
  atas: 'Atas',
  tengah: 'Tengah',
  bawah: 'Bawah',
};

/**
 * Pengaturan khusus satu bagian kartu. Semua boleh kosong — yang kosong ikut
 * warna/perataan global, jadi tema lama tetap tampil persis seperti sebelumnya.
 */
export interface SimulasiSectionStyle {
  /** Warna utama bagian ini (judul, angka besar, latar blok berwarna). */
  color?: string;
  /** Pasangan gradien untuk warna di atas (kalau gradien dinyalakan). */
  color2?: string;
  /** Warna teks di atas blok berwarna (header & dana diterima). */
  textColor?: string;
  align?: RataMendatar;
  valign?: RataTegak;
}

export interface SimulasiTheme {
  /** identitas */
  bankName: string;
  branchName: string;
  title: string;
  footerNote: string;
  /** tipografi */
  fontFamily: string;
  fontScale: number; // skala global, dikalikan dengan skala per-bagian di bawah
  /** skala tambahan per bagian kartu — masing-masing default 1 (ikut skala global) */
  sectionFontScale: Record<SimulasiSectionKey, number>;
  /** override judul/label teks tetap — key yang tidak diisi memakai LABEL_DEFAULTS */
  labels: Partial<Record<SimulasiLabelKey, string>>;
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
  /**
   * Pengaturan per bagian: warna sendiri dan perataan teks. Dipakai supaya tiap
   * bagian tidak lagi terikat ke satu warna primer/aksen yang sama.
   */
  sectionStyle: Partial<Record<SimulasiSectionKey, SimulasiSectionStyle>>;
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
  sectionFontScale: {
    header: 1,
    sorotan: 1,
    chips: 1,
    angsuran: 1,
    penghasilan: 1,
    potongan: 1,
    pelunasan: 1,
    dana: 1,
    footer: 1,
  },
  labels: {},
  sectionStyle: {},
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
    // Tema lama (sebelum fitur ini) belum punya sectionFontScale sama sekali, atau
    // belum punya entri untuk bagian yang baru ditambahkan — isi dengan default (1)
    // supaya tampilan riwayat simulasi lama tidak berubah sampai user mengatur ulang.
    sectionFontScale: {
      ...DEFAULT_SIMULASI_THEME.sectionFontScale,
      ...(v.sectionFontScale && typeof v.sectionFontScale === 'object' ? v.sectionFontScale : {}),
    },
    // Sama seperti sectionFontScale: tema lama belum punya `labels`, isi aman dengan {}
    // supaya getLabel() jatuh ke LABEL_DEFAULTS sampai user mengganti sendiri.
    labels: {
      ...(v.labels && typeof v.labels === 'object' ? v.labels : {}),
    },
    // Tema lama belum punya pengaturan per bagian; kosong berarti "ikut global",
    // jadi kartu yang sudah ada tidak berubah sedikit pun.
    sectionStyle: {
      ...(v.sectionStyle && typeof v.sectionStyle === 'object' ? v.sectionStyle : {}),
    },
  };
}

/** Warna khusus bagian ini kalau diatur, kalau tidak pakai warna global. */
export function warnaBagian(
  theme: Pick<SimulasiTheme, 'sectionStyle'>,
  key: SimulasiSectionKey,
  bidang: 'color' | 'color2' | 'textColor',
  bawaan: string,
): string {
  return theme.sectionStyle?.[key]?.[bidang] || bawaan;
}

/** Nilai CSS untuk perataan mendatar sebuah bagian. */
export function cssRataMendatar(r?: RataMendatar): 'left' | 'center' | 'right' {
  return r === 'tengah' ? 'center' : r === 'kanan' ? 'right' : 'left';
}

/** Nilai CSS flex untuk perataan mendatar (dipakai bagian yang isinya berjajar). */
export function flexRataMendatar(r?: RataMendatar): 'flex-start' | 'center' | 'flex-end' {
  return r === 'tengah' ? 'center' : r === 'kanan' ? 'flex-end' : 'flex-start';
}

/** Nilai CSS flex untuk perataan tegak. */
export function flexRataTegak(r?: RataTegak): 'flex-start' | 'center' | 'flex-end' {
  return r === 'tengah' ? 'center' : r === 'bawah' ? 'flex-end' : 'flex-start';
}

/** Ambil teks label (dengan fallback ke default) — dipakai SimulasiCard supaya tidak hardcode string. */
export function getLabel(theme: Pick<SimulasiTheme, 'labels'>, key: SimulasiLabelKey): string {
  return theme.labels?.[key] || LABEL_DEFAULTS[key];
}
