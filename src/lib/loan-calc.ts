// Pure calculation functions for the loan calculator.
// All money is integer rupiah; rates are in percent per annum (e.g., 12 = 12%).

/**
 * Skema perhitungan angsuran:
 * - `sliding`  : pokok tetap (P/n), bunga dihitung dari saldo sisa → angsuran menurun tiap bulan.
 * - `efektif`  : efektif rata-rata — total bunga sama dengan sliding, tetapi pokok dan bunga
 *                dibagi rata sehingga angsuran tetap sampai akhir.
 * - `anuitas`  : angsuran tetap; bunga besar & pokok kecil di awal, berbalik di akhir.
 * - `flat`     : bunga tetap dihitung dari plafon awal tiap bulan, pokok tetap.
 */
export type LoanSkema = 'anuitas' | 'efektif' | 'sliding' | 'flat';

export const SKEMA_LABELS: Record<LoanSkema, string> = {
  anuitas: 'Anuitas',
  efektif: 'Efektif Rata-rata',
  sliding: 'Sliding (Menurun)',
  flat: 'Flat',
};

export const SKEMA_DESKRIPSI: Record<LoanSkema, string> = {
  anuitas: 'Angsuran tetap, bunga besar di awal dan pokok besar di akhir',
  efektif: 'Bunga efektif dibagi rata — pokok dan bunga tetap sampai akhir',
  sliding: 'Pokok tetap, bunga menurun mengikuti saldo — angsuran menurun',
  flat: 'Bunga tetap dihitung dari plafon awal — angsuran tetap',
};

export interface AmortRow {
  bulan: number;
  tanggal: string; // ISO date
  pokok: number;
  bunga: number;
  angsuran: number;
  saldo: number;
}

export interface CalcInput {
  plafon: number;
  tenorBulan: number;
  bungaPa: number; // % p.a.
  skema: LoanSkema;
  tanggalAkad?: string | Date; // for amortization table dates
}

export interface CalcSummary {
  angsuranPertama: number;
  angsuranTerakhir: number;
  totalAngsuran: number;
  totalBunga: number;
}

export interface CalcResult {
  rows: AmortRow[];
  summary: CalcSummary;
}

const round = (n: number) => Math.round(n);

const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export function calcAmortization(input: CalcInput): CalcResult {
  const { plafon, tenorBulan, bungaPa, skema } = input;
  const r = bungaPa / 100 / 12;
  const akad = input.tanggalAkad ? new Date(input.tanggalAkad) : new Date();

  const rows: AmortRow[] = [];
  let saldo = plafon;

  if (skema === 'anuitas') {
    const angsuran = r === 0 ? plafon / tenorBulan : (plafon * r) / (1 - Math.pow(1 + r, -tenorBulan));
    for (let i = 1; i <= tenorBulan; i++) {
      const bunga = saldo * r;
      let pokok = angsuran - bunga;
      if (i === tenorBulan) pokok = saldo; // ensure last installment closes balance
      const angAct = pokok + bunga;
      saldo = Math.max(0, saldo - pokok);
      rows.push({
        bulan: i,
        tanggal: isoDate(addMonths(akad, i)),
        pokok: round(pokok),
        bunga: round(bunga),
        angsuran: round(angAct),
        saldo: round(saldo),
      });
    }
  } else if (skema === 'efektif') {
    const pokokTetap = plafon / tenorBulan;
    for (let i = 1; i <= tenorBulan; i++) {
      const bunga = saldo * r;
      const pokok = i === tenorBulan ? saldo : pokokTetap;
      saldo = Math.max(0, saldo - pokok);
      rows.push({
        bulan: i,
        tanggal: isoDate(addMonths(akad, i)),
        pokok: round(pokok),
        bunga: round(bunga),
        angsuran: round(pokok + bunga),
        saldo: round(saldo),
      });
    }
  } else {
    // sliding (flat declining): bunga konstan dari plafon awal
    const pokokTetap = plafon / tenorBulan;
    const bungaTetap = plafon * r;
    for (let i = 1; i <= tenorBulan; i++) {
      const pokok = i === tenorBulan ? saldo : pokokTetap;
      saldo = Math.max(0, saldo - pokok);
      rows.push({
        bulan: i,
        tanggal: isoDate(addMonths(akad, i)),
        pokok: round(pokok),
        bunga: round(bungaTetap),
        angsuran: round(pokok + bungaTetap),
        saldo: round(saldo),
      });
    }
  }

  const totalAngsuran = rows.reduce((s, r) => s + r.angsuran, 0);
  const totalBunga = rows.reduce((s, r) => s + r.bunga, 0);
  return {
    rows,
    summary: {
      angsuranPertama: rows[0]?.angsuran ?? 0,
      angsuranTerakhir: rows[rows.length - 1]?.angsuran ?? 0,
      totalAngsuran,
      totalBunga,
    },
  };
}

// Potongan di muka. `asuransiNominal` adalah nominal premi (Rp) yang sudah dihitung
// di luar (manual input atau hasil Al-Amin), bukan persen.
// Biaya lain-lain kini dinamis (bisa ditambah/hapus di konfigurasi produk).
export interface BiayaItem {
  label: string;
  nominal: number;
}

