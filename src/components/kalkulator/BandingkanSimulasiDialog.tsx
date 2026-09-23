import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp, SKEMA_LABELS, SEGMEN_LABELS, SEGMEN_BADGE_CLASS, normalizeSegmen, type LoanSkema } from '@/lib/loan-calc';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp } from 'lucide-react';

interface Props {
  rows: LoanSimulationRow[];
  onOpenChange: (open: boolean) => void;
}

const angka = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** 'rendah' = makin kecil makin bagus (angsuran), 'tinggi' = makin besar makin bagus (dana diterima). */
type Bagus = 'rendah' | 'tinggi' | null;

interface Baris {
  label: string;
  nilai: (s: LoanSimulationRow) => number | string;
  bagus?: Bagus;
  /** Tampilkan sebagai rupiah */
  rp?: boolean;
  /** Garis pemisah di atas baris ini */
  pisah?: boolean;
  tebal?: boolean;
}

const BARIS: Baris[] = [
  { label: 'Produk', nilai: (s) => s.product_nama || '-' },
  { label: 'Skema', nilai: (s) => SKEMA_LABELS[s.skema as LoanSkema] ?? String(s.skema) },
  { label: 'Plafon', nilai: (s) => angka(s.plafon), rp: true },
  { label: 'Tenor (bulan)', nilai: (s) => angka(s.tenor_bulan) },
  { label: 'Bunga p.a.', nilai: (s) => `${s.bunga_pa}%` },
  { label: 'Angsuran pertama', nilai: (s) => angka(s.hasil_ringkasan?.angsuranPertama), rp: true, bagus: 'rendah', pisah: true, tebal: true },
  { label: 'Total angsuran', nilai: (s) => angka(s.hasil_ringkasan?.totalAngsuran), rp: true, bagus: 'rendah' },
  { label: 'Total bunga', nilai: (s) => angka(s.hasil_ringkasan?.totalBunga), rp: true, bagus: 'rendah' },
  { label: 'Provisi', nilai: (s) => angka((s.hasil_ringkasan as any)?.provisi), rp: true, bagus: 'rendah', pisah: true },
  { label: 'Asuransi (beban debitur)', nilai: (s) => angka(s.asuransi_nominal), rp: true, bagus: 'rendah' },
  { label: 'Blokir angsuran', nilai: (s) => angka((s.hasil_ringkasan as any)?.blokir ?? s.blokir_angsuran), rp: true, bagus: 'rendah' },
  { label: 'Total potongan di muka', nilai: (s) => angka((s.hasil_ringkasan as any)?.total), rp: true, bagus: 'rendah' },
  { label: 'Dana diterima debitur', nilai: (s) => angka((s.hasil_ringkasan as any)?.danaDiterima), rp: true, bagus: 'tinggi', pisah: true, tebal: true },
  { label: 'DSR', nilai: (s) => {
      const p = (s.hasil_ringkasan as any)?.dsrPct;
      return Number.isFinite(Number(p)) ? `${Number(p).toFixed(1)}%` : '-';
    } },
];

/**
 * Bandingkan 2–3 simulasi berdampingan. Dipakai saat debitur minta
 * "kalau tenornya 5 tahun bedanya berapa?" — dua simulasi yang sudah tersimpan
 * langsung ditaruh sebelah-sebelahan, dan angka terbaik tiap baris ditandai.
 */
export const BandingkanSimulasiDialog: React.FC<Props> = ({ rows, onOpenChange }) => {
  const open = rows.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bandingkan {rows.length} simulasi</DialogTitle>
          <DialogDescription>
            Angka paling menguntungkan debitur di setiap baris ditandai hijau.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left text-xs font-semibold text-muted-foreground">
                  Rincian
                </th>
                {rows.map((s) => (
                  <th key={s.id} className="min-w-[10rem] px-2 py-2 text-left align-top">
                    <span className="block truncate font-semibold" title={s.nama_debitur}>
                      {s.nama_debitur}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn('mt-1 text-[10px]', SEGMEN_BADGE_CLASS[normalizeSegmen(s.segmen)])}
                    >
                      {SEGMEN_LABELS[normalizeSegmen(s.segmen)]}
                    </Badge>
                    <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BARIS.map((b) => {
                const nilai = rows.map((s) => b.nilai(s));
                const angkaSemua = nilai.filter((v): v is number => typeof v === 'number');
                // Hanya tandai kalau memang ada bedanya
                const adaBeda = angkaSemua.length === rows.length && new Set(angkaSemua).size > 1;
                const terbaik = !adaBeda || !b.bagus
                  ? null
                  : b.bagus === 'rendah'
                    ? Math.min(...angkaSemua)
                    : Math.max(...angkaSemua);

                return (
                  <tr key={b.label} className={cn(b.pisah && 'border-t-2 border-border')}>
                    <th
                      scope="row"
                      className={cn(
                        'sticky left-0 z-10 bg-background px-2 py-2 text-left align-top text-xs font-normal text-muted-foreground',
                        b.tebal && 'font-semibold text-foreground',
                      )}
                    >
                      {b.label}
                    </th>
                    {nilai.map((v, i) => {
                      const juara = terbaik != null && typeof v === 'number' && v === terbaik;
                      return (
                        <td
                          key={rows[i].id}
                          className={cn(
                            'px-2 py-2 align-top tabular-nums',
                            b.tebal && 'font-semibold',
                            juara && 'font-semibold text-emerald-600 dark:text-emerald-400',
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {typeof v === 'number' ? (b.rp ? fmtRp(v) : v.toLocaleString('id-ID')) : v}
                            {juara &&
                              (b.bagus === 'rendah' ? (
                                <ArrowDown className="h-3 w-3" aria-label="paling rendah" />
                              ) : (
                                <ArrowUp className="h-3 w-3" aria-label="paling tinggi" />
                              ))}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BandingkanSimulasiDialog;
