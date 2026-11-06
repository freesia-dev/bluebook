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
  /** Riwayat pembayaran terbaru (maks 5), terbaru dulu */
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

/* -------------------------------------------------------------------------- */
/*  Penaksiran hari tunggakan                                                 */
/*                                                                            */
/*  Dipakai dua jalur sekaligus — hasil ringkasan dari database maupun         */
/*  perhitungan di browser — supaya angkanya tidak pernah berbeda antara       */
/*  keduanya.                                                                  */
/* -------------------------------------------------------------------------- */

interface BahanTaksir {
  latestJobdate: string;
  firstJobdate: string;
  tunggakan: number;
  tungpk: number;
  angsuranPokok: number;
  /** Snapshot terakhir yang masih lancar, bila ada */
  cleanJobdate: string | null;
  /** Snapshot menunggak pertama sesudah snapshot lancar itu */
  dirtyJobdate: string | null;
  payments: PaymentEvent[];
}

const taksir = (b: BahanTaksir): ArrearsInfo => {
  let hariTunggak: number | null = null;
  let minimal = false;
  let metode: ArrearsInfo['metode'] = null;
  let mulaiTunggakDate: string | null = null;
  let angsuranTertunggak: number | null = null;

  if (b.tunggakan > 0) {
    // ---- estimasi berbasis snapshot ----
    // Awal tunggakan diperkirakan di tengah-tengah antara snapshot lancar
    // terakhir dan snapshot menunggak pertama sesudahnya (snapshot MLF tidak
    // harian, jadi titik tengah lebih mendekati).
    let dpdSnapshot: number;
    if (b.cleanJobdate && b.dirtyJobdate) {
      const startEstimate = midDate(b.cleanJobdate, b.dirtyJobdate);
      dpdSnapshot = daysBetween(startEstimate, b.latestJobdate);
      mulaiTunggakDate = startEstimate;
    } else {
      dpdSnapshot = daysBetween(b.firstJobdate, b.latestJobdate);
      minimal = true;
    }

    // ---- estimasi berbasis rasio tunggakan pokok / angsuran pokok ----
    // DPD ≈ (jumlah angsuran pokok tertunggak) × 30 hari.
    let dpdAngsuran: number | null = null;
    if (b.angsuranPokok > 0 && b.tungpk > 0) {
      const nAngsuran = b.tungpk / b.angsuranPokok;
      angsuranTertunggak = Math.round(nAngsuran * 10) / 10;
      dpdAngsuran = Math.round(nAngsuran * 30);
    }

    if (dpdAngsuran !== null && dpdAngsuran > 0) {
      // Rasio angsuran otomatis menyesuaikan pembayaran sebagian (tunggakan
      // berkurang → DPD ikut turun). Snapshot dipakai sebagai batas atas supaya
      // tidak melebihi umur tunggakan yang terekam.
      hariTunggak = !minimal ? Math.min(dpdAngsuran, dpdSnapshot) : dpdAngsuran;
      metode = 'angsuran';
      minimal = false;
      mulaiTunggakDate = new Date(new Date(b.latestJobdate).getTime() - hariTunggak * DAY)
        .toISOString()
        .slice(0, 10);
    } else {
      hariTunggak = dpdSnapshot;
      metode = 'snapshot';
    }
  } else {
    hariTunggak = 0;
    metode = 'snapshot';
  }

  const last = b.payments[0];
  return {
    hariTunggak,
    hariTunggakMinimal: minimal,
    metode,
    mulaiTunggakDate,
    angsuranTertunggak,
    lastPaymentDate: last?.jobdate || null,
    lastPaymentAmount: last?.amount || 0,
    recentPayments: b.payments.slice(0, 5),
    latestJobdate: b.latestJobdate,
  };
};

/** Jalur cadangan: hitung dari baris mentah di browser. */
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
    if (!latest) return;

    let cleanJobdate: string | null = null;
    let dirtyJobdate: string | null = null;
    for (let i = snaps.length - 1; i >= 0; i--) {
      if (snaps[i].tunggakan <= 0) {
        cleanJobdate = snaps[i].jobdate;
        dirtyJobdate = i < snaps.length - 1 ? snaps[i + 1].jobdate : null;
        break;
      }
    }

    const payments: PaymentEvent[] = [];
    for (let i = 1; i < snaps.length; i++) {
      const bakiDrop = snaps[i - 1].baki - snaps[i].baki;
      const arrearDrop = snaps[i - 1].tunggakan - snaps[i].tunggakan;
      const amount = Math.max(bakiDrop, arrearDrop > 0 ? arrearDrop : 0);
      if (amount >= MIN_PAYMENT) payments.push({ jobdate: snaps[i].jobdate, amount });
    }

    map.set(loan, taksir({
      latestJobdate: latest.jobdate,
      firstJobdate: snaps[0].jobdate,
      tunggakan: latest.tunggakan,
      tungpk: latest.tungpk,
      angsuranPokok: latest.angsuranPokok,
      cleanJobdate,
      dirtyJobdate,
      payments: payments.slice(-5).reverse(),
    }));
  });

  return map;
};

