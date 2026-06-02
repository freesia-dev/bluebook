// Pure calculation functions for the loan calculator.
// All money is integer rupiah; rates are in percent per annum (e.g., 12 = 12%).

export type LoanSkema = 'anuitas' | 'efektif' | 'sliding';

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

// Potongan di muka
export interface PotonganInput {
  plafon: number;
  tenorBulan: number;
  asuransiPct: number; // % dari plafon × tahun
  provisiPct: number; // % dari plafon
  biayaNotaris: number;
  biayaPerikatan: number;
  blokirAngsuran: number; // 0/1/2
  angsuranPertama: number;
}

export interface PotonganResult {
  asuransi: number;
  provisi: number;
  notaris: number;
  perikatan: number;
  blokir: number;
  total: number;
  danaDiterima: number;
}

export function calcPotongan(p: PotonganInput): PotonganResult {
  const tahun = p.tenorBulan / 12;
  const asuransi = round((p.asuransiPct / 100) * p.plafon * tahun);
  const provisi = round((p.provisiPct / 100) * p.plafon);
  const notaris = p.biayaNotaris || 0;
  const perikatan = p.biayaPerikatan || 0;
  const blokir = round((p.blokirAngsuran || 0) * p.angsuranPertama);
  const total = asuransi + provisi + notaris + perikatan + blokir;
  return {
    asuransi,
    provisi,
    notaris,
    perikatan,
    blokir,
    total,
    danaDiterima: p.plafon - total,
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
