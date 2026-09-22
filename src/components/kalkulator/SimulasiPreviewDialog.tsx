import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScaleToFit } from '@/components/ui/scale-to-fit';
import { SimulasiCard, type SimulasiCardData } from '@/components/kalkulator/SimulasiCard';
import { StageBadge } from '@/components/kalkulator/CancelSimulationDialog';
import type { LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp, fmtNumber, SKEMA_LABELS, type LoanSkema } from '@/lib/loan-calc';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Table2,
} from 'lucide-react';

interface Props {
  row: LoanSimulationRow | null;
  cardData: SimulasiCardData | null;
  onOpenChange: (open: boolean) => void;
  onExportJpg: (row: LoanSimulationRow) => void;
  onExportExcel: (row: LoanSimulationRow) => void;
  onExportPdf: (row: LoanSimulationRow) => void;
}

const InfoRow: React.FC<{ label: string; value: React.ReactNode; strong?: boolean }> = ({ label, value, strong }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/60 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={cn('text-sm text-right tabular-nums', strong ? 'font-bold' : 'font-medium')}>{value}</span>
  </div>
);

const BigStat: React.FC<{ label: string; value: string; tone?: 'primary' | 'success' | 'plain' }> = ({
  label,
  value,
  tone = 'plain',
}) => (
  <div
    className={cn(
      'rounded-xl border px-3 py-2.5',
      tone === 'primary' && 'border-primary/30 bg-primary/5',
      tone === 'success' && 'border-emerald-500/30 bg-emerald-500/5',
    )}
  >
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
    <div
      className={cn(
        'mt-0.5 text-base sm:text-lg font-bold tabular-nums leading-tight',
        tone === 'primary' && 'text-primary',
        tone === 'success' && 'text-emerald-600 dark:text-emerald-400',
      )}
    >
      {value}
    </div>
  </div>
);

const DESKTOP_QUERY = '(min-width: 1024px)';

/** true kalau layar selebar desktop (breakpoint `lg` Tailwind). */
function useIsDesktop(): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(DESKTOP_QUERY).matches;
  const [v, setV] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(DESKTOP_QUERY);
    if (!mq) return;
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return v;
}