/* -------------------------------------------------------------------------- */

interface BarisRpc {
  l0lnno: string;
  latest_jobdate: string;
  first_jobdate: string;
  tunggakan: number | string | null;
  tungpk: number | string | null;
  angsuran_pokok: number | string | null;
  clean_jobdate: string | null;
  dirty_jobdate: string | null;
  payments: { jobdate: string; amount: number | string }[] | null;
}

export const buildDariRpc = (rows: BarisRpc[]) => {
  const map = new Map<string, ArrearsInfo>();
  rows.forEach((r) => {
    if (!r.l0lnno || !r.latest_jobdate) return;
    map.set(r.l0lnno, taksir({
      latestJobdate: r.latest_jobdate,
      firstJobdate: r.first_jobdate || r.latest_jobdate,
      tunggakan: Number(r.tunggakan) || 0,
      tungpk: Number(r.tungpk) || 0,
      angsuranPokok: Number(r.angsuran_pokok) || 0,
      cleanJobdate: r.clean_jobdate,
      dirtyJobdate: r.dirty_jobdate,
      payments: (r.payments || []).map((p) => ({
        jobdate: String(p.jobdate).slice(0, 10),
        amount: Number(p.amount) || 0,
      })),
    }));
  });
  return map;
};

/** Fungsi database belum dipasang (SQL manual belum dijalankan). */
const rpcBelumAda = (error: any) =>
  error?.code === 'PGRST202' || /function .*mlf_arrears.* does not exist/i.test(error?.message || '');

/**
 * Batas riwayat untuk jalur cadangan di browser. Jalur ini hanya dipakai bila
 * fungsi database belum dipasang, dan tanpa batas ia menarik puluhan ribu
 * baris — itulah yang dulu membuat kolomnya "menghitung…" tanpa henti.
 */
const BULAN_RIWAYAT = 18;

const mundurBulan = (acuan: string | undefined, bulan: number) => {
  const d = acuan ? new Date(acuan) : new Date();
  if (isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() - bulan);
  return d.toISOString().slice(0, 10);
};

const hitungDiBrowser = async (brcd: string, jobdateMax?: string) => {
  const jobdateMin = mundurBulan(jobdateMax, BULAN_RIWAYAT);
  const all: MLFArrearsRow[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    let q = (supabase as any)
      .from('mlf_data')
      .select('l0lnno,jobdate,baki,tungpk,tungbg,pla,date,date1')
      .eq('brcd', brcd)
      // Satu jobdate dipakai ratusan baris, jadi urutannya harus dipatok
      // sampai kolom unik — tanpa itu paging bisa melewatkan baris.
      .order('jobdate', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (jobdateMax) q = q.lte('jobdate', jobdateMax);
    if (jobdateMin) q = q.gte('jobdate', jobdateMin);
    const { data, error } = await q;
    if (error) throw error;
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
    if (from > 60000) break;
  }
  return buildArrearsMap(all);
};

/**
 * Lama tunggakan berjalan & pembayaran terakhir per nomor loan.
 *
 * Penyisiran riwayat snapshot MLF dikerjakan di database lewat fungsi
 * `mlf_arrears`, karena riwayat satu cabang bisa ratusan ribu baris dan
 * menariknya ke browser tidak pernah selesai. Kalau fungsi itu belum dipasang,
 * dipakai jalur lama dengan riwayat yang dibatasi.
 */
export const useMLFArrears = (branchCode?: string, jobdateMax?: string) => {
  const brcd = branchCode || '143';
  return useQuery({
    queryKey: ['mlf-arrears-v4', brcd, jobdateMax || 'latest'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc('mlf_arrears', {
        p_brcd: brcd,
        p_jobdate_max: jobdateMax ? String(jobdateMax).slice(0, 10) : null,
      });
      if (!error) return buildDariRpc((data || []) as BarisRpc[]);
      if (!rpcBelumAda(error)) throw error;
      return hitungDiBrowser(brcd, jobdateMax);
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });
};

export const fmtHariTunggak = (info?: ArrearsInfo) => {
  if (!info || info.hariTunggak === null) return '-';
  if (info.hariTunggak === 0) return '0';
  return `${info.hariTunggakMinimal ? '≥' : ''}${info.hariTunggak}`;
};
