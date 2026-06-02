// Al-Amin (AT TA'MIN UM) insurance calculation engine.
// Matches the Excel workbook logic:
//   Umur          = ROUND((Tgl Akad − Tgl Lahir) / 365.25, 0)
//   Tarif         = VLOOKUP(umur, tarif matrix, tenor)
//   Premi Gross   = Tarif × Plafon / 1000  (min Rp 5.000)
//   Ujroh Gross   = ujrohPct% × Premi Gross
//   Pajak         = pajakPct% × Ujroh Gross
//   Ujroh Net     = Ujroh Gross − Pajak     (feebase bank)
//   Premi Net     = Premi Gross − Ujroh Net (bank → Al-Amin)

export type TarifMap = Map<number, Map<number, number>>;

export interface AlaminConfig {
  ujroh_pct: number;
  pajak_pct: number;
  premi_min: number;
  x_plus_n_default: number;
}

export interface AlaminUWRule {
  id: string;
  urutan: number;
  kode: string;
  keterangan: string;
  umur_min: number;
  umur_max: number;
  plafon_min: number;
  plafon_max: number;
  tenor_max_bulan: number | null;
  x_plus_n: number;
}

export interface AlaminResult {
  umur: number;
  rate: number;          // per 1.000 UP
  premiGross: number;    // dipakai sebagai nominal asuransi (potongan)
  ujrohGross: number;
  pajak: number;
  ujrohNet: number;      // feebase bank
  premiNet: number;      // bank → Al-Amin
  cappedToMin: boolean;
}

export interface UWResult {
  rule: AlaminUWRule | null;
  kode: string;          // 'NM' | 'A' | 'B' | 'C' | 'D' | 'E' | 'TOLAK'
  keterangan: string;
  status: 'aman' | 'medis' | 'tolak';
  xPlusN: number;        // umur + tenor (tahun)
  xPlusNMax: number;
  xPlusNOk: boolean;
}

export function calcUmur(tglLahir: string | Date, tglAkad: string | Date): number {
  const lahir = new Date(tglLahir).getTime();
  const akad = new Date(tglAkad).getTime();
  const tahun = (akad - lahir) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(tahun);
}

/** Lookup tarif. Falls back to nearest lower tenor in same age if exact missing. */
export function lookupTarif(umur: number, tenorBulan: number, tarif: TarifMap): number | null {
  const ageMap = tarif.get(umur);
  if (!ageMap) return null;
  if (ageMap.has(tenorBulan)) return ageMap.get(tenorBulan)!;
  // fallback: nearest lower tenor that exists
  let best: number | null = null;
  let bestT = -1;
  for (const [t, r] of ageMap) {
    if (t <= tenorBulan && t > bestT) { bestT = t; best = r; }
  }
  return best;
}

export function calcAlamin(input: {
  plafon: number;
  umur: number;
  tenorBulan: number;
  config: AlaminConfig;
  tarif: TarifMap;
}): AlaminResult | null {
  const { plafon, umur, tenorBulan, config, tarif } = input;
  const rate = lookupTarif(umur, tenorBulan, tarif);
  if (rate == null || rate <= 0) return null;
  let premiGross = Math.round((rate * plafon) / 1000);
  let cappedToMin = false;
  if (premiGross < config.premi_min) {
    premiGross = config.premi_min;
    cappedToMin = true;
  }
  const ujrohGross = Math.round((config.ujroh_pct / 100) * premiGross);
  const pajak = Math.round((config.pajak_pct / 100) * ujrohGross);
  const ujrohNet = ujrohGross - pajak;
  const premiNet = premiGross - ujrohNet;
  return { umur, rate, premiGross, ujrohGross, pajak, ujrohNet, premiNet, cappedToMin };
}

export function cekUnderwriting(
  umur: number,
  plafon: number,
  tenorBulan: number,
  rules: AlaminUWRule[],
  xPlusNDefault = 70
): UWResult {
  const sorted = [...rules].sort((a, b) => a.urutan - b.urutan);
  const match = sorted.find(
    (r) =>
      umur >= r.umur_min &&
      umur <= r.umur_max &&
      plafon >= r.plafon_min &&
      plafon <= r.plafon_max
  );
  const xPlusN = umur + Math.ceil(tenorBulan / 12);
  const xPlusNMax = match?.x_plus_n ?? xPlusNDefault;
  const xPlusNOk = xPlusN <= xPlusNMax;
  if (!match) {
    return {
      rule: null,
      kode: 'TOLAK',
      keterangan: 'Tidak ditemukan aturan underwriting (usia/plafon di luar range)',
      status: 'tolak',
      xPlusN,
      xPlusNMax,
      xPlusNOk,
    };
  }
  if (match.tenor_max_bulan && tenorBulan > match.tenor_max_bulan) {
    return {
      rule: match,
      kode: 'TOLAK',
      keterangan: `Tenor melebihi maksimum (${match.tenor_max_bulan} bln) untuk kategori ini`,
      status: 'tolak',
      xPlusN,
      xPlusNMax,
      xPlusNOk,
    };
  }
  if (!xPlusNOk) {
    return {
      rule: match,
      kode: 'TOLAK',
      keterangan: `Usia + masa kredit (${xPlusN}) melebihi batas (${xPlusNMax})`,
      status: 'tolak',
      xPlusN,
      xPlusNMax,
      xPlusNOk,
    };
  }
  const status: UWResult['status'] = match.kode === 'NM' ? 'aman' : 'medis';
  return {
    rule: match,
    kode: match.kode,
    keterangan: match.keterangan,
    status,
    xPlusN,
    xPlusNMax,
    xPlusNOk,
  };
}
