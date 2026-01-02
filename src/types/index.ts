// User Role type (for role management)
export interface UserRole {
  id: string;
  userId: string;
  role: 'admin' | 'user';
  email?: string;
}

// Surat Masuk types
export interface SuratMasuk {
  id: string;
  nomor: number;
  nomorAgenda: string;
  kodeSurat: string;
  nomorSuratMasuk: string;
  namaPengirim: string;
  perihal: string;
  tujuanDisposisi: string;
  status: 'Belum Disposisi' | 'Sudah Disposisi';
  keterangan: string;
  userInput: string;
  fileUrl?: string;
  tanggalMasuk: Date;
  createdAt: Date;
}

// Agenda Kredit (menu baru - mirip surat masuk)
export interface AgendaKreditEntry {
  id: string;
  nomor: number;
  nomorAgenda: string; // format: XXX/YYYY
  kodeSurat: string;
  nomorSuratMasuk: string;
  namaPengirim: string;
  perihal: string;
  tujuanDisposisi: string;
  status: 'Belum Disposisi' | 'Sudah Disposisi';
  keterangan: string;
  userInput: string;
  fileUrl?: string;
  tanggalMasuk: Date;
  createdAt: Date;
}

// Surat Keluar types
export interface SuratKeluar {
  id: string;
  nomor: number;
  nomorAgenda: string;
  kodeSurat: string;
  namaPenerima: string;
  perihal: string;
  tujuanSurat: string;
  status: 'Belum Dikirim' | 'Sudah Dikirim';
  keterangan: string;
  userInput: string;
  fileUrl?: string;
  tanggal?: Date;
  createdAt: Date;
}

// SPPK types
export interface SPPK {
  id: string;
  nomor: number;
  nomorSPPK: string;
  namaDebitur: string;
  jenisKredit: string;
  plafon: number;
  jangkaWaktu: string;
  marketing: 'BAP' | 'NON BAP' | string;
  type: 'telihan' | 'meranti';
  tanggal?: Date;
  createdAt: Date;
}

// PK types
export interface PK {
  id: string;
  nomor: number;
  nomorPK: string;
  namaDebitur: string;
  jenisKredit: string;
  plafon: number;
  jangkaWaktu: string;
  jenisDebitur: string;
  jenisPenggunaan: string;
  sektorEkonomi: string;
  type: 'telihan' | 'meranti';
  tanggal?: Date;
  createdAt: Date;
}

// Jenis Penggunaan type
export interface JenisPenggunaan {
  id: string;
  kode: string;
  keterangan: string;
}

// KK & MPAK types
export interface KKMPAK {
  id: string;
  nomor: number;
  nomorKK: string;
  nomorMPAK: string;
  namaDebitur: string;
  jenisKredit: string;
  plafon: number;
  jangkaWaktu: string;
  jenisDebitur: string;
  kodeFasilitas: string;
  sektorEkonomi: string;
  type: 'telihan' | 'meranti';
  tanggal?: Date;
  createdAt: Date;
}

// Nomor Loan types
export interface NomorLoan {
  id: string;
  nomor: number;
  nomorLoan: string;
  namaDebitur: string;
  nomorPK: string;
  jenisKredit: string;
  produkKredit: string;
  plafon: number;
  jangkaWaktu: string;
  skema: string;
  unitKerja: string;
  pkId?: string;
  tanggal?: Date;
  createdAt: Date;
}

// Config types
export interface JenisKredit {
  id: string;
  nama: string;
  produkKredit: string;
}

export interface JenisDebitur {
  id: string;
  kode: string;
  keterangan: string;
}

export interface KodeFasilitas {
  id: string;
  kode: string;
  keterangan: string;
}

export interface SektorEkonomi {
  id: string;
  kode: string;
  keterangan: string;
}

// Kode Surat
export interface KodeSurat {
  kategori: string;
  uraian: string;
  kode: string;
}

export const KODE_SURAT_LIST: KodeSurat[] = [
  { kategori: 'Pemegang Saham & Pengurus', uraian: 'Pemegang Saham Prioritas (Mayoritas)', kode: 'A-1' },
  { kategori: 'Pemegang Saham & Pengurus', uraian: 'Pemegang Saham Biasa', kode: 'A-2' },
  { kategori: 'Pemegang Saham & Pengurus', uraian: 'Dewan Pegawai', kode: 'A-3' },
  { kategori: 'Pemegang Saham & Pengurus', uraian: 'Dewan Direksi', kode: 'A-4' },
  { kategori: 'Pemerintah Pusat', uraian: 'Presiden & Wakil Presiden', kode: 'B-1' },
  { kategori: 'Pemerintah Pusat', uraian: 'Kementrian Republik Indonesia', kode: 'B-2' },
  { kategori: 'Pemerintah Pusat', uraian: 'Lembaga-Lembaga Negara', kode: 'B-3' },
  { kategori: 'Pemerintah Pusat', uraian: 'Bank Indonesia & Perbankan Nasional', kode: 'B-4' },
  { kategori: 'Pemerintah Pusat', uraian: 'TNI & POLRI', kode: 'B-5' },
  { kategori: 'Pemerintah Daerah', uraian: 'Gubernur, Walikota & Bupati', kode: 'C-1' },
  { kategori: 'Pemerintah Daerah', uraian: 'Sekertariat Daerah, Badan & Dinas', kode: 'C-2' },
  { kategori: 'Pemerintah Daerah', uraian: 'Lembaga Daerah', kode: 'C-3' },
  { kategori: 'Nasabah', uraian: 'Nasabah Kredit', kode: 'D-1' },
  { kategori: 'Nasabah', uraian: 'Nasabah Giro', kode: 'D-2' },
  { kategori: 'Nasabah', uraian: 'Nasabah Tabungan', kode: 'D-3' },
  { kategori: 'Nasabah', uraian: 'Nasabah Deposito', kode: 'D-4' },
  { kategori: 'Umum Lainnya', uraian: 'Perusahaan', kode: 'E-1' },
  { kategori: 'Umum Lainnya', uraian: 'Lembaga Pendidikan', kode: 'E-2' },
  { kategori: 'Umum Lainnya', uraian: 'Asosiasi & Perhimpunan', kode: 'E-3' },
  { kategori: 'Umum Lainnya', uraian: 'Organisasi Kemasyarakatan', kode: 'E-4' },
  { kategori: 'Umum Lainnya', uraian: 'Organisasi Keagamaan', kode: 'E-5' },
  { kategori: 'Umum Lainnya', uraian: 'Organisasi Kemahasiswaan', kode: 'E-6' },
  { kategori: 'Umum Lainnya', uraian: 'Perorangan', kode: 'E-7' },
  { kategori: 'Umum Lainnya', uraian: 'Kepanitiaan', kode: 'E-8' },
  { kategori: 'Intern BPD Kaltim Kaltara', uraian: 'Pegawai', kode: 'F-1' },
  { kategori: 'Intern BPD Kaltim Kaltara', uraian: 'Edaran & Pengumuman', kode: 'F-2' },
  { kategori: 'Intern BPD Kaltim Kaltara', uraian: 'Divisi Kantor Cab. & Unit Kerja Lainnya', kode: 'F-3' },
  { kategori: 'Pengumuman & Siaran ke Eksternal', uraian: 'Edaran & Pengumuman Perbankan', kode: 'G-1' },
  { kategori: 'Pengumuman & Siaran ke Eksternal', uraian: 'Pelanggan', kode: 'G-2' },
];
