// Membaca data yang memang sudah "tertulis" di dalam nomor KTP (NIK).
//
// Susunan NIK 16 digit: PP KK CC DDMMYY NNNN
//   PP     = kode provinsi
//   KK     = kode kabupaten/kota
//   CC     = kode kecamatan
//   DDMMYY = tanggal lahir; untuk PEREMPUAN tanggalnya ditambah 40
//   NNNN   = nomor urut
//
// Jadi tanggal lahir dan jenis kelamin bisa diisi otomatis tanpa menebak sama
// sekali — murni hitungan. Nama wilayah tidak ada di dalam NIK, yang ada cuma
// kodenya; di sini kode provinsi seluruh Indonesia dilengkapi, sedangkan nama
// kabupaten/kota baru untuk Kaltim & Kaltara (wilayah kerja KCP Telihan).
// Kalau kodenya belum dikenal, yang ditampilkan kodenya saja — tidak pernah
// menebak-nebak nama daerah.

export const KODE_PROVINSI: Record<string, string> = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'DI Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua',
  '92': 'Papua Barat',
  '93': 'Papua Selatan',
  '94': 'Papua Tengah',
  '95': 'Papua Pegunungan',
  '96': 'Papua Barat Daya',
};

/** Kabupaten/kota Kaltim & Kaltara (4 digit pertama NIK). */
export const KODE_KABKOTA: Record<string, string> = {
  // Kalimantan Timur
  '6401': 'Kab. Paser',
  '6402': 'Kab. Kutai Barat',
  '6403': 'Kab. Kutai Kartanegara',
  '6404': 'Kab. Kutai Timur',
  '6405': 'Kab. Berau',
  '6409': 'Kab. Penajam Paser Utara',
  '6411': 'Kab. Mahakam Ulu',
  '6471': 'Kota Balikpapan',
  '6472': 'Kota Samarinda',
  '6474': 'Kota Bontang',
  // Kalimantan Utara
  '6501': 'Kab. Malinau',
  '6502': 'Kab. Bulungan',
  '6503': 'Kab. Tana Tidung',
  '6504': 'Kab. Nunukan',
  '6571': 'Kota Tarakan',
};

export interface NikInfo {
  /** true kalau 16 digit dan tanggal lahirnya masuk akal */
  valid: boolean;
  /** Alasan kalau tidak valid (untuk ditampilkan ke user) */
  pesan?: string;
  tanggalLahir?: string; // yyyy-mm-dd
  jenisKelamin?: 'L' | 'P';
  kodeProvinsi?: string;
  provinsi?: string;
  kodeKabKota?: string;
  kabKota?: string;
  kodeKecamatan?: string;
  /** Ringkasan wilayah untuk ditampilkan, mis. "Kota Bontang, Kalimantan Timur" */
  wilayah?: string;
}

const UMUR_MAKS = 100;

/** Baca isi NIK. Tidak pernah melempar error — selalu balikin objek. */
export function bacaNik(nikMentah: string, hariIni: Date = new Date()): NikInfo {
  const nik = (nikMentah || '').replace(/\D/g, '');
  if (nik.length === 0) return { valid: false };
  if (nik.length !== 16) return { valid: false, pesan: `NIK harus 16 digit (sekarang ${nik.length}).` };

  const kodeProvinsi = nik.slice(0, 2);
  const kodeKabKota = nik.slice(0, 4);
  const kodeKecamatan = nik.slice(4, 6);

  let hari = parseInt(nik.slice(6, 8), 10);
  const bulan = parseInt(nik.slice(8, 10), 10);
  const tahun2 = parseInt(nik.slice(10, 12), 10);
  if (!Number.isFinite(hari) || !Number.isFinite(bulan) || !Number.isFinite(tahun2)) {
    return { valid: false, pesan: 'Tanggal lahir di dalam NIK tidak terbaca.' };
  }

  // Perempuan: tanggal + 40
  const jenisKelamin: 'L' | 'P' = hari > 40 ? 'P' : 'L';
  if (jenisKelamin === 'P') hari -= 40;

  if (hari < 1 || hari > 31 || bulan < 1 || bulan > 12) {
    return { valid: false, pesan: 'Tanggal lahir di dalam NIK tidak masuk akal.' };
  }

  // Tebak abad: pakai 2000-an dulu; kalau hasilnya belum lahir atau umurnya
  // mustahil untuk pemohon kredit, berarti 1900-an.
  const tahunIni = hariIni.getFullYear();
  let tahun = 2000 + tahun2;
  if (tahun > tahunIni || tahunIni - tahun > UMUR_MAKS) tahun = 1900 + tahun2;

  const d = new Date(tahun, bulan - 1, hari);
  if (d.getFullYear() !== tahun || d.getMonth() !== bulan - 1 || d.getDate() !== hari) {
    return { valid: false, pesan: 'Tanggal lahir di dalam NIK tidak ada di kalender.' };
  }
  if (d.getTime() > hariIni.getTime()) {
    return { valid: false, pesan: 'Tanggal lahir di dalam NIK ada di masa depan.' };
  }

  const provinsi = KODE_PROVINSI[kodeProvinsi];
  const kabKota = KODE_KABKOTA[kodeKabKota];
  const wilayah = kabKota && provinsi
    ? `${kabKota}, ${provinsi}`
    : provinsi
      ? `${provinsi} (kode wilayah ${kodeKabKota})`
      : `Kode wilayah ${kodeKabKota}`;

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    valid: true,
    tanggalLahir: `${tahun}-${pad(bulan)}-${pad(hari)}`,
    jenisKelamin,
    kodeProvinsi,
    provinsi,
    kodeKabKota,
    kabKota,
    kodeKecamatan,
    wilayah,
  };
}
