import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentEvent {
  jobdate: string;
  amount: number;
}

export interface ArrearsInfo {
  /** Estimasi hari tunggakan berjalan (DPD) */
  hariTunggak: number | null;
  /** True bila angka hanya batas bawah (riwayat MLF belum mencakup awal tunggakan) */
  hariTunggakMinimal: boolean;
  /** Cara perhitungan dipakai: 'angsuran' (rasio tunggakan/angsuran) atau 'snapshot' */
  metode: 'angsuran' | 'snapshot' | null;
  /** Perkiraan tanggal mulai menunggak */
  mulaiTunggakDate: string | null;
  /** Jumlah angsuran pokok yang tertunggak (pembulatan) */
  angsuranTertunggak: number | null;
  /** Tanggal snapshot MLF saat terjadi pembayaran terakhir */
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  /** Riwayat pembayaran terbaru (maks 5) */
  recentPayments: PaymentEvent[];
  latestJobdate: string | null;
}

interface Snap {
  jobdate: string;
  baki: number;
  tunggakan: number;
  tungpk: number;
  angsuranPokok: number;
}

export interface MLFArrearsRow {
  l0lnno: string | null;
  jobdate: string;
  baki: number | null;
  tungpk: number | null;
  tungbg: number | null;
  pla?: number | null;
  date?: string | null;
  date1?: string | null;
}

const MIN_PAYMENT = 1000; // abaikan pembulatan kecil
const DAY = 86400000;

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY));

const midDate = (a: string, b: string) =>
  new Date((new Date(a).getTime() + new Date(b).getTime()) / 2).toISOString().slice(0, 10);

const monthsBetween = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const d1 = new Date(a);
  const d2 = new Date(b);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const m = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
  return m > 0 ? m : 0;
};

export const buildArrearsMap = (rows: MLFArrearsRow[]) => {
  const byLoan = new Map<string, Snap[]>();
  rows.forEach((r) => {
    if (!r.l0lnno) return;
    const tenor = monthsBetween(r.date, r.date1);
    const pla = Number(r.pla) || 0;
    const list = byLoan.get(r.l0lnno) || [];
    list.push({
      jobdate: r.jobdate,
      baki: Number(r.baki) || 0,
      tungpk: Number(r.tungpk) || 0,
      tunggakan: (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0),
      angsuranPokok: tenor > 0 && pla > 0 ? pla / tenor : 0,
    });
    byLoan.set(r.l0lnno, list);
  });

  const map = new Map<string, ArrearsInfo>();
  byLoan.forEach((snaps, loan) => {
    snaps.sort((a, b) => a.jobdate.localeCompare(b.jobdate));
    const latest = snaps[snaps.length - 1];

    let hariTunggak: number | null = null;
    let minimal = false;
    let metode: ArrearsInfo['metode'] = null;
    let mulaiTunggakDate: string | null = null;
    let angsuranTertunggak: number | null = null;

    if (latest && latest.tunggakan > 0) {
      // ---- estimasi berbasis snapshot ----
      // Cari snapshot bersih terakhir, lalu awal tunggakan diperkirakan di
      // tengah-tengah antara snapshot bersih itu dan snapshot menunggak pertama
      // sesudahnya (snapshot MLF tidak harian, jadi titik tengah lebih akurat).
      let lastCleanIdx = -1;
      for (let i = snaps.length - 1; i >= 0; i--) {
        if (snaps[i].tunggakan <= 0) { lastCleanIdx = i; break; }
      }
      let dpdSnapshot: number | null = null;
      if (lastCleanIdx >= 0 && lastCleanIdx < snaps.length - 1) {
        const startEstimate = midDate(snaps[lastCleanIdx].jobdate, snaps[lastCleanIdx + 1].jobdate);
        dpdSnapshot = daysBetween(startEstimate, latest.jobdate);
        mulaiTunggakDate = startEstimate;
      } else {
        dpdSnapshot = daysBetween(snaps[0].jobdate, latest.jobdate);
        minimal = true;
      }

      // ---- estimasi berbasis rasio tunggakan pokok / angsuran pokok ----
      // DPD ≈ (jumlah angsuran pokok tertunggak) × 30 hari.
      let dpdAngsuran: number | null = null;
      const angs = latest.angsuranPokok;
      if (angs > 0 && latest.tungpk > 0) {
        const nAngsuran = latest.tungpk / angs;
        angsuranTertunggak = Math.round(nAngsuran * 10) / 10;
        dpdAngsuran = Math.round(nAngsuran * 30);
      }

      if (dpdAngsuran !== null && dpdAngsuran > 0) {
        // Rasio angsuran otomatis menyesuaikan pembayaran sebagian
        // (tunggakan berkurang → DPD ikut turun). Snapshot dipakai sebagai
        // batas atas supaya tidak melebihi umur tunggakan yang terekam.
        hariTunggak = dpdSnapshot !== null && !minimal ? Math.min(dpdAngsuran, dpdSnapshot) : dpdAngsuran;
        metode = 'angsuran';
        minimal = false;
        mulaiTunggakDate = new Date(new Date(latest.jobdate).getTime() - hariTunggak * DAY)
          .toISOString()
          .slice(0, 10);
      } else {
        hariTunggak = dpdSnapshot;
        metode = 'snapshot';
      }
    } else if (latest) {
      hariTunggak = 0;
      metode = 'snapshot';
    }

    // ---- pembayaran: penurunan baki debet atau penurunan tunggakan ----
    const payments: PaymentEvent[] = [];
    for (let i = 1; i < snaps.length; i++) {
      const bakiDrop = snaps[i - 1].baki - snaps[i].baki;
      const arrearDrop = snaps[i - 1].tunggakan - snaps[i].tunggakan;
      const amount = Math.max(bakiDrop, arrearDrop > 0 ? arrearDrop : 0);
      if (amount >= MIN_PAYMENT) payments.push({ jobdate: snaps[i].jobdate, amount });
    }
    const last = payments[payments.length - 1];

    map.set(loan, {
      hariTunggak,
      hariTunggakMinimal: minimal,
      metode,
      mulaiTunggakDate,
      angsuranTertunggak,
      lastPaymentDate: last?.jobdate || null,
      lastPaymentAmount: last?.amount || 0,
      recentPayments: payments.slice(-5).reverse(),
      latestJobdate: latest?.jobdate || null,
    });
  });

  return map;
};

/**
 * Membaca riwayat snapshot MLF untuk menghitung lama tunggakan berjalan
 * & pembayaran terakhir per nomor loan.
 */
export const useMLFArrears = (branchCode?: string, jobdateMax?: string) => {
  const brcd = branchCode || '143';
  return useQuery({
    queryKey: ['mlf-arrears-v2', brcd, jobdateMax || 'latest'],
    queryFn: async () => {
      const all: MLFArrearsRow[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        let q = (supabase as any)
          .from('mlf_data')
          .select('l0lnno,jobdate,baki,tungpk,tungbg,pla,date,date1')
          .eq('brcd', brcd)
          .order('jobdate', { ascending: true })
          .range(from, from + PAGE - 1);
        if (jobdateMax) q = q.lte('jobdate', jobdateMax);
        const { data, error } = await q;
        if (error) throw error;
        const chunk = data || [];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
        if (from > 200000) break;
      }
      return buildArrearsMap(all);
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const fmtHariTunggak = (info?: ArrearsInfo) => {
  if (!info || info.hariTunggak === null) return '-';
  if (info.hariTunggak === 0) return '0';
  return `${info.hariTunggakMinimal ? '≥' : ''}${info.hariTunggak}`;
};
