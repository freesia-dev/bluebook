/**
 * WhatsApp utilities — phone normalization, template rendering, wa.me URL builder.
 */

export const normalizePhoneID = (input: string | null | undefined): string => {
  if (!input) return '';
  let s = String(input).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('0')) s = '62' + s.slice(1);
  if (s.startsWith('8')) s = '62' + s;
  return s;
};

export const isValidPhoneID = (input: string | null | undefined): boolean => {
  const n = normalizePhoneID(input);
  return /^62\d{8,14}$/.test(n);
};

export const formatPhoneDisplay = (n: string | null | undefined): string => {
  const s = normalizePhoneID(n);
  if (!s) return '-';
  // 62 812 3456 7890
  return s.replace(/^(62)(\d{3})(\d{4})(\d+)$/, '+$1 $2 $3 $4');
};

const fmtIDRPlain = (n: number): string => {
  if (!n) return 'Rp 0';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

export interface TemplateData {
  nama?: string | null;
  no_rek?: string | null;
  kol?: number | null;
  produk?: string | null;
  baki?: number | null;
  tungpk?: number | null;
  tungbg?: number | null;
  tunggakan?: number | null;
  ao?: string | null;
}

export const TEMPLATE_PLACEHOLDERS = [
  { key: 'nama', desc: 'Nama debitur' },
  { key: 'no_rek', desc: 'Nomor rekening' },
  { key: 'kol', desc: 'Kolektibilitas (1-5)' },
  { key: 'produk', desc: 'Nama produk kredit' },
  { key: 'baki', desc: 'Outstanding (Rp)' },
  { key: 'tungpk', desc: 'Tunggakan pokok (Rp)' },
  { key: 'tungbg', desc: 'Tunggakan bunga (Rp)' },
  { key: 'tunggakan', desc: 'Total tunggakan (Rp)' },
  { key: 'ao', desc: 'AO / Petugas' },
];

export const renderTemplate = (tpl: string, data: TemplateData): string => {
  const map: Record<string, string> = {
    nama: data.nama || '-',
    no_rek: data.no_rek || '-',
    kol: data.kol != null ? String(data.kol) : '-',
    produk: data.produk || '-',
    baki: fmtIDRPlain(Number(data.baki) || 0),
    tungpk: fmtIDRPlain(Number(data.tungpk) || 0),
    tungbg: fmtIDRPlain(Number(data.tungbg) || 0),
    tunggakan: fmtIDRPlain(Number(data.tunggakan) || 0),
    ao: data.ao || '-',
  };
  return tpl.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
};

export const buildWAUrl = (noHp: string, pesan: string): string => {
  const n = normalizePhoneID(noHp);
  return `https://wa.me/${n}?text=${encodeURIComponent(pesan)}`;
};

export const SAMPLE_PREVIEW_DATA: TemplateData = {
  nama: 'BUDI SANTOSO',
  no_rek: '0050201001234',
  kol: 3,
  produk: 'KMG MULTIGUNA',
  baki: 125000000,
  tungpk: 3500000,
  tungbg: 875000,
  tunggakan: 4375000,
  ao: 'PETUGAS01',
};
