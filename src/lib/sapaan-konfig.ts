// Pengaturan layar sapaan (greeting screen) yang bisa diubah admin dari
// menu Konfigurasi → Layar Sapaan. Disimpan di app_setting dengan kunci
// SAPAAN_KEY dan dibaca semua pengguna. Kalau belum pernah disimpan, atau
// ada bagian yang kosong, nilai bawaan di bawah yang dipakai.

import { AYAT_ALKITAB, AYAT_QURAN, PENGGUNA_ALKITAB, hashKunci, type Ayat } from '@/lib/greeting-ayat';
import { PALET_SAPAAN, type PaletSapaan } from '@/lib/sapaan-palet';

export const SAPAAN_KEY = 'sapaan_config';

export type IdWaktu = 'pagi' | 'siang' | 'sore' | 'malam';
export const ID_WAKTU: IdWaktu[] = ['pagi', 'siang', 'sore', 'malam'];

export interface SlotSapaan {
  id: IdWaktu;
  aktif: boolean;
  /** "HH:MM", inklusif */
  mulai: string;
  /** "HH:MM", eksklusif */
  selesai: string;
  /** teks besar baris pertama, mis. "PAGI" */
  salam: string;
}

export interface KutipanKustom {
  teks: string;
  sumber: string;
  arab?: string;
  /** kosong = boleh muncul kapan saja */
  waktu?: IdWaktu[];
}

export type SumberKutipan = 'ayat' | 'kustom' | 'campur' | 'tidak';

export interface KonfigSapaan {
  /** matikan untuk menghentikan sapaan di semua akun */
  aktif: boolean;
  jadwal: SlotSapaan[];
  /** tutup otomatis setelah sekian detik; 0 = tunggu sampai diklik */
  durasiDetik: number;

  /** indeks latar bangau bawaan (0–5) yang ikut diacak */
  latarBawaan: number[];
  /** gambar latar unggahan sendiri (URL) */
  latarKustom: string[];
  /** kain bergoyang pelan */
  efekKibar: boolean;
  /** kepekatan lapisan warna di atas gambar, 0,3–1 */
  kepekatan: number;

  palet: PaletSapaan[];
  /** nama palet yang ikut diacak; kosong = semua */
  paletAktif: string[];

  sumberKutipan: SumberKutipan;
  kutipanKustom: KutipanKustom[];
  /** nama akun (sebagian juga boleh) yang mendapat ayat Alkitab */
  penggunaAlkitab: string[];
  tampilArab: boolean;

  formatNama: 'panggilan' | 'depan' | 'lengkap';
  tampilLogo: boolean;
  tampilTanggal: boolean;
  tampilPetunjuk: boolean;
  teksPetunjuk: string;
  tampilPita: boolean;
  /** tanggal, sisa hari kerja, sisa hari tahun ini */
  pitaOtomatis: boolean;
  pitaTambahan: string[];
  /** 0,6–1,4 */
  skalaJudul: number;
  skalaKutipan: number;
  kemiringan: 'acak' | 'lurus';
}

export const JADWAL_BAWAAN: SlotSapaan[] = [
  { id: 'pagi', aktif: true, mulai: '00:00', selesai: '10:00', salam: 'PAGI' },
  { id: 'siang', aktif: true, mulai: '10:00', selesai: '15:00', salam: 'SIANG' },
  { id: 'sore', aktif: true, mulai: '15:00', selesai: '18:00', salam: 'SORE' },
  { id: 'malam', aktif: false, mulai: '18:00', selesai: '24:00', salam: 'MALAM' },
];

export const KONFIG_BAWAAN: KonfigSapaan = {
  aktif: true,
  jadwal: JADWAL_BAWAAN,
  durasiDetik: 180,
  latarBawaan: [0, 1, 2, 3, 4, 5],
  latarKustom: [],
  efekKibar: true,
  kepekatan: 1,
  palet: PALET_SAPAAN,
  paletAktif: [],
  sumberKutipan: 'ayat',
  kutipanKustom: [],
  penggunaAlkitab: PENGGUNA_ALKITAB,
  tampilArab: true,
  formatNama: 'panggilan',
  tampilLogo: true,
  tampilTanggal: true,
  tampilPetunjuk: true,
  teksPetunjuk: 'Klik atau tekan tombol apa saja untuk lanjut',
  tampilPita: true,
  pitaOtomatis: true,
  pitaTambahan: ['Bluebook Telihan', 'KCP 143'],
  skalaJudul: 1,
  skalaKutipan: 1,
  kemiringan: 'acak',
};

