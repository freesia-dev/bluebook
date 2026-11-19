// Warna dan isi pita berjalan untuk layar sapaan harian (Poster Bangau).
//
// Latar sapaan adalah kain bermotif bangau Dayak yang ditimpa lapisan warna
// gelap. Warna lapisan itu dipilih acak setiap kali sapaan muncul, jadi tiap
// orang dan tiap hari bisa mendapat suasana berbeda. Semua palet sudah dicek
// supaya huruf putih tetap terbaca dan kotak kutipan kontras dengan latarnya.

export interface PaletSapaan {
  nama: string;
  /** warna lapisan di atas kain, format "r g b" untuk rgb(var(--tint) / alfa) */
  tint: string;
  /** warna baris nama */
  aksen: string;
  /** kotak kutipan */
  kotak: string;
  kotakTeks: string;
  /** pita berjalan */
  pita: string;
  pitaTeks: string;
}

export const PALET_SAPAAN: PaletSapaan[] = [
  { nama: 'Biru Malam', tint: '4 24 52', aksen: '#e3b04b', kotak: '#c9301c', kotakTeks: '#ffffff', pita: '#e3b04b', pitaTeks: '#06284d' },
  { nama: 'Marun', tint: '58 10 20', aksen: '#f2c14e', kotak: '#0b3d6b', kotakTeks: '#ffffff', pita: '#f2c14e', pitaTeks: '#3a0a12' },
  { nama: 'Hijau Rimba', tint: '6 42 32', aksen: '#f0c75e', kotak: '#c9301c', kotakTeks: '#ffffff', pita: '#f0c75e', pitaTeks: '#062c22' },
  { nama: 'Anggrek', tint: '42 14 58', aksen: '#f6c453', kotak: '#d63a73', kotakTeks: '#ffffff', pita: '#f6c453', pitaTeks: '#2a0e3a' },
  { nama: 'Mahakam', tint: '3 46 56', aksen: '#ffcf5a', kotak: '#d9481f', kotakTeks: '#ffffff', pita: '#ffcf5a', pitaTeks: '#032e38' },
  { nama: 'Arang Emas', tint: '20 19 24', aksen: '#e8b54a', kotak: '#b8281a', kotakTeks: '#ffffff', pita: '#e8b54a', pitaTeks: '#141318' },
  { nama: 'Nila', tint: '24 26 82', aksen: '#ffd166', kotak: '#e0456b', kotakTeks: '#ffffff', pita: '#ffd166', pitaTeks: '#181a52' },
  { nama: 'Kayu Ulin', tint: '50 27 12', aksen: '#f4c56a', kotak: '#0f5c73', kotakTeks: '#ffffff', pita: '#f4c56a', pitaTeks: '#321b0c' },
  { nama: 'Senja', tint: '72 20 42', aksen: '#ffd27a', kotak: '#173a6b', kotakTeks: '#ffffff', pita: '#ffd27a', pitaTeks: '#48142a' },
  { nama: 'Samudra', tint: '2 34 70', aksen: '#8ee6c9', kotak: '#f58b3c', kotakTeks: '#1a1206', pita: '#8ee6c9', pitaTeks: '#022246' },
];

export function pilihPaletAcak(): PaletSapaan {
  return PALET_SAPAAN[Math.floor(Math.random() * PALET_SAPAAN.length)];
}

// ------------------------------------------------------------------ nama
/** Ambil nama panggilan: kata pertama yang minimal 3 huruf (lewati "M.", "H.", dst). */
export function namaPanggilan(nama: string): string {
  let kata = nama.trim().split(/\s+/).filter(Boolean);
  // "Muhammad Rizki" dipanggil Rizki, bukan Muhammad.
  if (kata.length > 1 && /^(muhammad|muhamad|mohammad|mohamad|mochammad|mochamad|moh|muh|mhd|m)\.?$/i.test(kata[0])) kata = kata.slice(1);
  const pilih = kata.find((k) => k.replace(/[^\p{L}]/gu, '').length >= 3) ?? kata[0] ?? '';
  return pilih.replace(/[^\p{L}'-]/gu, '') || 'Kawan';
}

// ------------------------------------------------------------------ salam
export type Salam = 'PAGI' | 'SIANG' | 'SORE' | 'MALAM';

export function salamSekarang(jam = new Date().getHours()): Salam {
  if (jam < 10) return 'PAGI';
  if (jam < 15) return 'SIANG';
  if (jam < 18) return 'SORE';
  return 'MALAM';
}

// ------------------------------------------------------------------ pita berjalan
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function tanggalPanjang(d = new Date()): string {
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Hari Senin–Jumat setelah hari ini sampai akhir bulan (libur nasional tidak dihitung terpisah). */
function hariKerjaTersisa(d: Date): number {
  const akhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  let n = 0;
  for (let t = d.getDate() + 1; t <= akhir; t++) {
    const w = new Date(d.getFullYear(), d.getMonth(), t).getDay();
    if (w !== 0 && w !== 6) n++;
  }
  return n;
}

/**
 * Isi pita berjalan: kalimat harian yang berganti sendiri tanpa perlu data
 * dari server — tanggal, sisa hari kerja bulan ini, dan sisa hari tahun ini.
 */
export function isiPita(d = new Date()): string[] {
  const kerja = hariKerjaTersisa(d);
  const awalHari = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sisaTahun = Math.round((new Date(d.getFullYear(), 11, 31).getTime() - awalHari.getTime()) / 86_400_000);
  return [
    `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]}`,
    kerja === 0 ? 'Hari kerja terakhir bulan ini' : `${kerja} hari kerja tersisa bulan ini`,
    sisaTahun === 0 ? `Hari terakhir tahun ${d.getFullYear()}` : `Tahun ${d.getFullYear()} tinggal ${sisaTahun} hari`,
    'Bluebook Telihan',
    'KCP 143',
  ];
}