/** Tabel angsuran ringkas — dipakai di panel kanan (desktop) & bawah (HP). */
const AngsuranTable: React.FC<{ rows: NonNullable<LoanSimulationRow['tabel_angsuran']> }> = ({ rows }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-[11px] tabular-nums">
      <thead className="sticky top-0 bg-muted/80 backdrop-blur">
        <tr className="text-muted-foreground">
          <th className="px-2 py-1.5 text-left font-semibold">Bln</th>
          <th className="px-2 py-1.5 text-right font-semibold">Angsuran</th>
          <th className="px-2 py-1.5 text-right font-semibold">Pokok</th>
          <th className="px-2 py-1.5 text-right font-semibold">Bunga</th>
          <th className="px-2 py-1.5 text-right font-semibold">Sisa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.bulan} className="border-t border-border/60 odd:bg-muted/20">
            <td className="px-2 py-1" title={r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : undefined}>
              {r.bulan}
            </td>
            <td className="px-2 py-1 text-right font-semibold">{fmtNumber(r.angsuran)}</td>
            <td className="px-2 py-1 text-right">{fmtNumber(r.pokok)}</td>
            <td className="px-2 py-1 text-right">{fmtNumber(r.bunga)}</td>
            <td className="px-2 py-1 text-right text-muted-foreground">{fmtNumber(r.saldo)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Pratinjau simulasi dari halaman Riwayat.
 * - Desktop: dua kolom — kartu JPG utuh (diskalakan agar SELURUHNYA kelihatan) + panel ringkasan.
 * - HP / PWA: layar penuh, ringkasan angka penting di atas, kartu menyesuaikan lebar layar.
 * - Tabel angsuran disembunyikan secara default (tombol tampilkan/sembunyikan).
 */
export const SimulasiPreviewDialog: React.FC<Props> = ({
  row,
  cardData,
  onOpenChange,
  onExportJpg,
  onExportExcel,
  onExportPdf,
}) => {
  const [showTable, setShowTable] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'width'>('contain');
  const [scale, setScale] = useState(1);
  const isDesktop = useIsDesktop();

  const handleOpenChange = (o: boolean) => {
    if (!o) setShowTable(false);
    onOpenChange(o);
  };

  const r: any = row?.hasil_ringkasan || {};
  const tabel = row?.tabel_angsuran ?? [];
  const hasTable = tabel.length > 0;

  const actions = row && (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="outline" className="h-8" onClick={() => onExportJpg(row)}>
        <ImageIcon className="mr-1 h-3.5 w-3.5 text-amber-600" /> JPG
      </Button>
      <Button size="sm" variant="outline" className="h-8" onClick={() => onExportExcel(row)}>
        <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Excel
      </Button>
      <Button size="sm" variant="outline" className="h-8" onClick={() => onExportPdf(row)}>
        <FileText className="mr-1 h-3.5 w-3.5 text-rose-600" /> PDF
      </Button>
    </div>
  );

  const tableToggle = hasTable && (
    <Button
      size="sm"
      variant={showTable ? 'secondary' : 'outline'}
      className="w-full justify-between"
      onClick={() => setShowTable((v) => !v)}
      aria-expanded={showTable}
    >
      <span className="flex items-center gap-2">
        <Table2 className="h-4 w-4" />
        {showTable ? 'Sembunyikan' : 'Tampilkan'} tabel angsuran ({tabel.length} bln)
      </span>
      <ChevronDown className={cn('h-4 w-4 transition-transform', showTable && 'rotate-180')} />
    </Button>
  );

  return (
    <Dialog open={!!row} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          // HP / PWA: layar penuh
          'left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none p-0',
          'flex flex-col overflow-hidden',
          // Desktop: jendela besar di tengah
          'lg:left-[50%] lg:top-[50%] lg:h-[92vh] lg:w-[96vw] lg:max-w-[1280px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl',
        )}
      >
        {row && cardData && (
          <>
            {/* Header */}
            <div className="flex shrink-0 flex-col gap-2 border-b py-3 pl-4 pr-14 sm:flex-row sm:items-center sm:justify-between lg:pl-6 lg:pr-16">
              <div className="min-w-0">
                <DialogTitle className="truncate text-base font-bold sm:text-lg">{row.nama_debitur}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="truncate">{row.product_nama || 'Produk Kredit'}</span>
                  <span aria-hidden className="hidden sm:inline">•</span>
                  <span>{cardData.tanggal}</span>
                  <StageBadge status={row.pipeline_status} note={row.pipeline_note} />
                  </div>
                </DialogDescription>
              </div>
              <div className="hidden sm:block">{actions}</div>
            </div>

            {/* Body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
              {/* Kartu */}
              <div className="order-2 flex min-h-0 flex-col bg-muted/40 lg:order-1 lg:border-r">
                <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3 lg:px-5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Kartu simulasi (sama dengan hasil JPG) · {Math.round(scale * 100)}%
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hidden h-7 px-2 text-xs lg:inline-flex"
                    onClick={() => setFitMode((m) => (m === 'contain' ? 'width' : 'contain'))}
                    title={fitMode === 'contain' ? 'Perbesar sesuai lebar (scroll)' : 'Muatkan seluruh kartu di layar'}
                  >
                    {fitMode === 'contain' ? (
                      <><Maximize2 className="mr-1 h-3.5 w-3.5" /> Perbesar</>
                    ) : (
                      <><Minimize2 className="mr-1 h-3.5 w-3.5" /> Muat layar</>
                    )}
                  </Button>
                </div>
                <div
                  className={cn(
                    'min-h-0 p-3 lg:flex-1 lg:p-5',
                    fitMode === 'contain' ? 'lg:overflow-hidden' : 'lg:overflow-y-auto',
                  )}
                >
                  {/* Di HP selalu 'width' (lebar layar), di desktop bisa 'contain' (seluruh kartu kelihatan) */}
                  <ScaleToFit
                    key={isDesktop ? `d-${fitMode}` : 'm'}
                    mode={isDesktop ? fitMode : 'width'}
                    onScaleChange={setScale}
                    className={isDesktop && fitMode === 'contain' ? 'h-full' : undefined}
                  >
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
                      <SimulasiCard data={cardData} />
                    </div>
                  </ScaleToFit>
                </div>
              </div>

              {/* Ringkasan */}
              <aside className="order-1 space-y-4 p-4 lg:order-2 lg:overflow-y-auto lg:p-5">
                <div className="grid grid-cols-2 gap-2">
                  <BigStat label="Angsuran / bulan" value={fmtRp(cardData.angsuranPertama || Number(r.angsuranPertama) || 0)} tone="primary" />
                  <BigStat label="Dana diterima" value={fmtRp(cardData.danaDiterima || Number(r.danaDiterima) || 0)} tone="success" />
                  <BigStat label="Plafon" value={fmtRp(Number(row.plafon) || 0)} />
                  <BigStat label="Jangka waktu" value={`${row.tenor_bulan} bulan`} />
                </div>

                <div className="rounded-xl border px-3 py-1">
                  <InfoRow label="Skema" value={SKEMA_LABELS[row.skema as LoanSkema] ?? row.skema} />
                  <InfoRow label="Suku bunga" value={`${row.bunga_pa}% p.a.`} />
                  {cardData.promoLabel && (
                    <InfoRow label={cardData.promoNama || 'Program promo'} value={cardData.promoLabel} />
                  )}
                  {cardData.angsuranTerakhir != null &&
                    cardData.angsuranTerakhir > 0 &&
                    cardData.angsuranTerakhir !== cardData.angsuranPertama && (
                      <InfoRow label="Angsuran terakhir" value={fmtRp(cardData.angsuranTerakhir)} />
                    )}
                  <InfoRow
                    label="Rasio angsuran (DSR)"
                    value={cardData.dsrPct != null ? `${cardData.dsrPct.toFixed(1)}%` : '-'}
                  />
                  {cardData.gajiPokok + cardData.ttp > 0 && (
                    <InfoRow label="Total penghasilan" value={fmtRp(cardData.gajiPokok + cardData.ttp)} />
                  )}
                  <InfoRow label="Total potongan" value={fmtRp(cardData.totalPotongan)} />
                  {cardData.pelunasan && (
                    <InfoRow label="Pelunasan (top up)" value={fmtRp(cardData.pelunasan.total)} />
                  )}
                  <InfoRow label="Total bunga" value={fmtRp(cardData.totalBunga)} />
                </div>

                <div className="rounded-xl border px-3 py-1">
                  <InfoRow label="Account Officer" value={row.nama_ao || '-'} />
                  <InfoRow label="Dibuat oleh" value={row.created_by_nama || '-'} />
                  {row.instansi && <InfoRow label="Instansi" value={row.instansi} />}
                  {row.pipeline_status === 'batal' && row.pipeline_note && (
                    <InfoRow label="Alasan batal" value={row.pipeline_note} />
                  )}
                </div>

                {/* Tombol export versi HP (di desktop ada di header) */}
                <div className="sm:hidden">{actions}</div>

                {/* Tabel angsuran — desktop */}
                <div className="hidden space-y-2 lg:block">
                  {tableToggle}
                  {showTable && <AngsuranTable rows={tabel} />}
                </div>
              </aside>

              {/* Tabel angsuran — HP / tablet (di bawah kartu) */}
              <div className="order-3 space-y-2 p-4 pt-0 lg:hidden">
                {tableToggle}
                {showTable && <AngsuranTable rows={tabel} />}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SimulasiPreviewDialog;