// ------------------------------------------------------------------ gabung
const jam = (s: unknown, bawaan: string) => (typeof s === 'string' && /^([01]\d|2[0-4]):[0-5]\d$/.test(s) ? s : bawaan);
const bool = (v: unknown, b: boolean) => (typeof v === 'boolean' ? v : b);
const num = (v: unknown, min: number, max: number, b: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : b;
};
const str = (v: unknown, b: string, max = 200) => (typeof v === 'string' ? v.slice(0, max) : b);
const strArr = (v: unknown, b: string[]) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).slice(0, 500)) : b);
const warna = (v: unknown, b: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : b);
const rgb = (v: unknown, b: string) => (typeof v === 'string' && /^\d{1,3} \d{1,3} \d{1,3}$/.test(v) ? v : b);

/** Lengkapi pengaturan yang tersimpan dengan nilai bawaan dan buang isian rusak. */
export function gabungKonfig(raw: unknown): KonfigSapaan {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const B = KONFIG_BAWAAN;
  const jadwalRaw = Array.isArray(r.jadwal) ? r.jadwal : [];
  const jadwal = JADWAL_BAWAAN.map((d) => {
    const x = jadwalRaw.find((s: any) => s?.id === d.id) ?? {};
    return { id: d.id, aktif: bool(x.aktif, d.aktif), mulai: jam(x.mulai, d.mulai), selesai: jam(x.selesai, d.selesai), salam: str(x.salam, d.salam, 24) || d.salam };
  });
  const palet = Array.isArray(r.palet) && r.palet.length
    ? r.palet.slice(0, 30).map((p: any, i: number) => {
        const d = PALET_SAPAAN[i % PALET_SAPAAN.length];
        return {
          nama: str(p?.nama, `Palet ${i + 1}`, 40) || `Palet ${i + 1}`,
          tint: rgb(p?.tint, d.tint),
          aksen: warna(p?.aksen, d.aksen),
          kotak: warna(p?.kotak, d.kotak),
          kotakTeks: warna(p?.kotakTeks, d.kotakTeks),
          pita: warna(p?.pita, d.pita),
          pitaTeks: warna(p?.pitaTeks, d.pitaTeks),
        };
      })
    : B.palet;
  const kutipanKustom: KutipanKustom[] = Array.isArray(r.kutipanKustom)
    ? r.kutipanKustom
        .filter((k: any) => k && typeof k.teks === 'string' && k.teks.trim())
        .slice(0, 300)
        .map((k: any) => ({
          teks: k.teks.slice(0, 600),
          sumber: str(k.sumber, '', 120),
          arab: typeof k.arab === 'string' && k.arab.trim() ? k.arab.slice(0, 600) : undefined,
          waktu: Array.isArray(k.waktu) ? k.waktu.filter((w: any) => ID_WAKTU.includes(w)) : undefined,
        }))
    : B.kutipanKustom;
  return {
    aktif: bool(r.aktif, B.aktif),
    jadwal,
    durasiDetik: num(r.durasiDetik, 0, 3600, B.durasiDetik),
    latarBawaan: Array.isArray(r.latarBawaan) ? r.latarBawaan.map(Number).filter((n: number) => Number.isInteger(n) && n >= 0 && n <= 5) : B.latarBawaan,
    latarKustom: strArr(r.latarKustom, B.latarKustom).filter((u) => /^https?:\/\//.test(u)),
    efekKibar: bool(r.efekKibar, B.efekKibar),
    kepekatan: num(r.kepekatan, 0.3, 1, B.kepekatan),
    palet,
    paletAktif: strArr(r.paletAktif, B.paletAktif),
    sumberKutipan: ['ayat', 'kustom', 'campur', 'tidak'].includes(r.sumberKutipan) ? r.sumberKutipan : B.sumberKutipan,
    kutipanKustom,
    penggunaAlkitab: strArr(r.penggunaAlkitab, B.penggunaAlkitab),
    tampilArab: bool(r.tampilArab, B.tampilArab),
    formatNama: ['panggilan', 'depan', 'lengkap'].includes(r.formatNama) ? r.formatNama : B.formatNama,
    tampilLogo: bool(r.tampilLogo, B.tampilLogo),
    tampilTanggal: bool(r.tampilTanggal, B.tampilTanggal),
    tampilPetunjuk: bool(r.tampilPetunjuk, B.tampilPetunjuk),
    teksPetunjuk: str(r.teksPetunjuk, B.teksPetunjuk, 120),
    tampilPita: bool(r.tampilPita, B.tampilPita),
    pitaOtomatis: bool(r.pitaOtomatis, B.pitaOtomatis),
    pitaTambahan: strArr(r.pitaTambahan, B.pitaTambahan).map((s) => s.slice(0, 80)).slice(0, 20),
    skalaJudul: num(r.skalaJudul, 0.6, 1.4, B.skalaJudul),
    skalaKutipan: num(r.skalaKutipan, 0.6, 1.4, B.skalaKutipan),
    kemiringan: r.kemiringan === 'lurus' ? 'lurus' : 'acak',
  };
}

// ------------------------------------------------------------------ jadwal
const menit = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** Slot sapaan yang sedang berlaku sekarang, atau null kalau tidak ada. */
export function slotSekarang(k: KonfigSapaan, waktu = new Date()): SlotSapaan | null {
  if (!k.aktif) return null;
  const sekarang = waktu.getHours() * 60 + waktu.getMinutes();
  for (const s of k.jadwal) {
    if (!s.aktif) continue;
    const a = menit(s.mulai);
    const b = menit(s.selesai);
    const masuk = a <= b ? sekarang >= a && sekarang < b : sekarang >= a || sekarang < b; // lewat tengah malam
    if (masuk) return s;
  }
  return null;
}

// ------------------------------------------------------------------ kutipan
export const pakaiAlkitabKonfig = (k: KonfigSapaan, nama: string | null | undefined) => {
  const n = (nama || '').toLowerCase();
  return k.penggunaAlkitab.some((x) => x.trim() && n.includes(x.trim().toLowerCase()));
};

const cocokWaktu = (daftar: Ayat[], w: IdWaktu) => {
  const c = daftar.filter((a) => !a.waktu || (a.waktu as string[]).includes(w));
  return c.length ? c : daftar;
};

/**
 * Pilih kutipan untuk satu sapaan. Kuncinya "tanggal|waktu|pengguna", jadi
 * tiap orang dapat kutipan berbeda dan tetap sama kalau sapaan tampil ulang.
 */
export function pilihKutipan(k: KonfigSapaan, kunci: string, w: IdWaktu, nama: string | null | undefined): Ayat | null {
  if (k.sumberKutipan === 'tidak') return null;
  const bawaan = pakaiAlkitabKonfig(k, nama) ? AYAT_ALKITAB : AYAT_QURAN;
  const kustom: Ayat[] = k.kutipanKustom.map((x) => ({ teks: x.teks, sumber: x.sumber, arab: x.arab, waktu: x.waktu?.length ? (x.waktu as never) : undefined }));
  const daftar = k.sumberKutipan === 'kustom' && kustom.length ? kustom : k.sumberKutipan === 'campur' ? [...bawaan, ...kustom] : bawaan;
  const cocok = cocokWaktu(daftar, w);
  const a = cocok[hashKunci(kunci) % cocok.length];
  if (!a) return null;
  return k.tampilArab ? a : { ...a, arab: undefined };
}

// ------------------------------------------------------------------ palet
export function pilihPalet(k: KonfigSapaan): PaletSapaan {
  const aktif = k.paletAktif.length ? k.palet.filter((p) => k.paletAktif.includes(p.nama)) : k.palet;
  const daftar = aktif.length ? aktif : k.palet.length ? k.palet : PALET_SAPAAN;
  return daftar[Math.floor(Math.random() * daftar.length)];
}

/** "#0a3558" → "10 53 88" untuk var(--tint). */
export const hexKeRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '4 24 52';
};
export const rgbKeHex = (rgbStr: string) =>
  '#' + rgbStr.split(' ').map((x) => Math.max(0, Math.min(255, Number(x) || 0)).toString(16).padStart(2, '0')).join('');
