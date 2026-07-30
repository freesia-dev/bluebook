import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentEvent {
  jobdate: string;
  amount: number;
}

export interface ArrearsInfo {
  /** Jumlah hari tunggakan berjalan (dihitung dari snapshot MLF terakhir yang masih lancar) */
  hariTunggak: number | null;
  /** True bila riwayat MLF belum mencakup awal tunggakan (jadi angka minimal) */
  hariTunggakMinimal: boolean;
  /** Tanggal snapshot MLF saat baki debet turun terakhir kali */
  lastPaymentDate: string | null;
  lastPaymentAmount: number;
  /** Riwayat penurunan baki debet terbaru (maks 5) */
  recentPayments: PaymentEvent[];
  latestJobdate: string | null;
}

interface Snap {
  jobdate: string;
  baki: number;
  tunggakan: number;
}

const MIN_PAYMENT = 1000; // abaikan pembulatan kecil

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));

export const buildArrearsMap = (rows: { l0lnno: string | null; jobdate: string; baki: number | null; tungpk: number | null; tungbg: number | null }[]) => {
  const byLoan = new Map<string, Snap[]>();
  rows.forEach((r) => {
    if (!r.l0lnno) return;
    const list = byLoan.get(r.l0lnno) || [];
    list.push({
      jobdate: r.jobdate,
      baki: Number(r.baki) || 0,
      tunggakan: (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0),
    });
    byLoan.set(r.l0lnno, list);
  });

  const map = new Map<string, ArrearsInfo>();
  byLoan.forEach((snaps, loan) => {
    snaps.sort((a, b) => a.jobdate.localeCompare(b.jobdate));
    const latest = snaps[snaps.length - 1];

    // ---- hari tunggakan berjalan ----
    let hariTunggak: number | null = null;
    let minimal = false;
    if (latest && latest.tunggakan > 0) {
      let lastCleanIdx = -1;
      for (let i = snaps.length - 1; i >= 0; i--) {
        if (snaps[i].tunggakan <= 0) { lastCleanIdx = i; break; }
      }
      if (lastCleanIdx >= 0) {
        hariTunggak = daysBetween(snaps[lastCleanIdx].jobdate, latest.jobdate);
      } else {
        hariTunggak = daysBetween(snaps[0].jobdate, latest.jobdate);
        minimal = true;
      }
    } else if (latest) {
      hariTunggak = 0;
    }

    // ---- pembayaran (penurunan baki debet) ----
    const payments: PaymentEvent[] = [];
    for (let i = 1; i < snaps.length; i++) {
      const diff = snaps[i - 1].baki - snaps[i].baki;
      if (diff >= MIN_PAYMENT) payments.push({ jobdate: snaps[i].jobdate, amount: diff });
    }
    const last = payments[payments.length - 1];

    map.set(loan, {
      hariTunggak,
      hariTunggakMinimal: minimal,
      lastPaymentDate: last?.jobdate || null,
      lastPaymentAmount: last?.amount || 0,
      recentPayments: payments.slice(-5).reverse(),
      latestJobdate: latest?.jobdate || null,
    });
  });

  return map;
};

/**
 * Membaca riwayat snapshot MLF (kolom minimal) untuk menghitung
 * lama tunggakan berjalan & pembayaran terakhir per nomor loan.
 */
export const useMLFArrears = (branchCode?: string, jobdateMax?: string) => {
  const brcd = branchCode || '143';
  return useQuery({
    queryKey: ['mlf-arrears', brcd, jobdateMax || 'latest'],
    queryFn: async () => {
      const all: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        let q = (supabase as any)
          .from('mlf_data')
          .select('l0lnno,jobdate,baki,tungpk,tungbg')
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
