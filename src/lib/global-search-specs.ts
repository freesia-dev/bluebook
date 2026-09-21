// Skema pencarian data lintas modul, dipakai bareng oleh GlobalSearch
// (kotak cari di header) dan CommandPalette (Ctrl+K, command bar utama).
// Diekstrak ke sini supaya keduanya nyari dari sumber data yang sama persis,
// bukan dua definisi yang bisa saling nggak sinkron.
import {
  Mail, Send, CreditCard, FileText,
  Users, Wallet, Landmark, Phone, PiggyBank, Calculator, Repeat, Shield, BarChart3,
} from 'lucide-react';

export type Row = Record<string, any>;

export interface SearchSpec {
  table: string;
  module: string;
  icon: React.ElementType;
  href: string | ((r: Row) => string);
  badgeColor: string;
  /** kolom teks yang dicari */
  cols: string[];
  title: (r: Row) => string;
  subtitle: (r: Row) => string;
  /** halaman mendukung ?edit=<id> */
  editable?: boolean;
}

export interface SearchResult {
  id: string;
  recordId: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  href: string;
  badgeColor: string;
  editable: boolean;
  record: Row;
}

const rp = (v: any) => (v === null || v === undefined || v === '' ? '-' : `Rp ${Number(v).toLocaleString('id-ID')}`);