export interface PotonganInput {
  plafon: number;
  asuransiNominal: number;
  provisiPct: number; // % dari plafon
  biayaItems?: BiayaItem[];
  /** @deprecated pakai biayaItems */
  biayaNotaris?: number;
  /** @deprecated pakai biayaItems */
  biayaPerikatan?: number;
  blokirAngsuran: number; // 0/1/2
  angsuranPertama: number;
}

export interface PotonganResult {
  asuransi: number;
  provisi: number;
  biaya: BiayaItem[];
  biayaTotal: number;
  /** kompatibilitas data lama */
  notaris: number;
  /** kompatibilitas data lama */
  perikatan: number;
  blokir: number;
  total: number;
  danaDiterima: number;
}

export function calcPotongan(p: PotonganInput): PotonganResult {
  const asuransi = Math.max(0, Math.round(p.asuransiNominal || 0));
  const provisi = round((p.provisiPct / 100) * p.plafon);

  const legacy: BiayaItem[] = [];
  if (p.biayaNotaris) legacy.push({ label: 'Biaya Notaris', nominal: p.biayaNotaris });
  if (p.biayaPerikatan) legacy.push({ label: 'Biaya Perikatan', nominal: p.biayaPerikatan });

  const biaya = (p.biayaItems && p.biayaItems.length ? p.biayaItems : legacy)
    .filter((b) => b && (b.label || b.nominal))
    .map((b) => ({ label: b.label || 'Biaya', nominal: Math.max(0, Math.round(b.nominal || 0)) }));

  const biayaTotal = biaya.reduce((s, b) => s + b.nominal, 0);
  const notaris = biaya.find((b) => /notaris/i.test(b.label))?.nominal ?? 0;
  const perikatan = biaya.find((b) => /perikatan|apht|fidusia/i.test(b.label))?.nominal ?? 0;

  const blokir = round((p.blokirAngsuran || 0) * p.angsuranPertama);
  const total = asuransi + provisi + biayaTotal + blokir;
  return {
    asuransi,
    provisi,
    biaya,
    biayaTotal,
    notaris,
    perikatan,
    blokir,
    total,
    danaDiterima: p.plafon - total,
  };
}

// ================= DSR =================
export type DsrBasis = 'gaji' | 'ttp';

export interface DsrInput {
  basis: DsrBasis;
  gajiPokok: number;
  ttp: number;
  /** persentase maksimal DSR sesuai konfigurasi produk (gaji default 100, ttp default 30) */
  maxPct: number;
  /** nilai Angsuran Gaji (jika ada) */
  angsuranGaji?: number;
  /** nilai Angsuran Praja (AP, jika ada) */
  angsuranPraja?: number;
  angsuranPertama?: number;
}

export interface DsrResult {
  basis: DsrBasis;
  basisNilai: number;
  maxPct: number;
  /** selisih AG = angsuran gaji − gaji pokok (hanya jika positif) */
  selisihAG: number;
  angsuranPraja: number;
  maxAngsuran: number;
  dsrPct: number;
  aman: boolean | null;
  label: string;
}

export function calcDsr(i: DsrInput): DsrResult {
  const gajiPokok = Math.max(0, i.gajiPokok || 0);
  const ttp = Math.max(0, i.ttp || 0);
  const ag = Math.max(0, i.angsuranGaji || 0);
  const ap = Math.max(0, i.angsuranPraja || 0);
  const selisihAG = Math.max(0, ag - gajiPokok);
  const angsuran = Math.max(0, i.angsuranPertama || 0);

  let basisNilai: number;
  let maxAngsuran: number;
  if (i.basis === 'ttp') {
    basisNilai = ttp;
    maxAngsuran = Math.max(0, Math.round((ttp * (i.maxPct || 30)) / 100) - selisihAG - ap);
  } else {
    basisNilai = gajiPokok + ttp;
    maxAngsuran = Math.round((gajiPokok * (i.maxPct || 100)) / 100);
  }

  return {
    basis: i.basis,
    basisNilai,
    maxPct: i.maxPct,
    selisihAG,
    angsuranPraja: ap,
    maxAngsuran,
    dsrPct: basisNilai > 0 && angsuran > 0 ? (angsuran / basisNilai) * 100 : 0,
    aman: maxAngsuran > 0 && angsuran > 0 ? angsuran <= maxAngsuran : null,
    label:
      i.basis === 'ttp'
        ? `TTP (maks ${i.maxPct || 30}% TTP${selisihAG || ap ? ' − AG/AP' : ''})`
        : `GAJI (maks ${i.maxPct || 100}% Gaji Pokok)`,
  };
}


// Pelunasan dipercepat di bulan ke-N
export function calcPelunasan(rows: AmortRow[], bulanKe: number) {
  if (bulanKe < 1 || bulanKe > rows.length) return null;
  // Sisa pokok setelah bayar angsuran ke (bulanKe - 1)
  const sisaPokok = bulanKe === 1 ? rows[0].pokok + rows[0].saldo : rows[bulanKe - 2].saldo;
  // Bunga berjalan = bunga bulan ke-N
  const bungaBerjalan = rows[bulanKe - 1].bunga;
  return {
    bulanKe,
    sisaPokok,
    bungaBerjalan,
    totalPelunasan: sisaPokok + bungaBerjalan,
  };
}

