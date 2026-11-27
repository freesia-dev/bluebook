// Tanya Bluebook — bentuk jawaban yang digambar oleh komponen Jawaban.

export type Nada = 'hijau' | 'kuning' | 'merah' | 'jingga' | 'biru' | 'abu';

export interface Lencana {
  teks: string;
  nada: Nada;
}

export interface Kolom {
  kunci: string;
  label: string;
  /** cara menampilkan isi sel */
  jenis?: 'teks' | 'uang' | 'tanggal' | 'angka' | 'persen' | 'kol' | 'lencana' | 'nama';
  /** tetap tampil di layar HP (kolom lain disembunyikan) */
  hp?: boolean;
  /** teks kecil di bawah isi sel, diambil dari kunci lain */
  sub?: string;
}

export interface Ringkas {
  label: string;
  nilai: string;
  nada?: Nada;
}

export interface JawabTabel {
  tipe: 'tabel';
  judul: string;
  angkaUtama?: string;
  keterangan?: string;
  ringkas?: Ringkas[];
  kolom: Kolom[];
  baris: Record<string, unknown>[];
  catatan?: string[];
  /** nama berkas saat diunduh (tanpa ekstensi) */
  namaFile: string;
  kosong?: string;
}

export interface KreditProfil {
  l0lnno: string | null;
  nomorPk: string | null;
  produk: string | null;
  jenis: string;
  unit: string;
  akad: string | null;
  jatuhTempo: string | null;
  plafon: number;
  baki: number;
  kol: number;
  tunggakan: number;
  angsuranPokok: number;
  tanggalBayar: number | null;
  ao: string | null;
  status: 'aktif' | 'lunas';
}

export interface MapProfil {
  kode: string;
  lokasi: string;
  status: string;
  nada: Nada;
}

export interface JawabProfil {
  tipe: 'profil';
  nama: string;
  ringkasan: string;
  totalBaki: number;
  kredit: KreditProfil[];
  map: MapProfil[];
  noHp: string | null;
  catatan: string[];
}

export interface JawabNpl {
  tipe: 'npl';
  judul: string;
  npl: number;
  bermasalah: number;
  dasar: number;
  debiturBermasalah: number;
  perKol: { kol: number; baki: number; debitur: number }[];
  banding?: { label: string; npl: number };
  catatan?: string[];
}

export interface JawabSimulasi {
  tipe: 'simulasi';
  sebelum: { npl: number; bermasalah: number; dasar: number };
  sesudah: { npl: number; bermasalah: number; dasar: number };
  unitLabel: string;
  perubahan: { nama: string; ket: string; sebelum: string; sesudah: string; nadaSesudah: Nada }[];
  saran?: string;
}

export interface JawabPilih {
  tipe: 'pilih';
  teks: string;
  opsi: { label: string; sub: string; kirim: string }[];
}

export interface JawabTeks {
  tipe: 'teks';
  judul?: string;
  teks: string;
  saran?: string[];
}

export type Jawaban = JawabTabel | JawabProfil | JawabNpl | JawabSimulasi | JawabPilih | JawabTeks;

export interface HasilTanya {
  /** potongan "Bluebook mengartikan: …" */
  paham: string[];
  jawab: Jawaban;
  /** langkah simulasi yang sudah dicocokkan namanya — dipakai untuk skenario bertumpuk */
  simulasi?: { langkah: import('./perintah').Skenario[]; unit: import('./perintah').UnitTanya };
}

// ------------------------------------------------------------------ format
export const rp = (n: number | null | undefined) => {
  const x = Number(n) || 0;
  if (x === 0) return 'Rp 0';
  const neg = x < 0 ? '-' : '';
  const a = Math.abs(x);
  if (a >= 1e9) return `${neg}Rp ${(a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `${neg}Rp ${(a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (a >= 1e3) return `${neg}Rp ${(a / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `${neg}Rp ${a.toLocaleString('id-ID')}`;
};

export const persen = (n: number, d = 2) => `${n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const tgl = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${BLN[d.getMonth()]} ${d.getFullYear()}`;
};

const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const tglHari = (s: string) => {
  const d = new Date(`${s.slice(0, 10)}T00:00:00`);
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BLN[d.getMonth()]}`;
};

export const nadaKol = (k: number): Nada => (k <= 0 ? 'abu' : k === 1 ? 'hijau' : k === 2 ? 'kuning' : 'merah');
export const nadaNpl = (n: number): Nada => (n < 2 ? 'hijau' : n < 5 ? 'jingga' : 'merah');
