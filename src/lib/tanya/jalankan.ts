// Tanya Bluebook — menghitung jawaban dari MLF.
//
// Semua angka berasal dari sini, dengan rumus yang sama seperti menu Loan
// Monitoring (NPL = baki kol 3–5 ÷ baki kol 1–5, ekstrakomtabel tidak
// dihitung). Simulasi hanya mengubah salinan data di memori.

import type { MLFRow, MLFUpload } from '@/hooks/use-mlf-data';
import type { BerkasArsip, RekeningMaster } from '@/hooks/use-arsip';
import { getAngsuranPokok, getJangkaWaktuBulan, getUnit, isProduktif, jenisProduktif } from '@/lib/produktif-utils';
import { tanggalAngsuran } from '@/lib/pipeline-segmen';
import { calcAmortization } from '@/lib/loan-calc';
import { iso, LABEL_UNIT, type Perintah, type Skenario, type UnitTanya } from './perintah';
import {
  nadaKol, nadaNpl, persen, rp, tgl, tglHari,
  type HasilTanya, type Jawaban, type JawabTabel, type KreditProfil, type MapProfil, type Lencana,
} from './jawaban';

export interface PinjamAktif {
  berkas_id: string;
  peminjam: string;
  tenggat: string;
}

export interface SumberData {
  /** urut terbaru dulu */
  uploads: MLFUpload[];
  baris: (uploadId: string) => Promise<MLFRow[]>;
  arsipMaster: () => Promise<RekeningMaster[]>;
  berkas: () => Promise<BerkasArsip[]>;
  pinjamAktif: () => Promise<PinjamAktif[]>;
  kontak: (lnno: string[]) => Promise<Record<string, string>>;
  hariIni: Date;
}

// ------------------------------------------------------------------ alat bantu
const n = (x: unknown) => Number(x) || 0;
const kolOf = (r: MLFRow) => n(r.kol);
const tunggakan = (r: MLFRow) => n(r.tungpk) + n(r.tungbg);

export const saringUnit = (rows: MLFRow[], unit: UnitTanya) =>
  unit === 'semua' ? rows : rows.filter((r) => getUnit(r) === unit);

export function hitungNpl(rows: MLFRow[]) {
  let bermasalah = 0;
  let dasar = 0;
  let debiturBermasalah = 0;
  const perKol = new Map<number, { baki: number; debitur: number }>();
  for (const r of rows) {
    const k = kolOf(r);
    if (k === 0) continue;
    const b = n(r.baki);
    dasar += b;
    if (k >= 3) {
      bermasalah += b;
      debiturBermasalah += 1;
      const c = perKol.get(k) ?? { baki: 0, debitur: 0 };
      c.baki += b;
      c.debitur += 1;
      perKol.set(k, c);
    }
  }
  return {
    npl: dasar > 0 ? (bermasalah / dasar) * 100 : 0,
    bermasalah,
    dasar,
    debiturBermasalah,
    perKol: [3, 4, 5].map((kol) => ({ kol, ...(perKol.get(kol) ?? { baki: 0, debitur: 0 }) })),
  };
}

