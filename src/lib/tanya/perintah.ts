// Tanya Bluebook — bentuk "perintah" hasil terjemahan pertanyaan.
//
// Pertanyaan bebas diterjemahkan dulu menjadi salah satu perintah di bawah,
// lewat pola (pahami.ts) atau lewat Workers AI (functions/api/tanya.ts) kalau
// polanya tidak dikenali. Semua angka kemudian dihitung Bluebook sendiri dari
// MLF (jalankan.ts) — AI tidak pernah melihat data nasabah.

export type UnitTanya = 'telihan' | 'meranti' | 'semua';

/** Rentang tanggal inklusif, format YYYY-MM-DD. */
export interface Periode {
  dari: string;
  sampai: string;
  label: string;
}

/**
 * Penanda satu rekening tertentu milik debitur, kalau yang dimaksud bukan
 * semua rekeningnya. Boleh diisi salah satu saja.
 */
export interface PilihRekening {
  /** tanggal akad YYYY-MM-DD */
  akad?: string;
  /** tahun akad */
  tahun?: number;
  /** plafon (rupiah), dicocokkan ±5% */
  plafon?: number;
  /** nomor PK atau nomor rekening, sebagian juga boleh */
  nomor?: string;
  /** plafon atau baki (rupiah), dicocokkan ±5% */
  nominal?: number;
  /** "yang lama" / "yang baru" */
  urutan?: 'lama' | 'baru';
  /** sengaja semua rekening debitur */
  semua?: boolean;
  /** diisi Bluebook setelah dicocokkan: nomor loan (l0lnno) yang kena */
  ln?: string[];
}

/** Satu langkah "bagaimana jika". */
export type Skenario =
  | { aksi: 'kol'; nama: string; kol: number; rek?: PilihRekening }
  | { aksi: 'lunas'; nama: string; rek?: PilihRekening }
  | { aksi: 'bayar'; nama: string; rek?: PilihRekening }
  | { aksi: 'cair'; nominal: number }
  | { aksi: 'kol2_turun' };

export type Perintah =
  | { jenis: 'profil'; nama: string }
  | { jenis: 'posisi_map'; nama: string }
  | { jenis: 'rencana_kunjungan'; bulan: number; unit: UnitTanya; produktif: boolean; perHari: number }
  | { jenis: 'jatuh_tempo'; periode: Periode; unit: UnitTanya }
  | { jenis: 'lunas'; periode: Periode; unit: UnitTanya }
  | { jenis: 'pencairan'; periode: Periode; unit: UnitTanya }
  | { jenis: 'kol'; minKol: number; persis: boolean; nunggak: boolean; unit: UnitTanya }
  | { jenis: 'npl'; unit: UnitTanya }
  | { jenis: 'ringkasan'; unit: UnitTanya; produktif: boolean | null }
  | { jenis: 'tanggal_bayar'; tanggal: number; unit: UnitTanya }
  | { jenis: 'calon_topup'; unit: UnitTanya; minPersen: number }
  | { jenis: 'simulasi'; langkah: Skenario[]; unit: UnitTanya; lanjut: boolean }
  | { jenis: 'target_npl'; target: number; unit: UnitTanya }
  | { jenis: 'angsuran'; plafon: number; bulan: number; bunga: number }
  | { jenis: 'bantuan' };

export const LABEL_UNIT: Record<UnitTanya, string> = {
  telihan: 'unit Telihan',
  meranti: 'unit Meranti',
  semua: 'semua unit',
};

// ------------------------------------------------------------------ tanggal
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const namaBulan = (i: number) => BULAN[i];

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const periodeBulan = (tahun: number, bulan0: number): Periode => ({
  dari: iso(new Date(tahun, bulan0, 1)),
  sampai: iso(new Date(tahun, bulan0 + 1, 0)),
  label: `${BULAN[bulan0]} ${tahun}`,
});

// ------------------------------------------------------------------ pemeriksa
const UNIT_OK = new Set<UnitTanya>(['telihan', 'meranti', 'semua']);
const unitAman = (u: unknown, bawaan: UnitTanya = 'semua'): UnitTanya =>
  UNIT_OK.has(u as UnitTanya) ? (u as UnitTanya) : bawaan;
const tglAman = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const angka = (n: unknown, min: number, max: number, bawaan: number) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : bawaan;
};
const teks = (s: unknown, max = 80) => (typeof s === 'string' ? s.trim().slice(0, max) : '');

function periodeAman(p: any): Periode | null {
  if (!p || !tglAman(p.dari) || !tglAman(p.sampai)) return null;
  const label = teks(p.label, 60) || `${p.dari} – ${p.sampai}`;
  return p.dari <= p.sampai ? { dari: p.dari, sampai: p.sampai, label } : { dari: p.sampai, sampai: p.dari, label };
}