export const SEARCH_SPECS: SearchSpec[] = [
  {
    table: 'surat_masuk', module: 'Surat Masuk', icon: Mail, href: '/surat-masuk',
    badgeColor: 'bg-blue-500/10 text-blue-600', editable: true,
    cols: ['nama_pengirim', 'perihal', 'nomor_agenda', 'nomor_surat_masuk', 'kode_surat', 'tujuan_disposisi'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_pengirim}`,
  },
  {
    table: 'surat_keluar', module: 'Surat Keluar', icon: Send, href: '/surat-keluar',
    badgeColor: 'bg-green-500/10 text-green-600', editable: true,
    cols: ['nama_penerima', 'perihal', 'nomor_agenda', 'kode_surat', 'tujuan_surat'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_penerima}`,
  },
  {
    table: 'agenda_kredit_entry', module: 'Agenda Kredit', icon: FileText, href: '/agenda-kredit/agenda-kredit',
    badgeColor: 'bg-indigo-500/10 text-indigo-600', editable: true,
    cols: ['nama_pengirim', 'perihal', 'nomor_agenda', 'nomor_surat_masuk'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_pengirim}`,
  },
  {
    table: 'sppk', module: 'SPPK', icon: CreditCard,
    href: (r) => `/agenda-kredit/sppk-${r.type}`,
    badgeColor: 'bg-purple-500/10 text-purple-600', editable: true,
    cols: ['nama_debitur', 'nomor_sppk', 'jenis_kredit', 'marketing'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_sppk} • ${rp(r.plafon)}`,
  },
  {
    table: 'pk', module: 'PK', icon: FileText,
    href: (r) => `/agenda-kredit/pk-${r.type}`,
    badgeColor: 'bg-orange-500/10 text-orange-600', editable: true,
    cols: ['nama_debitur', 'nomor_pk', 'jenis_kredit', 'sektor_ekonomi'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_pk} • ${rp(r.plafon)}`,
  },
  {
    table: 'kkmpak', module: 'KK/MPAK', icon: CreditCard,
    href: (r) => (r.type === 'telihan' ? '/agenda-kredit/kk-mpak-telihan' : '/agenda-kredit/agenda-mpak-meranti'),
    badgeColor: 'bg-teal-500/10 text-teal-600', editable: true,
    cols: ['nama_debitur', 'nomor_kk', 'nomor_mpak', 'jenis_kredit'],
    title: (r) => r.nama_debitur, subtitle: (r) => `KK: ${r.nomor_kk} • MPAK: ${r.nomor_mpak}`,
  },
  {
    table: 'nomor_loan', module: 'Nomor Loan', icon: Landmark, href: '/agenda-kredit/nomor-loan',
    badgeColor: 'bg-cyan-500/10 text-cyan-600', editable: true,
    cols: ['nomor_loan', 'nama_debitur', 'nomor_pk', 'jenis_kredit', 'unit_kerja'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_loan} • ${rp(r.plafon)}`,
  },
  {
    table: 'loan_simulation', module: 'Simulasi Kredit', icon: Calculator, href: '/kalkulator/riwayat',
    badgeColor: 'bg-sky-500/10 text-sky-600',
    cols: ['nama_debitur', 'nomor_ktp', 'instansi', 'nama_ao', 'product_nama'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.product_nama || r.segmen} • ${rp(r.plafon)}`,
  },
  {
    table: 'cs_cif', module: 'CIF Nasabah', icon: Users, href: '/cs/cif',
    badgeColor: 'bg-violet-500/10 text-violet-600',
    cols: ['cif', 'nama'],
    title: (r) => r.nama, subtitle: (r) => `CIF ${r.cif}`,
  },
  {
    table: 'cs_rekening', module: 'Rekening', icon: Wallet,
    href: (r) => `/cs/rekening/${String(r.produk).replace('_', '-')}`,
    badgeColor: 'bg-emerald-500/10 text-emerald-600',
    cols: ['nomor_rekening', 'nama', 'cif'],
    title: (r) => r.nama, subtitle: (r) => `${r.nomor_rekening} • ${r.produk}`,
  },
  {
    table: 'cs_bilyet_deposito', module: 'Bilyet Deposito', icon: PiggyBank, href: '/cs/bilyet-deposito',
    badgeColor: 'bg-amber-500/10 text-amber-600',
    cols: ['nomor_bilyet', 'nama', 'cif'],
    title: (r) => r.nama, subtitle: (r) => `${r.nomor_bilyet} • ${rp(r.nominal)}`,
  },
  {
    table: 'cs_si', module: 'Standing Instruction', icon: Repeat, href: '/cs/si',
    badgeColor: 'bg-lime-500/10 text-lime-700',
    cols: ['kode_si', 'nama_nasabah', 'rekening_debet', 'rekening_kredit'],
    title: (r) => r.nama_nasabah || r.kode_si, subtitle: (r) => `${r.kode_si} • ${rp(r.nominal)}`,
  },
  {
    table: 'call_memo_penagihan', module: 'Call Memo', icon: Phone, href: '/monitoring/dashboard',
    badgeColor: 'bg-rose-500/10 text-rose-600',
    cols: ['nama_debitur', 'l0lnno', 'no_hp', 'no_rek', 'petugas_penagih'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.l0lnno || '-'} • ${rp(r.total_tunggakan)}`,
  },
  {
    table: 'debitur_kontak', module: 'Kontak Debitur', icon: Phone, href: '/monitoring/kontak',
    badgeColor: 'bg-pink-500/10 text-pink-600',
    cols: ['l0lnno', 'nama', 'no_hp'],
    title: (r) => r.nama || r.l0lnno, subtitle: (r) => `${r.l0lnno} • ${r.no_hp || '-'}`,
  },
  {
    table: 'proyeksi_kredit', module: 'Proyeksi Kredit', icon: BarChart3, href: '/monitoring/kredit-produktif',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600',
    cols: ['nama_debitur', 'unit', 'jenis_kredit'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.unit} • ${rp(r.plafon)}`,
  },
  {
    table: 'security_shift', module: 'Log Security', icon: Shield, href: '/security/log',
    badgeColor: 'bg-slate-500/10 text-slate-600',
    cols: ['nama_petugas', 'shift', 'serah_terima_ke_nama'],
    title: (r) => r.nama_petugas, subtitle: (r) => `${r.tanggal} • Shift ${r.shift}`,
  },
];

export const SEARCH_LABELS: Record<string, string> = {
  nomor_agenda: 'Nomor Agenda', kode_surat: 'Kode Surat', nomor_surat_masuk: 'Nomor Surat Masuk',
  nama_pengirim: 'Nama Pengirim', nama_penerima: 'Nama Penerima', perihal: 'Perihal',
  tujuan_disposisi: 'Tujuan Disposisi', tujuan_surat: 'Tujuan Surat', status: 'Status',
  keterangan: 'Keterangan', user_input: 'User Input', nama_debitur: 'Nama Debitur',
  jenis_kredit: 'Jenis Kredit', plafon: 'Plafon', jangka_waktu: 'Jangka Waktu',
  jenis_debitur: 'Jenis Debitur', jenis_penggunaan: 'Jenis Penggunaan', sektor_ekonomi: 'Sektor Ekonomi',
  nomor_sppk: 'Nomor SPPK', nomor_pk: 'Nomor PK', nomor_kk: 'Nomor KK', nomor_mpak: 'Nomor MPAK',
  kode_fasilitas: 'Kode Fasilitas', marketing: 'Marketing', tanggal: 'Tanggal', tanggal_masuk: 'Tanggal Masuk',
  nomor_loan: 'Nomor Loan', unit_kerja: 'Unit Kerja', produk_kredit: 'Produk Kredit', skema: 'Skema',
  cif: 'CIF', nama: 'Nama', nomor_rekening: 'Nomor Rekening', produk: 'Produk', nominal: 'Nominal',
  nomor_bilyet: 'Nomor Bilyet', kode_si: 'Kode SI', rekening_debet: 'Rekening Debet',
  rekening_kredit: 'Rekening Kredit', l0lnno: 'Nomor Loan', no_hp: 'No. HP', no_rek: 'No. Rekening',
  total_tunggakan: 'Total Tunggakan', petugas_penagih: 'Petugas Penagih', unit: 'Unit',
  nama_petugas: 'Nama Petugas', shift: 'Shift', segmen: 'Segmen', product_nama: 'Produk',
  tenor_bulan: 'Tenor (bulan)', nama_ao: 'AO', instansi: 'Instansi', pekerjaan: 'Pekerjaan',
  gaji: 'Gaji', nomor_ktp: 'Nomor KTP', pipeline_status: 'Status Pipeline',
};

export const SEARCH_HIDDEN_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'user_id', 'nomor', 'nomor_urut',
  'cif_id', 'pk_id', 'product_id', 'upload_id', 'penyelesaian_id', 'pengisian_atm_id',
]);

export const formatSearchValue = (key: string, v: any) => {
  if (typeof v === 'number') return v > 999 ? v.toLocaleString('id-ID') : String(v);
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return String(v);
};

export const escapeSearchTerm = (q: string) => q.replace(/[,%()]/g, ' ').trim();