/** Nama untuk dicocokkan: huruf besar, tanpa tanda baca dan gelar umum. */
export const kunciNama = (s: string | null | undefined) =>
  (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(HJ|IR|DR|DRS|SE|SH|ST|SPD|AMD|BPK|IBU|NY|TN|SDR)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Cari baris milik nama tertentu. Kalau ada yang persis sama, hanya itu yang
 * dipakai; kalau tidak, semua kata yang diketik harus muncul di nama MLF.
 */
export function cariNama<T extends { l0name?: string | null }>(rows: T[], nama: string): { persis: boolean; nama: string[]; rows: T[] } {
  const kunci = kunciNama(nama);
  if (!kunci) return { persis: false, nama: [], rows: [] };
  const sama = rows.filter((r) => kunciNama(r.l0name) === kunci);
  if (sama.length) return { persis: true, nama: [sama[0].l0name || nama], rows: sama };
  const kata = kunci.split(' ').filter((k) => k.length >= 2);
  const cocok = rows.filter((r) => {
    const kn = ` ${kunciNama(r.l0name)} `;
    return kata.every((k) => kn.includes(` ${k}`));
  });
  const namaUnik = Array.from(new Set(cocok.map((r) => (r.l0name || '').trim()).filter(Boolean)));
  return { persis: false, nama: namaUnik, rows: cocok };
}

const urutTanggal = (a: string | null, b: string | null) => (a || '9999').localeCompare(b || '9999');
const tanggal = (s: string | null | undefined) => (s ? s.slice(0, 10) : null);

/** Unggahan terakhir pada atau sebelum tanggal tertentu. */
const uploadSebelum = (uploads: MLFUpload[], batas: string, inklusif: boolean) =>
  uploads.find((u) => (inklusif ? u.jobdate.slice(0, 10) <= batas : u.jobdate.slice(0, 10) < batas));

const lencanaKol = (k: number): Lencana => ({ teks: k === 0 ? 'Ekstrakom' : `Kol ${k}`, nada: nadaKol(k) });

const unitTeks = (r: MLFRow) => ({ telihan: 'Telihan', meranti: 'Meranti', unknown: '—' })[getUnit(r)];

const pilihNama = (teks: string, nama: string[], rows: MLFRow[], buat: (nama: string) => string): Jawaban => ({
  tipe: 'pilih',
  teks,
  opsi: nama.slice(0, 8).map((nm) => {
    const milik = rows.filter((r) => (r.l0name || '').trim() === nm);
    const baki = milik.reduce((s, r) => s + n(r.baki), 0);
    const kol = Math.max(...milik.map(kolOf));
    return {
      label: nm,
      sub: `${milik.length} rekening · baki ${rp(baki)} · kol ${kol}${milik[0] ? ` · ${unitTeks(milik[0])}` : ''}`,
      kirim: buat(nm),
    };
  }),
});

// ------------------------------------------------------------------ utama
export async function jalankan(p: Perintah, d: SumberData, ctx: { kalimat: string; simulasiSebelumnya?: { langkah: Skenario[]; unit: UnitTanya } }): Promise<HasilTanya> {
  if (p.jenis === 'bantuan') return { paham: ['bantuan'], jawab: bantuan() };
  if (p.jenis === 'angsuran') return angsuran(p);

  const terbaru = d.uploads[0];
  if (!terbaru) {
    return { paham: [], jawab: { tipe: 'teks', teks: 'Belum ada data MLF yang diunggah. Unggah dulu lewat menu Loan Monitoring → Upload Data.' } };
  }
  const rows = await d.baris(terbaru.id);
  const tglData = tgl(terbaru.jobdate);

  switch (p.jenis) {
    case 'profil':
      return profil(p.nama, rows, d, tglData);
    case 'posisi_map':
      return posisiMap(p.nama, d);
    case 'npl':
      return npl(p.unit, rows, d, terbaru, tglData);
    case 'ringkasan':
      return ringkasan(p.unit, p.produktif, rows, tglData);
    case 'kol':
      return daftarKol(p, rows, tglData);
    case 'jatuh_tempo':
      return jatuhTempo(p, rows, tglData);
    case 'pencairan':
      return pencairan(p, rows, tglData);
    case 'lunas':
      return lunas(p, d);
    case 'tanggal_bayar':
      return tanggalBayar(p, rows, tglData);
    case 'calon_topup':
      return calonTopup(p, rows, d, tglData);
    case 'rencana_kunjungan':
      return rencana(p, rows, d, tglData);
    case 'simulasi':
      return simulasi(p, rows, ctx, tglData);
    case 'target_npl':
      return targetNpl(p, rows, tglData);
    default:
      return { paham: [], jawab: { tipe: 'teks', teks: 'Maaf, pertanyaan itu belum bisa dijawab.' } };
  }
}

// ------------------------------------------------------------------ bantuan
function bantuan(): Jawaban {
  return {
    tipe: 'teks',
    judul: 'Yang bisa ditanyakan',
    teks: 'Tanya dengan bahasa sehari-hari. Beberapa contoh:',
    saran: [
      'info debitur atas nama …',
      'rencana kunjungan debitur yang baru cair 3 bulan, Telihan',
      'siapa yang jatuh tempo bulan depan?',
      'siapa yang lunas bulan ini?',
      'debitur kol 2 ke atas',
      'berapa NPL Telihan?',
      'simulasikan kalau … jadi kol 5, berapa NPL?',
      'berapa yang harus ditagih biar NPL di bawah 2%?',
      'yang bayar tanggal 25',
      'calon top up',
      'map … di laci mana?',
      'angsuran Rp 100 jt 36 bulan bunga 10%',
    ],
  };
}

// ------------------------------------------------------------------ profil
async function profil(nama: string, rows: MLFRow[], d: SumberData, tglData: string): Promise<HasilTanya> {
  const cari = cariNama(rows, nama);
  let master: RekeningMaster[] = [];
  try {
    master = await d.arsipMaster();
  } catch {
    master = [];
  }

  if (!cari.persis && cari.nama.length > 1) {
    return {
      paham: ['profil debitur', `nama ≈ "${nama.toUpperCase()}"`],
      jawab: pilihNama(`Ada ${cari.nama.length} debitur bernama mirip. Yang mana?`, cari.nama, cari.rows, (nm) => `info debitur atas nama "${nm}"`),
    };
  }

  // tidak ada di MLF terbaru → mungkin sudah lunas, cari di daftar induk arsip
  let namaPasti = cari.nama[0];
  if (!namaPasti) {
    const lama = cariNama(master.map((m) => ({ ...m, l0name: m.nama_debitur })), nama);
    if (lama.nama.length > 1 && !lama.persis) {
      return {
        paham: ['profil debitur', `nama ≈ "${nama.toUpperCase()}"`],
        jawab: {
          tipe: 'pilih',
          teks: `Tidak ada di MLF ${tglData}, tapi ada ${lama.nama.length} nama mirip di riwayat kredit. Yang mana?`,
          opsi: lama.nama.slice(0, 8).map((nm) => ({ label: nm, sub: 'sudah tidak aktif', kirim: `info debitur atas nama "${nm}"` })),
        },
      };
    }
    namaPasti = lama.nama[0];
    if (!namaPasti) {
      return {
        paham: ['profil debitur', `nama ≈ "${nama.toUpperCase()}"`],
        jawab: { tipe: 'teks', teks: `Tidak ada debitur bernama "${nama}" di MLF ${tglData} maupun di riwayat kredit. Coba ketik sebagian nama saja, mis. nama depannya.` },
      };
    }
  }

  const milik = rows.filter((r) => kunciNama(r.l0name) === kunciNama(namaPasti));
  const aktif: KreditProfil[] = milik
    .sort((a, b) => urutTanggal(b.date, a.date))
    .map((r) => ({
      l0lnno: r.l0lnno,
      nomorPk: r.l0narr,
      produk: r.lytitl,
      jenis: isProduktif(r) ? `Produktif · ${jenisProduktif(r)}` : 'Konsumtif',
      unit: unitTeks(r),
      akad: tanggal(r.date),
      jatuhTempo: tanggal(r.date1),
      plafon: n(r.pla),
      baki: n(r.baki),
      kol: kolOf(r),
      tunggakan: tunggakan(r),
      angsuranPokok: getAngsuranPokok(r),
      tanggalBayar: tanggalAngsuran(r).hari,
      ao: r.l0usid,
      status: 'aktif',
    }));
  const lnAktif = new Set(milik.map((r) => r.l0lnno).filter(Boolean) as string[]);
  const riwayat: KreditProfil[] = master
    .filter((m) => kunciNama(m.nama_debitur) === kunciNama(namaPasti) && !lnAktif.has(m.no_rekening))
    .sort((a, b) => urutTanggal(b.tanggal_akad, a.tanggal_akad))
    .map((m) => ({
      l0lnno: m.no_rekening,
      nomorPk: m.nomor_pk,
      produk: m.produk,
      jenis: m.jenis_kredit || '—',
      unit: '—',
      akad: tanggal(m.tanggal_akad),
      jatuhTempo: tanggal(m.jatuh_tempo),
      plafon: n(m.plafon),
      baki: 0,
      kol: n(m.kol),
      tunggakan: 0,
      angsuranPokok: 0,
      tanggalBayar: null,
      ao: null,
      status: 'lunas',
    }));

  // map arsip
  const map: MapProfil[] = [];
  try {
    const [berkas, pinjam] = await Promise.all([d.berkas(), d.pinjamAktif().catch(() => [] as PinjamAktif[])]);
    const semuaLn = new Set([...lnAktif, ...riwayat.map((r) => r.l0lnno).filter(Boolean)] as string[]);
    const pinjamPer = new Map(pinjam.map((x) => [x.berkas_id, x]));
    for (const b of berkas) {
      if (!(kunciNama(b.nama_debitur) === kunciNama(namaPasti) || (b.no_rekening && semuaLn.has(b.no_rekening)))) continue;
      const pj = pinjamPer.get(b.id);
      const lokasi = `Laci ${b.kode_laci} · #${String(b.nomor_urut).padStart(3, '0')}`;
      if (b.diserahkan_at) map.push({ kode: b.kode_map, lokasi, status: 'sudah diserahkan', nada: 'abu' });
      else if (pj) map.push({ kode: b.kode_map, lokasi, status: `dipinjam ${pj.peminjam}`, nada: pj.tenggat < iso(d.hariIni) ? 'merah' : 'jingga' });
      else if (b.perlu_telusur) map.push({ kode: b.kode_map, lokasi, status: 'perlu ditelusuri', nada: 'merah' });
      else map.push({ kode: b.kode_map, lokasi, status: 'tersimpan', nada: 'hijau' });
    }
  } catch {
    /* menu arsip belum dipasang — lewati */
  }

  let noHp: string | null = null;
  try {
    const k = await d.kontak([...lnAktif]);
    noHp = Object.values(k).find(Boolean) ?? null;
  } catch {
    noHp = null;
  }

  const totalBaki = aktif.reduce((s, k) => s + k.baki, 0);
  const catatan: string[] = [];
  const nunggak = aktif.filter((k) => k.tunggakan > 0);
  if (nunggak.length) catatan.push(`Ada tunggakan ${rp(nunggak.reduce((s, k) => s + k.tunggakan, 0))}.`);
  if (!aktif.length) catatan.push(`Tidak ada kredit aktif di MLF ${tglData}.`);
  const sejak = [...aktif, ...riwayat].map((k) => k.akad).filter(Boolean).sort()[0];
  const contoh = milik[0];
  const ringkasanTeks = [
    aktif.length ? (aktif.some((k) => k.jenis.startsWith('Produktif')) ? 'Produktif' : 'Konsumtif') : 'Tidak aktif',
    contoh?.ecname || null,
    contoh ? `unit ${unitTeks(contoh)}` : null,
    sejak ? `debitur sejak ${sejak.slice(0, 4)}` : null,
  ].filter(Boolean).join(' · ');

  return {
    paham: ['profil debitur', cari.persis || kunciNama(namaPasti) === kunciNama(nama) ? `nama = "${namaPasti}"` : `nama ≈ "${nama.toUpperCase()}"`],
    jawab: {
      tipe: 'profil',
      nama: namaPasti,
      ringkasan: ringkasanTeks,
      totalBaki,
      kredit: [...aktif, ...riwayat],
      map,
      noHp,
      catatan,
    },
  };
}

async function posisiMap(nama: string, d: SumberData): Promise<HasilTanya> {
  let berkas: BerkasArsip[] = [];
  let pinjam: PinjamAktif[] = [];
  try {
    [berkas, pinjam] = await Promise.all([d.berkas(), d.pinjamAktif().catch(() => [] as PinjamAktif[])]);
  } catch {
    return { paham: ['posisi map'], jawab: { tipe: 'teks', teks: 'Data arsip belum bisa dibaca. Pastikan menu Arsip & Khasanah sudah dipasang.' } };
  }
  const cari = cariNama(berkas.map((b) => ({ ...b, l0name: b.nama_debitur })), nama);
  const pinjamPer = new Map(pinjam.map((x) => [x.berkas_id, x]));
  const baris = cari.rows.map((b) => {
    const pj = pinjamPer.get(b.id);
    const st: Lencana = b.diserahkan_at
      ? { teks: 'Diserahkan', nada: 'abu' }
      : pj
        ? { teks: `Dipinjam ${pj.peminjam}`, nada: 'jingga' }
        : b.perlu_telusur
          ? { teks: 'Perlu telusur', nada: 'merah' }
          : { teks: 'Tersimpan', nada: 'hijau' };
    return {
      nama: b.nama_debitur,
      laci: `Laci ${b.kode_laci}`,
      urut: `#${String(b.nomor_urut).padStart(3, '0')}`,
      kode: b.kode_map,
      jenis: b.jenis_laci,
      akad: tgl(b.tanggal_akad),
      status: st,
    };
  });
  return {
    paham: ['posisi map', `nama ≈ "${nama.toUpperCase()}"`],
    jawab: {
      tipe: 'tabel',
      judul: 'Posisi map arsip',
      angkaUtama: `${baris.length} map`,
      kolom: [
        { kunci: 'nama', label: 'Debitur', jenis: 'nama', hp: true, sub: 'kode' },
        { kunci: 'laci', label: 'Laci', hp: true, sub: 'urut' },
        { kunci: 'jenis', label: 'Jenis' },
        { kunci: 'akad', label: 'Akad' },
        { kunci: 'status', label: 'Status', jenis: 'lencana', hp: true },
      ],
      baris,
      namaFile: `posisi-map-${kunciNama(nama).toLowerCase().replace(/ /g, '-')}`,
      kosong: `Belum ada map atas nama "${nama}" yang dicatat di arsip.`,
    },
  };
}

// ------------------------------------------------------------------ angka
async function npl(unit: UnitTanya, rows: MLFRow[], d: SumberData, terbaru: MLFUpload, tglData: string): Promise<HasilTanya> {
  const h = hitungNpl(saringUnit(rows, unit));
  const awalBulan = `${terbaru.jobdate.slice(0, 7)}-01`;
  const lalu = uploadSebelum(d.uploads, awalBulan, false);
  let banding: { label: string; npl: number } | undefined;
  if (lalu) {
    try {
      const r0 = await d.baris(lalu.id);
      banding = { label: `MLF ${tgl(lalu.jobdate)}`, npl: hitungNpl(saringUnit(r0, unit)).npl };
    } catch {
      banding = undefined;
    }
  }
  return {
    paham: ['NPL', LABEL_UNIT[unit], `MLF ${tglData}`],
    jawab: {
      tipe: 'npl',
      judul: `NPL ${unit === 'semua' ? 'KCP Telihan' : LABEL_UNIT[unit]}`,
      npl: h.npl,
      bermasalah: h.bermasalah,
      dasar: h.dasar,
      debiturBermasalah: h.debiturBermasalah,
      perKol: h.perKol,
      banding,
      catatan: ['NPL = baki kol 3–5 ÷ total baki kol 1–5 (ekstrakomtabel tidak dihitung), sama seperti Loan Monitoring.'],
    },
  };
}

function ringkasan(unit: UnitTanya, produktif: boolean | null, rows: MLFRow[], tglData: string): HasilTanya {
  let r = saringUnit(rows, unit).filter((x) => kolOf(x) !== 0);
  if (produktif !== null) r = r.filter((x) => isProduktif(x) === produktif);
  const h = hitungNpl(r);
  const perKol = [1, 2, 3, 4, 5].map((k) => {
    const m = r.filter((x) => kolOf(x) === k);
    return { kol: lencanaKol(k), debitur: m.length, baki: m.reduce((s, x) => s + n(x.baki), 0), tunggakan: m.reduce((s, x) => s + tunggakan(x), 0) };
  });
  const totalBaki = r.reduce((s, x) => s + n(x.baki), 0);
  const label = produktif === null ? 'semua kredit' : produktif ? 'produktif' : 'konsumtif';
  return {
    paham: ['ringkasan', LABEL_UNIT[unit], label],
    jawab: {
      tipe: 'tabel',
      judul: `Ringkasan kredit ${label}`,
      angkaUtama: rp(totalBaki),
      keterangan: `baki dari ${r.length.toLocaleString('id-ID')} rekening · MLF ${tglData}`,
      ringkas: [
        { label: 'Plafon', nilai: rp(r.reduce((s, x) => s + n(x.pla), 0)) },
        { label: 'Tunggakan', nilai: rp(r.reduce((s, x) => s + tunggakan(x), 0)) },
        { label: 'NPL', nilai: persen(h.npl), nada: nadaNpl(h.npl) },
      ],
      kolom: [
        { kunci: 'kol', label: 'Kol', jenis: 'lencana', hp: true },
        { kunci: 'debitur', label: 'Rekening', jenis: 'angka', hp: true },
        { kunci: 'baki', label: 'Baki', jenis: 'uang', hp: true },
        { kunci: 'tunggakan', label: 'Tunggakan', jenis: 'uang' },
      ],
      baris: perKol,
      namaFile: `ringkasan-${unit}-${label.replace(/ /g, '-')}`,
    },
  };
}

// ------------------------------------------------------------------ daftar
const kolomDebitur = (tambahan: JawabTabel['kolom']): JawabTabel['kolom'] => [
  { kunci: 'nama', label: 'Debitur', jenis: 'nama', hp: true, sub: 'produk' },
  ...tambahan,
];

const barisDebitur = (r: MLFRow) => ({
  nama: (r.l0name || '').trim(),
  produk: [r.lytitl, unitTeks(r)].filter(Boolean).join(' · '),
  akad: tanggal(r.date),
  tempo: tanggal(r.date1),
  plafon: n(r.pla),
  baki: n(r.baki),
  kol: lencanaKol(kolOf(r)),
  tunggakan: tunggakan(r),
  ao: r.l0usid || '—',
  nomor: r.l0narr || r.l0lnno || '—',
});

function daftarKol(p: Extract<Perintah, { jenis: 'kol' }>, rows: MLFRow[], tglData: string): HasilTanya {
  let r = saringUnit(rows, p.unit).filter((x) => kolOf(x) !== 0);
  r = p.persis ? r.filter((x) => kolOf(x) === p.minKol) : r.filter((x) => kolOf(x) >= p.minKol);
  if (p.nunggak) r = r.filter((x) => tunggakan(x) > 0);
  r.sort((a, b) => tunggakan(b) - tunggakan(a) || kolOf(b) - kolOf(a) || n(b.baki) - n(a.baki));
  const label = p.nunggak && p.minKol <= 1 ? 'ada tunggakan' : p.persis ? `kol ${p.minKol}` : `kol ≥ ${p.minKol}`;
  return {
    paham: [label, 'urut tunggakan', LABEL_UNIT[p.unit]],
    jawab: {
      tipe: 'tabel',
      judul: `Debitur ${label}`,
      angkaUtama: `${r.length} rekening`,
      keterangan: `baki ${rp(r.reduce((s, x) => s + n(x.baki), 0))} · tunggakan ${rp(r.reduce((s, x) => s + tunggakan(x), 0))} · MLF ${tglData}`,
      kolom: kolomDebitur([
        { kunci: 'kol', label: 'Kol', jenis: 'lencana', hp: true },
        { kunci: 'tunggakan', label: 'Tunggakan', jenis: 'uang', hp: true },
        { kunci: 'baki', label: 'Baki', jenis: 'uang' },
        { kunci: 'ao', label: 'AO' },
      ]),
      baris: r.map(barisDebitur),
      namaFile: `debitur-${label.replace(/[^a-z0-9]+/gi, '-')}`,
      kosong: 'Tidak ada debitur yang cocok. Kabar baik!',
    },
  };
}

function jatuhTempo(p: Extract<Perintah, { jenis: 'jatuh_tempo' }>, rows: MLFRow[], tglData: string): HasilTanya {
  const r = saringUnit(rows, p.unit)
    .filter((x) => {
      const t = tanggal(x.date1);
      return t && t >= p.periode.dari && t <= p.periode.sampai;
    })
    .sort((a, b) => urutTanggal(a.date1, b.date1));
  return {
    paham: ['jatuh tempo', p.periode.label, LABEL_UNIT[p.unit]],
    jawab: {
      tipe: 'tabel',
      judul: `Jatuh tempo ${p.periode.label}`,
      angkaUtama: `${r.length} rekening`,
      keterangan: `sisa baki ${rp(r.reduce((s, x) => s + n(x.baki), 0))} · MLF ${tglData}`,
      kolom: [
        { kunci: 'tempo', label: 'Tempo', jenis: 'tanggal', hp: true },
        ...kolomDebitur([
          { kunci: 'baki', label: 'Baki', jenis: 'uang', hp: true },
          { kunci: 'kol', label: 'Kol', jenis: 'lencana' },
        ]),
      ],
      baris: r.map(barisDebitur),
      namaFile: `jatuh-tempo-${p.periode.dari}`,
      kosong: `Tidak ada kredit yang jatuh tempo ${p.periode.label}.`,
    },
  };
}

function pencairan(p: Extract<Perintah, { jenis: 'pencairan' }>, rows: MLFRow[], tglData: string): HasilTanya {
  const r = saringUnit(rows, p.unit)
    .filter((x) => {
      const t = tanggal(x.date);
      return t && t >= p.periode.dari && t <= p.periode.sampai;
    })
    .sort((a, b) => urutTanggal(b.date, a.date));
  return {
    paham: ['kredit cair', p.periode.label, LABEL_UNIT[p.unit]],
    jawab: {
      tipe: 'tabel',
      judul: `Pencairan ${p.periode.label}`,
      angkaUtama: `${r.length} rekening`,
      keterangan: `plafon ${rp(r.reduce((s, x) => s + n(x.pla), 0))} · MLF ${tglData}`,
      kolom: [
        { kunci: 'akad', label: 'Akad', jenis: 'tanggal', hp: true },
        ...kolomDebitur([
          { kunci: 'plafon', label: 'Plafon', jenis: 'uang', hp: true },
          { kunci: 'baki', label: 'Baki', jenis: 'uang' },
          { kunci: 'ao', label: 'AO' },
        ]),
      ],
      baris: r.map(barisDebitur),
      catatan: ['Dihitung dari tanggal akad kredit yang masih ada di MLF terbaru.'],
      namaFile: `pencairan-${p.periode.dari}`,
      kosong: `Tidak ada pencairan ${p.periode.label}.`,
    },
  };
}

async function lunas(p: Extract<Perintah, { jenis: 'lunas' }>, d: SumberData): Promise<HasilTanya> {
  const paham = ['sudah lunas', p.periode.label, LABEL_UNIT[p.unit], 'hilang dari MLF'];
  const awal = uploadSebelum(d.uploads, p.periode.dari, false);
  const akhir = uploadSebelum(d.uploads, p.periode.sampai, true);
  if (!akhir || (akhir.jobdate.slice(0, 10) < p.periode.dari && !awal)) {
    return { paham, jawab: { tipe: 'teks', teks: `Belum ada data MLF untuk ${p.periode.label}.` } };
  }
  if (!awal) {
    return { paham, jawab: { tipe: 'teks', teks: `Data MLF sebelum ${p.periode.label} belum ada, jadi belum bisa dibandingkan siapa yang hilang dari daftar.` } };
  }
  if (awal.id === akhir.id) {
    return { paham, jawab: { tipe: 'teks', teks: `Belum ada data MLF baru sejak ${tgl(awal.jobdate)}, jadi belum ada yang terlihat lunas di ${p.periode.label}.` } };
  }
  const [r0, r1] = await Promise.all([d.baris(awal.id), d.baris(akhir.id)]);
  const ada = new Set(r1.map((r) => r.l0lnno).filter(Boolean));
  const hilang = saringUnit(r0, p.unit).filter((r) => r.l0lnno && !ada.has(r.l0lnno));
  const perNama = new Map<string, MLFRow[]>();
  for (const r of r1) {
    const k = kunciNama(r.l0name);
    perNama.set(k, [...(perNama.get(k) ?? []), r]);
  }
  const baris = hilang
    .map((r) => {
      const baru = (perNama.get(kunciNama(r.l0name)) ?? []).find((x) => (tanggal(x.date) || '') >= p.periode.dari);
      const tempo = tanggal(r.date1);
      const ket: Lencana = baru
        ? { teks: `Top up → akad ${tgl(baru.date)}`, nada: 'jingga' }
        : tempo && tempo <= p.periode.sampai
          ? { teks: 'Lunas jatuh tempo', nada: 'abu' }
          : { teks: 'Lunas dipercepat', nada: 'biru' };
      return { ...barisDebitur(r), ket };
    })
    .sort((a, b) => b.baki - a.baki);
  return {
    paham,
    jawab: {
      tipe: 'tabel',
      judul: `Lunas / ditutup ${p.periode.label}`,
      angkaUtama: `${baris.length} rekening`,
      keterangan: `plafon awal ${rp(hilang.reduce((s, x) => s + n(x.pla), 0))} · baki terakhir ${rp(hilang.reduce((s, x) => s + n(x.baki), 0))}`,
      kolom: kolomDebitur([
        { kunci: 'ket', label: 'Keterangan', jenis: 'lencana', hp: true },
        { kunci: 'baki', label: 'Baki terakhir', jenis: 'uang', hp: true },
        { kunci: 'tempo', label: 'Jatuh tempo', jenis: 'tanggal' },
      ]),
      baris,
      catatan: [`Dibandingkan: MLF ${tgl(awal.jobdate)} dengan MLF ${tgl(akhir.jobdate)}. Rekening yang hilang dianggap lunas atau ditutup.`],
      namaFile: `lunas-${p.periode.dari}`,
      kosong: `Tidak ada rekening yang hilang dari MLF selama ${p.periode.label}.`,
    },
  };
}

function tanggalBayar(p: Extract<Perintah, { jenis: 'tanggal_bayar' }>, rows: MLFRow[], tglData: string): HasilTanya {
  const r = saringUnit(rows, p.unit)
    .filter((x) => kolOf(x) !== 0 && n(x.baki) > 0)
    .map((x) => ({ x, t: tanggalAngsuran(x) }))
    .filter(({ t }) => t.hari === p.tanggal)
    .sort((a, b) => n(b.x.baki) - n(a.x.baki));
  const kira = r.filter(({ t }) => t.perkiraan).length;
  return {
    paham: ['jadwal angsuran', `tanggal ${p.tanggal}`, LABEL_UNIT[p.unit]],
    jawab: {
      tipe: 'tabel',
      judul: `Angsuran tiap tanggal ${p.tanggal}`,
      angkaUtama: `${r.length} rekening`,
      keterangan: `angsuran pokok ±${rp(r.reduce((s, { x }) => s + getAngsuranPokok(x), 0))} · MLF ${tglData}`,
      kolom: kolomDebitur([
        { kunci: 'angsuran', label: 'Angsuran pokok', jenis: 'uang', hp: true },
        { kunci: 'kol', label: 'Kol', jenis: 'lencana', hp: true },
        { kunci: 'tunggakan', label: 'Tunggakan', jenis: 'uang' },
      ]),
      baris: r.map(({ x }) => ({ ...barisDebitur(x), angsuran: getAngsuranPokok(x) })),
      catatan: kira ? [`${kira} rekening belum punya kolom tanggal bayar di MLF, jadi tanggalnya diperkirakan dari tanggal akad.`] : undefined,
      namaFile: `angsuran-tanggal-${p.tanggal}`,
      kosong: `Tidak ada angsuran yang jatuh tiap tanggal ${p.tanggal}.`,
    },
  };
}

function persenJalan(r: MLFRow, hariIni: Date) {
  const tenor = getJangkaWaktuBulan(r);
  if (!r.date || tenor <= 0) return 0;
  const mulai = new Date(r.date);
  const bulan = (hariIni.getFullYear() - mulai.getFullYear()) * 12 + (hariIni.getMonth() - mulai.getMonth());
  return Math.max(0, Math.min(100, (bulan / tenor) * 100));
}

function calonTopup(p: Extract<Perintah, { jenis: 'calon_topup' }>, rows: MLFRow[], d: SumberData, tglData: string): HasilTanya {
  const r = saringUnit(rows, p.unit)
    .filter((x) => kolOf(x) === 1 && tunggakan(x) === 0 && n(x.baki) > 0)
    .map((x) => ({ x, jalan: persenJalan(x, d.hariIni) }))
    .filter(({ jalan }) => jalan >= p.minPersen)
    .sort((a, b) => b.jalan - a.jalan || n(b.x.pla) - n(a.x.pla));
  return {
    paham: ['calon top up', 'kol 1 tanpa tunggakan', `jalan ≥ ${p.minPersen}%`, LABEL_UNIT[p.unit]],
    jawab: {
      tipe: 'tabel',
      judul: 'Calon top up',
      angkaUtama: `${r.length} rekening`,
      keterangan: `angsuran lancar dan sudah berjalan minimal ${p.minPersen}% jangka waktu · MLF ${tglData}`,
      kolom: kolomDebitur([
        { kunci: 'jalan', label: 'Berjalan', jenis: 'persen', hp: true },
        { kunci: 'baki', label: 'Sisa baki', jenis: 'uang', hp: true },
        { kunci: 'plafon', label: 'Plafon', jenis: 'uang' },
        { kunci: 'tempo', label: 'Jatuh tempo', jenis: 'tanggal' },
      ]),
      baris: r.map(({ x, jalan }) => ({ ...barisDebitur(x), jalan })),
      catatan: ['Sisa baki adalah perkiraan dana yang dipakai untuk melunasi kredit lama saat top up.'],
      namaFile: 'calon-top-up',
      kosong: 'Belum ada debitur yang memenuhi syarat.',
    },
  };
}

// ------------------------------------------------------------------ rencana kunjungan
/** Selasa–Kamis mulai besok, sebanyak `perHari` kunjungan per hari. */
function hariKunjungan(mulai: Date, jumlah: number, perHari: number): string[] {
  const hasil: string[] = [];
  const t = new Date(mulai.getFullYear(), mulai.getMonth(), mulai.getDate() + 1);
  while (hasil.length < jumlah) {
    const w = t.getDay();
    if (w >= 2 && w <= 4) for (let i = 0; i < perHari && hasil.length < jumlah; i++) hasil.push(iso(t));
    t.setDate(t.getDate() + 1);
  }
  return hasil;
}

async function rencana(p: Extract<Perintah, { jenis: 'rencana_kunjungan' }>, rows: MLFRow[], d: SumberData, tglData: string): Promise<HasilTanya> {
  const h = d.hariIni;
  const dari = iso(new Date(h.getFullYear(), h.getMonth() - p.bulan, h.getDate()));
  let r = saringUnit(rows, p.unit).filter((x) => {
    const t = tanggal(x.date);
    return t && t >= dari && t <= iso(h) && kolOf(x) !== 0;
  });
  if (p.produktif) r = r.filter(isProduktif);
  const plafonBesar = 100_000_000;
  r.sort((a, b) => Number(tunggakan(b) > 0) - Number(tunggakan(a) > 0) || n(b.pla) - n(a.pla));
  const hari = hariKunjungan(h, r.length, p.perHari);
  let kontak: Record<string, string> = {};
  try {
    kontak = await d.kontak(r.map((x) => x.l0lnno).filter(Boolean) as string[]);
  } catch {
    kontak = {};
  }
  const baris = r.map((x, i) => {
    const jenis = jenisProduktif(x);
    const tujuan = tunggakan(x) > 0
      ? `Tanya kendala bayar, tunggakan ${rp(tunggakan(x))}`
      : jenis === 'Investasi'
        ? 'Cek objek investasi sesuai tujuan kredit'
        : jenis === 'Modal Kerja'
          ? 'Cek usaha & penggunaan dana'
          : 'Konfirmasi debitur & perbarui kontak';
    const catatan: Lencana = tunggakan(x) > 0 || kolOf(x) >= 2
      ? { teks: 'Waspada', nada: 'merah' }
      : n(x.pla) >= plafonBesar
        ? { teks: 'Plafon besar', nada: 'jingga' }
        : { teks: 'Baru', nada: 'biru' };
    return {
      hari: tglHari(hari[i]),
      tanggal: hari[i],
      nama: (x.l0name || '').trim(),
      produk: `Akad ${tgl(x.date)} · ${x.lytitl || jenis} ${rp(n(x.pla))}`,
      tujuan,
      hp: (x.l0lnno && kontak[x.l0lnno]) || '—',
      catatan,
      plafon: n(x.pla),
    };
  });
  const akhir = hari[hari.length - 1];
  return {
    paham: [`kredit cair ${tgl(dari)} – ${tgl(iso(h))}`, LABEL_UNIT[p.unit], p.produktif ? 'produktif' : 'semua jenis', `${p.perHari} kunjungan / hari`],
    jawab: {
      tipe: 'tabel',
      judul: 'Rencana kunjungan',
      angkaUtama: `${baris.length} debitur`,
      keterangan: `MLF ${tglData} · Selasa–Kamis, mulai ${hari[0] ? tglHari(hari[0]) : '—'}`,
      ringkas: [
        { label: 'Total plafon', nilai: rp(r.reduce((s, x) => s + n(x.pla), 0)) },
        { label: 'Selesai', nilai: akhir ? tgl(akhir) : '—' },
        { label: 'Waspada', nilai: String(baris.filter((b) => b.catatan.nada === 'merah').length), nada: baris.some((b) => b.catatan.nada === 'merah') ? 'merah' : 'hijau' },
      ],
      kolom: [
        { kunci: 'hari', label: 'Hari', hp: true },
        { kunci: 'nama', label: 'Debitur', jenis: 'nama', hp: true, sub: 'produk' },
        { kunci: 'tujuan', label: 'Tujuan kunjungan' },
        { kunci: 'hp', label: 'No. HP' },
        { kunci: 'catatan', label: 'Catatan', jenis: 'lencana', hp: true },
      ],
      baris,
      catatan: [
        'Urutan: yang ada tunggakan didahulukan, lalu plafon terbesar. Hari libur nasional belum diperhitungkan, geser sendiri bila perlu.',
        'Monitoring kredit produktif tetap 3 bulan sekali per debitur.',
      ],
      namaFile: `rencana-kunjungan-${iso(h)}`,
      kosong: `Tidak ada kredit${p.produktif ? ' produktif' : ''} yang cair dalam ${p.bulan} bulan terakhir di ${LABEL_UNIT[p.unit]}.`,
    },
  };
}

// ------------------------------------------------------------------ simulasi
const LABEL_LANGKAH = (s: Skenario) =>
  s.aksi === 'kol' ? `${s.nama} → kol ${s.kol}`
    : s.aksi === 'lunas' ? `${s.nama} lunas`
      : s.aksi === 'bayar' ? `${s.nama} bayar tunggakan`
        : s.aksi === 'cair' ? `cair ${rp(s.nominal)}`
          : 'kol 2 → kol 3';

function simulasi(
  p: Extract<Perintah, { jenis: 'simulasi' }>,
  rows: MLFRow[],
  ctx: { kalimat: string; simulasiSebelumnya?: { langkah: Skenario[]; unit: UnitTanya } },
  tglData: string,
): HasilTanya {
  const lama = p.lanjut && ctx.simulasiSebelumnya ? ctx.simulasiSebelumnya : null;
  const unit: UnitTanya = lama && p.unit === 'semua' ? lama.unit : p.unit;

  // cocokkan nama untuk langkah baru
  const final: Skenario[] = [...(lama?.langkah ?? [])];
  for (const s of p.langkah) {
    if (s.aksi === 'kol' || s.aksi === 'lunas' || s.aksi === 'bayar') {
      const c = cariNama(rows, s.nama);
      if (!c.nama.length) {
        return {
          paham: ['simulasi', LABEL_LANGKAH(s)],
          jawab: { tipe: 'teks', teks: `Tidak ada debitur bernama "${s.nama}" di MLF ${tglData}. Coba ketik nama lain atau sebagian namanya saja.` },
        };
      }
      if (!c.persis && c.nama.length > 1) {
        const pola = new RegExp(s.nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        return {
          paham: ['simulasi', LABEL_LANGKAH(s)],
          jawab: pilihNama(`Ada ${c.nama.length} debitur bernama mirip "${s.nama}". Yang mana?`, c.nama, c.rows, (nm) =>
            pola.test(ctx.kalimat) ? ctx.kalimat.replace(pola, `"${nm}"`) : `simulasikan kalau "${nm}" ${s.aksi === 'kol' ? `jadi kol ${s.kol}` : s.aksi === 'lunas' ? 'lunas' : 'bayar tunggakan'}`),
        };
      }
      final.push({ ...s, nama: c.nama[0] });
    } else {
      final.push(s);
    }
  }

  const salin = rows.map((r) => ({ ...r }));
  let data = salin;
  const perubahan: Extract<Jawaban, { tipe: 'simulasi' }>['perubahan'] = [];
  for (const s of final) {
    if (s.aksi === 'kol' || s.aksi === 'lunas' || s.aksi === 'bayar') {
      const kn = kunciNama(s.nama);
      const kena = data.filter((r) => kunciNama(r.l0name) === kn);
      const baki = kena.reduce((a, r) => a + n(r.baki), 0);
      const kolLama = Math.max(0, ...kena.map(kolOf));
      if (s.aksi === 'kol') {
        kena.forEach((r) => { r.kol = s.kol; });
        perubahan.push({ nama: s.nama, ket: `${kena.length} rekening · baki ${rp(baki)}`, sebelum: `Kol ${kolLama}`, sesudah: `Kol ${s.kol}`, nadaSesudah: nadaKol(s.kol) });
      } else if (s.aksi === 'lunas') {
        data = data.filter((r) => kunciNama(r.l0name) !== kn);
        perubahan.push({ nama: s.nama, ket: `${kena.length} rekening · baki ${rp(baki)}`, sebelum: `Kol ${kolLama}`, sesudah: 'Lunas', nadaSesudah: 'abu' });
      } else {
        const tg = kena.reduce((a, r) => a + tunggakan(r), 0);
        kena.forEach((r) => { r.kol = 1; r.tungpk = 0; r.tungbg = 0; });
        perubahan.push({ nama: s.nama, ket: `bayar tunggakan ${rp(tg)}`, sebelum: `Kol ${kolLama}`, sesudah: 'Kol 1', nadaSesudah: 'hijau' });
      }
    } else if (s.aksi === 'cair') {
      data.push({ ...(rows[0] ?? ({} as MLFRow)), id: `sim-${data.length}`, l0name: 'PENCAIRAN BARU (simulasi)', l0lnno: null, kol: 1, baki: s.nominal, pla: s.nominal, tungpk: 0, tungbg: 0, l0narr: unit === 'meranti' ? '/ULM-TLH/' : '/BPD-TLH/' });
      perubahan.push({ nama: 'Pencairan baru', ket: 'masuk sebagai kol 1', sebelum: '—', sesudah: rp(s.nominal), nadaSesudah: 'hijau' });
    } else {
      const kena = data.filter((r) => kolOf(r) === 2 && (unit === 'semua' || getUnit(r) === unit));
      const baki = kena.reduce((a, r) => a + n(r.baki), 0);
      kena.forEach((r) => { r.kol = 3; });
      perubahan.push({ nama: `${kena.length} debitur kol 2`, ket: `tidak bayar sampai akhir bulan · baki ${rp(baki)}`, sebelum: 'Kol 2', sesudah: 'Kol 3', nadaSesudah: 'merah' });
    }
  }

  const sebelum = hitungNpl(saringUnit(rows, unit));
  const sesudah = hitungNpl(saringUnit(data, unit));
  let saran: string | undefined;
  if (sesudah.npl >= 2) {
    const perlu = sesudah.bermasalah - 0.02 * sesudah.dasar;
    saran = `Masih di atas 2%. Butuh perbaikan kol 3–5 (jadi lancar) sekitar ${rp(perlu)} lagi supaya kembali di bawah 2%.`;
  } else if (sebelum.npl >= 2) {
    saran = 'Dengan skenario ini NPL kembali di bawah 2%.';
  }

  return {
    paham: ['simulasi', ...final.map(LABEL_LANGKAH), `NPL ${LABEL_UNIT[unit]}`],
    jawab: {
      tipe: 'simulasi',
      sebelum: { npl: sebelum.npl, bermasalah: sebelum.bermasalah, dasar: sebelum.dasar },
      sesudah: { npl: sesudah.npl, bermasalah: sesudah.bermasalah, dasar: sesudah.dasar },
      unitLabel: unit === 'semua' ? 'KCP Telihan' : LABEL_UNIT[unit],
      perubahan,
      saran,
    },
    simulasi: { langkah: final, unit },
  };
}

function targetNpl(p: Extract<Perintah, { jenis: 'target_npl' }>, rows: MLFRow[], tglData: string): HasilTanya {
  const r = saringUnit(rows, p.unit);
  const h = hitungNpl(r);
  const perlu = h.bermasalah - (p.target / 100) * h.dasar;
  const paham = ['target NPL', `di bawah ${persen(p.target, 1)}`, LABEL_UNIT[p.unit]];
  if (perlu <= 0) {
    return { paham, jawab: { tipe: 'teks', teks: `NPL ${LABEL_UNIT[p.unit]} sekarang ${persen(h.npl)}, sudah di bawah ${persen(p.target, 1)}. Tidak perlu tambahan penagihan.` } };
  }
  const kandidat = r.filter((x) => kolOf(x) >= 3).sort((a, b) => n(b.baki) - n(a.baki));
  let kum = 0;
  let cukupDi = -1;
  const baris = kandidat.map((x, i) => {
    kum += n(x.baki);
    if (cukupDi < 0 && kum >= perlu) cukupDi = i;
    return { ...barisDebitur(x), kumulatif: kum, cukup: cukupDi === i ? { teks: 'Target tercapai', nada: 'hijau' } : cukupDi >= 0 ? { teks: '—', nada: 'abu' } : { teks: 'Perlu', nada: 'jingga' } };
  });
  return {
    paham,
    jawab: {
      tipe: 'tabel',
      judul: `Supaya NPL di bawah ${persen(p.target, 1)}`,
      angkaUtama: rp(perlu),
      keterangan: `baki kol 3–5 yang harus jadi lancar atau lunas · NPL sekarang ${persen(h.npl)} · MLF ${tglData}`,
      ringkas: [
        { label: 'NPL sekarang', nilai: persen(h.npl), nada: nadaNpl(h.npl) },
        { label: 'Baki bermasalah', nilai: rp(h.bermasalah) },
        { label: 'Minimal debitur', nilai: cukupDi >= 0 ? String(cukupDi + 1) : `> ${kandidat.length}` },
      ],
      kolom: kolomDebitur([
        { kunci: 'kol', label: 'Kol', jenis: 'lencana', hp: true },
        { kunci: 'baki', label: 'Baki', jenis: 'uang', hp: true },
        { kunci: 'kumulatif', label: 'Kumulatif', jenis: 'uang' },
        { kunci: 'cukup', label: '', jenis: 'lencana' },
      ]),
      baris,
      catatan: ['Diurutkan dari baki terbesar, jadi jumlah debitur yang perlu ditangani paling sedikit. Baki yang lunas juga mengurangi total baki, jadi angka sebenarnya sedikit lebih kecil.'],
      namaFile: `target-npl-${p.target}`,
    },
  };
}

// ------------------------------------------------------------------ angsuran
function angsuran(p: Extract<Perintah, { jenis: 'angsuran' }>): HasilTanya {
  const anuitas = calcAmortization({ plafon: p.plafon, tenorBulan: p.bulan, bungaPa: p.bunga, skema: 'anuitas' });
  const flat = calcAmortization({ plafon: p.plafon, tenorBulan: p.bulan, bungaPa: p.bunga, skema: 'flat' });
  return {
    paham: ['simulasi angsuran', rp(p.plafon), `${p.bulan} bulan`, `bunga ${persen(p.bunga, 1)} p.a.`],
    jawab: {
      tipe: 'tabel',
      judul: 'Simulasi angsuran (anuitas)',
      angkaUtama: rp(anuitas.summary.angsuranPertama),
      keterangan: `per bulan · total bunga ${rp(anuitas.summary.totalBunga)}`,
      ringkas: [
        { label: 'Flat', nilai: `${rp(flat.summary.angsuranPertama)} / bln` },
        { label: 'Total bayar', nilai: rp(anuitas.summary.totalAngsuran) },
        { label: 'Tenor', nilai: `${p.bulan} bulan` },
      ],
      kolom: [
        { kunci: 'bulan', label: 'Ke', jenis: 'angka', hp: true },
        { kunci: 'pokok', label: 'Pokok', jenis: 'uang' },
        { kunci: 'bunga', label: 'Bunga', jenis: 'uang' },
        { kunci: 'angsuran', label: 'Angsuran', jenis: 'uang', hp: true },
        { kunci: 'saldo', label: 'Sisa', jenis: 'uang', hp: true },
      ],
      baris: anuitas.rows.map((r) => ({ ...r })),
      catatan: ['Hitungan kasar tanpa biaya dan asuransi. Untuk simulasi lengkap pakai menu Kalkulator Kredit.'],
      namaFile: `angsuran-${p.plafon}-${p.bulan}`,
    },
  };
}
