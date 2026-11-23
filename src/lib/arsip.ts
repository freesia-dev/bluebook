// Aturan dan bantuan murni untuk menu Arsip & Khasanah.
// Tidak menyentuh jaringan — semua hook ada di src/hooks/use-arsip.ts.

import type { BerkasArsip, PinjamArsip, RekeningMaster } from '@/hooks/use-arsip';

/* ------------------------------------------------------------------ ruang */

export type Ruang = 'berkas' | 'khasanah';

/** Kabinet berkas kredit B1–B5 dan khasanah J1–J2, masing-masing 4 laci. */
export const KABINET: Record<Ruang, number[]> = { berkas: [1, 2, 3, 4, 5], khasanah: [1, 2] };
export const LACI_PER_KABINET = [1, 2, 3, 4];

/** Perkiraan daya tampung satu laci (map). Dipakai untuk bilah isi & peringatan penuh. */
export const KAPASITAS_LACI = 55;

export const kodeLaci = (ruang: Ruang, kabinet: number, laci: number) =>
  `${ruang === 'berkas' ? 'B' : 'J'}${kabinet}.${laci}`;

export const semuaLaci = (ruang: Ruang) =>
  KABINET[ruang].flatMap((k) => LACI_PER_KABINET.map((l) => kodeLaci(ruang, k, l)));

export const urai = (kode: string) => {
  const m = /^([BJ])(\d+)\.(\d+)$/.exec(kode);
  if (!m) return null;
  return { ruang: (m[1] === 'B' ? 'berkas' : 'khasanah') as Ruang, kabinet: Number(m[2]), laci: Number(m[3]) };
};

export const namaKabinet = (kode: string) => {
  const u = urai(kode);
  if (!u) return kode;
  return `${u.ruang === 'berkas' ? 'Kabinet' : 'Khasanah'} ${u.kabinet}`;
};

export const nomor = (n: number) => String(n).padStart(3, '0');

/* ------------------------------------------------------------------ QR */

export const QR_LACI = (kode: string) => `BB-LACI-${kode}`;

export type IsiQR = { jenis: 'map'; kode: string } | { jenis: 'laci'; kode: string } | null;

/** Baca isi QR label: map (BB-M-xxxxxx) atau laci (BB-LACI-B2.2). */
export const bacaQR = (teks: string): IsiQR => {
  const t = teks.trim().toUpperCase();
  const laci = /BB-LACI-([BJ]\d+\.\d+)/.exec(t);
  if (laci) return { jenis: 'laci', kode: laci[1] };
  const map = /BB-M-[A-Z0-9]{6}/.exec(t);
  if (map) return { jenis: 'map', kode: map[0] };
  return null;
};

/* ------------------------------------------------------------------ tanggal */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hariIni = () => isoHari(new Date());

/** Tambah n hari kerja (Senin–Jumat). */
export const tambahHariKerja = (dari: Date, n: number) => {
  const d = new Date(dari.getFullYear(), dari.getMonth(), dari.getDate());
  let sisa = n;
  while (sisa > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) sisa--;
  }
  return d;
};

export const tglPanjang = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
};

export const tglHari = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return `${HARI[d.getDay()]} ${d.getDate()} ${BLN[d.getMonth()]}`;
};

export const jamAtauTanggal = (s: string) => {
  const d = new Date(s);
  const kini = new Date();
  if (isoHari(d) === isoHari(kini)) return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const kemarin = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate() - 1);
  if (isoHari(d) === isoHari(kemarin)) return 'Kemarin';
  return `${d.getDate()} ${BLN[d.getMonth()]}`;
};

/** Selisih hari kalender dari hari ini ke tanggal s (negatif = sudah lewat). */
export const selisihHari = (s: string) => {
  const a = new Date(`${hariIni()}T00:00:00`).getTime();
  const b = new Date(`${s.slice(0, 10)}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
};

export const rupiahPendek = (n: number | null | undefined) => {
  if (!n) return '—';
  if (n >= 1e9) return `Rp ${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (n >= 1e6) return `Rp ${Math.round(n / 1e6).toLocaleString('id-ID')} jt`;
  return `Rp ${n.toLocaleString('id-ID')}`;
};

/* ------------------------------------------------------------------ status */

export type StatusKredit = 'aktif' | 'lunas' | 'topup' | 'tidak_dikenali';
export type StatusFisik = 'tersimpan' | 'dipinjam' | 'terlambat' | 'diserahkan' | 'telusur';

export const LABEL_KREDIT: Record<StatusKredit, string> = {
  aktif: 'Aktif', lunas: 'Lunas', topup: 'Ter-top up', tidak_dikenali: 'Belum pasti',
};
export const LABEL_FISIK: Record<StatusFisik, string> = {
  tersimpan: 'Tersimpan', dipinjam: 'Dipinjam', terlambat: 'Terlambat', diserahkan: 'Diserahkan', telusur: 'Perlu ditelusuri',
};

export interface Konteks {
  masterPerRek: Map<string, RekeningMaster>;
  pinjamTerbuka: Map<string, PinjamArsip>;
  /** no_rekening yang sudah punya akad pengganti (top up) */
  rekTopUp: Set<string>;
}

/** Status kredit terkini: diambil dari MLF terbaru kalau rekeningnya dikenal. */
export const statusKredit = (b: BerkasArsip, k: Konteks): StatusKredit => {
  const r = b.no_rekening ? k.masterPerRek.get(b.no_rekening) : undefined;
  if (r) {
    if (r.status === 'lunas' && k.rekTopUp.has(r.no_rekening)) return 'topup';
    return r.status;
  }
  return b.status_kredit;
};

export const statusFisik = (b: BerkasArsip, k: Konteks): StatusFisik => {
  if (b.diserahkan_at) return 'diserahkan';
  const p = k.pinjamTerbuka.get(b.id);
  if (p) return selisihHari(p.tenggat) < 0 ? 'terlambat' : 'dipinjam';
  if (b.perlu_telusur) return 'telusur';
  return 'tersimpan';
};

/* ------------------------------------------------------------------ kelengkapan */

export const KELENGKAPAN: Record<'produktif' | 'konsumtif' | 'jaminan', string[]> = {
  konsumtif: [
    'Perjanjian kredit (PK)',
    'SPPK & analisis kredit',
    'KTP & KK debitur',
    'SK pengangkatan / slip gaji',
    'Surat kuasa potong gaji',
    'Polis asuransi jiwa kredit',
  ],
  produktif: [
    'Perjanjian kredit (PK)',
    'SPPK & analisis kredit',
    'KTP & KK debitur',
    'Legalitas usaha (NIB/SKU)',
    'Foto usaha & laporan kunjungan',
    'Polis asuransi',
  ],
  jaminan: [
    'Sertifikat / BPKB asli',
    'Akta APHT / fidusia',
    'Polis asuransi agunan',
    'Tanda terima jaminan',
  ],
};

/* ------------------------------------------------------------------ keperluan pinjam */

export const KEPERLUAN = ['Telaah top up', 'Verifikasi', 'Audit', 'Restrukturisasi', 'Penagihan', 'Lainnya'];
