import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ALASAN_BATAL_TEMPLATE, STAGE_LABELS_ALL, PIPELINE_STAGES, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { Ban } from 'lucide-react';

/** Badge status pipeline (termasuk status Dibatalkan). */
export const StageBadge: React.FC<{ status?: string | null; note?: string | null; className?: string }> = ({
  status,
  note,
  className = '',
}) => {
  const s = status && STAGE_LABELS_ALL[status] ? status : 'simulasi';
  const styles: Record<string, string> = {
    simulasi: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    berkas_masuk: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    proses: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    input: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
    cair: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    batal: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  };
  return (
    <Badge
      variant="outline"
      className={`text-[11px] font-medium ${styles[s]} ${className}`}
      title={s === 'batal' && note ? `Alasan: ${note}` : undefined}
    >
      {STAGE_LABELS_ALL[s]}
    </Badge>
  );
};

export const isCancelled = (r: Pick<LoanSimulationRow, 'pipeline_status'>) => r.pipeline_status === 'batal';

/** Tahap terakhir sebelum dibatalkan (untuk undo). */
export const stageBeforeCancel = (r: LoanSimulationRow) => {
  const hist = Array.isArray(r.pipeline_history) ? r.pipeline_history : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i].to === 'batal') {
      const from = hist[i].from;
      if (from && (PIPELINE_STAGES as readonly string[]).includes(from)) return from as (typeof PIPELINE_STAGES)[number];
      break;
    }
  }
  return 'simulasi' as const;
};

interface Props {
  row: LoanSimulationRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export const CancelSimulationDialog: React.FC<Props> = ({ row, onOpenChange, onConfirm }) => {
  const [reason, setReason] = useState('');

  React.useEffect(() => {
    if (row) setReason('');
  }, [row]);

  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-600" /> Batalkan Simulasi
          </DialogTitle>
          <DialogDescription>
            {row?.nama_debitur} — simulasi akan ditandai <b>Dibatalkan</b>. Aksi ini bisa dibatalkan kembali (undo) kapan saja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Alasan cepat</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {ALASAN_BATAL_TEMPLATE.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReason(t)}
                  className={`text-[11px] px-2 py-1 rounded-md border transition ${
                    reason === t
                      ? 'bg-rose-600 text-primary-foreground border-rose-600'
                      : 'bg-muted/40 hover:bg-muted border-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs" htmlFor="alasan-batal">Alasan pembatalan</Label>
            <Textarea
              id="alasan-batal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tulis atau pilih alasan di atas…"
              rows={3}
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            <Ban className="w-4 h-4 mr-1.5" /> Batalkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
