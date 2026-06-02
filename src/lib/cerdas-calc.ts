// Program CERDAS — Promo CERDAS Divisi Kredit Ritel & Konsumer Bankaltimtara.
// 3 skema: debitur_baru, take_over, top_up.
// - debitur_baru & take_over: gratis AJK sesuai cap tier plafon.
// - top_up: diskon provisi (mis. 50%), tidak ada subsidi AJK.

export interface CerdasConfig {
  id: number;
  nama_program: string;
  aktif: boolean;
  periode_mulai: string;
  periode_selesai: string;
  bunga_debitur_baru: number;
  bunga_take_over: number;
  bunga_top_up: number;
  diskon_provisi_top_up_pct: number;
  cap_tier_1: number;
  cap_tier_2: number;
  cap_tier_3: number;
  plafon_tier_1_max: number;
  plafon_tier_2_max: number;
  plafon_tier_3_max: number;
}

export type CerdasSkema = 'debitur_baru' | 'take_over' | 'top_up';

export interface CerdasTier {
  tier: 1 | 2 | 3;
  label: string;
  cap: number;
}

export const CERDAS_SKEMA_LABEL: Record<CerdasSkema, string> = {
  debitur_baru: 'Debitur Baru',
  take_over: 'Take Over',
  top_up: 'Top Up',
};

export function isCerdasActive(cfg: CerdasConfig | null | undefined, tanggalAkad?: string): boolean {
  if (!cfg?.aktif) return false;
  if (!tanggalAkad) return true;
  const d = new Date(tanggalAkad).getTime();
  return d >= new Date(cfg.periode_mulai).getTime() && d <= new Date(cfg.periode_selesai).getTime();
}

export function getCerdasTier(plafon: number, cfg: CerdasConfig): CerdasTier | null {
  if (plafon <= 0) return null;
  if (plafon <= cfg.plafon_tier_1_max) return { tier: 1, label: `Tier 1 — ≤ Rp ${(cfg.plafon_tier_1_max / 1_000_000).toFixed(0)} jt`, cap: cfg.cap_tier_1 };
  if (plafon <= cfg.plafon_tier_2_max) return { tier: 2, label: `Tier 2 — Rp ${(cfg.plafon_tier_1_max / 1_000_000).toFixed(0)}–${(cfg.plafon_tier_2_max / 1_000_000).toFixed(0)} jt`, cap: cfg.cap_tier_2 };
  if (plafon <= cfg.plafon_tier_3_max) return { tier: 3, label: `Tier 3 — Rp ${(cfg.plafon_tier_2_max / 1_000_000).toFixed(0)}–${(cfg.plafon_tier_3_max / 1_000_000).toFixed(0)} jt`, cap: cfg.cap_tier_3 };
  return null;
}

export function getCerdasBunga(skema: CerdasSkema, cfg: CerdasConfig): number {
  if (skema === 'debitur_baru') return cfg.bunga_debitur_baru;
  if (skema === 'take_over') return cfg.bunga_take_over;
  return cfg.bunga_top_up;
}

export interface CerdasApplyInput {
  skema: CerdasSkema;
  plafon: number;
  premiAsuransiAktual: number; // Rp (dari Al-Amin atau manual)
  provisiPctAsli: number;
  cfg: CerdasConfig;
}

export interface CerdasApplyResult {
  skema: CerdasSkema;
  skemaLabel: string;
  bungaFinal: number;
  provisiFinalPct: number;
  diskonProvisiPct: number;
  tier: CerdasTier | null;
  capSubsidi: number;
  subsidiBank: number;
  selisihDebitur: number; // ini yang debitur bayar (jadi nominal asuransi efektif)
  premiAsuransiAktual: number;
  status: 'gratis' | 'selisih' | 'tidak-eligible-tier' | 'tanpa-subsidi-ajk';
  pesan: string;
}

export function applyCerdas(input: CerdasApplyInput): CerdasApplyResult {
  const { skema, plafon, premiAsuransiAktual, provisiPctAsli, cfg } = input;
  const skemaLabel = CERDAS_SKEMA_LABEL[skema];
  const bungaFinal = getCerdasBunga(skema, cfg);

  // Top Up: diskon provisi, tidak ada subsidi AJK
  if (skema === 'top_up') {
    const diskon = cfg.diskon_provisi_top_up_pct;
    const provisiFinal = provisiPctAsli * (1 - diskon / 100);
    return {
      skema,
      skemaLabel,
      bungaFinal,
      provisiFinalPct: provisiFinal,
      diskonProvisiPct: diskon,
      tier: null,
      capSubsidi: 0,
      subsidiBank: 0,
      selisihDebitur: premiAsuransiAktual, // tetap dibayar debitur penuh
      premiAsuransiAktual,
      status: 'tanpa-subsidi-ajk',
      pesan: `Bunga promo ${bungaFinal}% p.a. fixed + diskon provisi ${diskon}%. Premi asuransi dibayar debitur penuh.`,
    };
  }

  // Debitur Baru / Take Over: subsidi AJK sesuai cap tier
  const tier = getCerdasTier(plafon, cfg);
  if (!tier) {
    return {
      skema,
      skemaLabel,
      bungaFinal,
      provisiFinalPct: provisiPctAsli,
      diskonProvisiPct: 0,
      tier: null,
      capSubsidi: 0,
      subsidiBank: 0,
      selisihDebitur: premiAsuransiAktual,
      premiAsuransiAktual,
      status: 'tidak-eligible-tier',
      pesan: `Plafon di luar tier subsidi (maks Rp ${(cfg.plafon_tier_3_max / 1_000_000).toFixed(0)} jt). Bunga promo tetap berlaku, AJK dibayar normal.`,
    };
  }

  const subsidiBank = Math.min(premiAsuransiAktual, tier.cap);
  const selisih = Math.max(0, premiAsuransiAktual - tier.cap);
  const status: CerdasApplyResult['status'] = selisih === 0 ? 'gratis' : 'selisih';

  return {
    skema,
    skemaLabel,
    bungaFinal,
    provisiFinalPct: provisiPctAsli,
    diskonProvisiPct: 0,
    tier,
    capSubsidi: tier.cap,
    subsidiBank,
    selisihDebitur: selisih,
    premiAsuransiAktual,
    status,
    pesan:
      status === 'gratis'
        ? `Premi masih dalam cap subsidi ${tier.label}. Debitur GRATIS AJK — bank menanggung penuh.`
        : `Premi melebihi cap ${tier.label}. Selisih ${formatRp(selisih)} dibebankan ke debitur.`,
  };
}

const formatRp = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