function rekAman(r: any): PilihRekening | undefined {
  if (!r || typeof r !== 'object') return undefined;
  const o: PilihRekening = {};
  if (tglAman(r.akad)) o.akad = r.akad;
  const th = Number(r.tahun);
  if (Number.isInteger(th) && th >= 1990 && th <= 2100) o.tahun = th;
  const pl = Number(r.plafon);
  if (Number.isFinite(pl) && pl > 0) o.plafon = pl;
  const no = teks(r.nomor, 60);
  if (no) o.nomor = no;
  const nom = Number(r.nominal);
  if (Number.isFinite(nom) && nom > 0) o.nominal = nom;
  if (r.urutan === 'lama' || r.urutan === 'baru') o.urutan = r.urutan;
  if (r.semua === true) o.semua = true;
  return Object.keys(o).length ? o : undefined;
}

function skenarioAman(s: any): Skenario | null {
  switch (s?.aksi) {
    case 'kol': {
      const nama = teks(s.nama);
      return nama ? { aksi: 'kol', nama, kol: angka(s.kol, 1, 5, 5), rek: rekAman(s.rekening ?? s.rek) } : null;
    }
    case 'lunas':
    case 'bayar': {
      const nama = teks(s.nama);
      return nama ? { aksi: s.aksi, nama, rek: rekAman(s.rekening ?? s.rek) } : null;
    }
    case 'cair': {
      const nominal = angka(s.nominal, 1, 1e13, 0);
      return nominal > 0 ? { aksi: 'cair', nominal } : null;
    }
    case 'kol2_turun':
      return { aksi: 'kol2_turun' };
    default:
      return null;
  }
}

/**
 * Periksa perintah dari luar (hasil AI). Apa pun yang tidak dikenal atau
 * tidak lengkap dibuang — lebih baik bilang "tidak paham" daripada salah hitung.
 */
export function rapikanPerintah(p: any): Perintah | null {
  if (!p || typeof p !== 'object') return null;
  switch (p.jenis) {
    case 'profil':
    case 'posisi_map': {
      const nama = teks(p.nama);
      return nama ? { jenis: p.jenis, nama } : null;
    }
    case 'rencana_kunjungan':
      return {
        jenis: 'rencana_kunjungan',
        bulan: angka(p.bulan, 1, 24, 3),
        unit: unitAman(p.unit, 'telihan'),
        produktif: p.produktif !== false,
        perHari: angka(p.perHari, 1, 10, 2),
      };
    case 'jatuh_tempo':
    case 'lunas':
    case 'pencairan': {
      const periode = periodeAman(p.periode);
      return periode ? { jenis: p.jenis, periode, unit: unitAman(p.unit) } : null;
    }
    case 'kol':
      return {
        jenis: 'kol',
        minKol: angka(p.minKol, 1, 5, 2),
        persis: !!p.persis,
        nunggak: !!p.nunggak,
        unit: unitAman(p.unit),
      };
    case 'npl':
      return { jenis: 'npl', unit: unitAman(p.unit) };
    case 'ringkasan':
      return { jenis: 'ringkasan', unit: unitAman(p.unit), produktif: typeof p.produktif === 'boolean' ? p.produktif : null };
    case 'tanggal_bayar':
      return { jenis: 'tanggal_bayar', tanggal: angka(p.tanggal, 1, 31, 1), unit: unitAman(p.unit) };
    case 'calon_topup':
      return { jenis: 'calon_topup', unit: unitAman(p.unit), minPersen: angka(p.minPersen, 10, 95, 50) };
    case 'simulasi': {
      const langkah = (Array.isArray(p.langkah) ? p.langkah : []).map(skenarioAman).filter(Boolean).slice(0, 10) as Skenario[];
      return langkah.length ? { jenis: 'simulasi', langkah, unit: unitAman(p.unit), lanjut: !!p.lanjut } : null;
    }
    case 'target_npl':
      return { jenis: 'target_npl', target: angka(p.target, 0, 50, 2), unit: unitAman(p.unit) };
    case 'angsuran': {
      const plafon = angka(p.plafon, 0, 1e13, 0);
      const bulan = angka(p.bulan, 1, 600, 0);
      return plafon > 0 && bulan > 0 ? { jenis: 'angsuran', plafon, bulan, bunga: angka(p.bunga, 0, 60, 10) } : null;
    }
    case 'bantuan':
      return { jenis: 'bantuan' };
    default:
      return null;
  }
}