// Pensiun
export interface PensiunInfo {
  umurTahun: number;
  umurBulan: number;
  tanggalPensiun: string; // ISO
  sisaTahun: number;
  sisaBulan: number;
  sisaBulanTotal: number;
  sudahPensiun: boolean;
}

export function calcPensiun(tglLahir: string | Date, usiaPensiun: number): PensiunInfo {
  const lahir = new Date(tglLahir);
  const now = new Date();
  let umurT = now.getFullYear() - lahir.getFullYear();
  let umurB = now.getMonth() - lahir.getMonth();
  if (now.getDate() < lahir.getDate()) umurB -= 1;
  if (umurB < 0) {
    umurT -= 1;
    umurB += 12;
  }
  const tglPensiun = new Date(lahir);
  tglPensiun.setFullYear(lahir.getFullYear() + usiaPensiun);
  const sisaBulanTotal = Math.max(
    0,
    (tglPensiun.getFullYear() - now.getFullYear()) * 12 + (tglPensiun.getMonth() - now.getMonth())
  );
  return {
    umurTahun: umurT,
    umurBulan: umurB,
    tanggalPensiun: isoDate(tglPensiun),
    sisaTahun: Math.floor(sisaBulanTotal / 12),
    sisaBulan: sisaBulanTotal % 12,
    sisaBulanTotal,
    sudahPensiun: tglPensiun <= now,
  };
}

// ================= PPPK (masa kontrak berdasarkan SK) =================
export type PPPKJenis = 'penuh' | 'paruh';

export interface PPPKInfo {
  jenis: PPPKJenis;
  masaKontrakBulan: number; // 60 (penuh) / 12 (paruh)
  capTenor: number; // 59 (penuh) / 10 (paruh)
  tanggalSk: string;
  tanggalBerakhir: string; // 1 hari sebelum SK + masa kontrak
  sisaBulanTotal: number; // sisa bulan dari tanggal referensi sampai berakhir
  sisaTahun: number;
  sisaBulan: number;
  maxTenor: number; // min(sisaBulanTotal, capTenor)
  sudahBerakhir: boolean;
}

/** Deteksi jenis PPPK dari label pilihan karir */
export function detectPPPK(pilihanKarir?: string | null): PPPKJenis | null {
  const s = (pilihanKarir || '').toLowerCase();
  if (!s.includes('pppk')) return null;
  if (s.includes('paruh')) return 'paruh';
  if (s.includes('penuh')) return 'penuh';
  return null;
}

export function calcPPPK(tglSk: string | Date, jenis: PPPKJenis, refDate?: string | Date): PPPKInfo {
  const sk = new Date(tglSk);
  const ref = refDate ? new Date(refDate) : new Date();
  const masaKontrakBulan = jenis === 'penuh' ? 60 : 12;
  const capTenor = jenis === 'penuh' ? 59 : 10;

  const akhir = addMonths(sk, masaKontrakBulan);
  akhir.setDate(akhir.getDate() - 1); // mis. SK 01 Feb 2025 → berakhir 31 Jan 2030

  let sisa = (akhir.getFullYear() - ref.getFullYear()) * 12 + (akhir.getMonth() - ref.getMonth());
  if (akhir.getDate() < ref.getDate()) sisa -= 1;
  sisa = Math.max(0, sisa);

  return {
    jenis,
    masaKontrakBulan,
    capTenor,
    tanggalSk: isoDate(sk),
    tanggalBerakhir: isoDate(akhir),
    sisaBulanTotal: sisa,
    sisaTahun: Math.floor(sisa / 12),
    sisaBulan: sisa % 12,
    maxTenor: Math.min(sisa, capTenor),
    sudahBerakhir: akhir <= ref,
  };
}


// Reverse calc: max plafon yang memenuhi DSR target dari gaji
export function calcMaxPlafonByDSR(input: {
  gaji: number;
  dsrPct: number; // mis 40
  tenorBulan: number;
  bungaPa: number;
  skema: LoanSkema;
}): number {
  const angsuranMax = (input.dsrPct / 100) * input.gaji;
  if (angsuranMax <= 0 || input.tenorBulan <= 0) return 0;
  const r = input.bungaPa / 100 / 12;
  if (input.skema === 'anuitas') {
    if (r === 0) return Math.floor(angsuranMax * input.tenorBulan);
    return Math.floor((angsuranMax * (1 - Math.pow(1 + r, -input.tenorBulan))) / r);
  }
  if (input.skema === 'sliding') {
    // angsuran = P/n + P*r → P = ang / (1/n + r)
    return Math.floor(angsuranMax / (1 / input.tenorBulan + r));
  }
  // efektif: angsuran pertama = P/n + P*r (terbesar) → ambil sebagai cap
  return Math.floor(angsuranMax / (1 / input.tenorBulan + r));
}

export const fmtRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export const fmtNumber = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);
