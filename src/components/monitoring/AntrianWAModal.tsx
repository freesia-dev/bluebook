import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageCircle, SkipForward, X, CheckCircle2 } from 'lucide-react';
import { buildWAUrl, formatPhoneDisplay } from '@/lib/wa-utils';
import { useInsertReminderLog } from '@/hooks/use-wa-reminder-log';
import { toast } from 'sonner';

export interface QueueItem {
  l0lnno: string;
  nama: string;
  no_hp: string;
  pesan: string;
  kol: number;
  tunggakan: number;
  template_id: string | null;
  upload_id: string | null;
  kategori?: 'tagihan' | 'penawaran';
}

interface Props {
  open: boolean;
  items: QueueItem[];
  onClose: () => void;
}

export const AntrianWAModal: React.FC<Props> = ({ open, items, onClose }) => {
  const [idx, setIdx] = useState(0);
  const [sent, setSent] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const insertLog = useInsertReminderLog();

  React.useEffect(() => {
    if (open) {
      setIdx(0);
      setSent(0);
      setSkipped(0);
    }
  }, [open]);

  const current = items[idx];
  const done = idx >= items.length;
  const pct = items.length > 0 ? ((idx) / items.length) * 100 : 0;

  const handleSend = () => {
    if (!current) return;
    const url = buildWAUrl(current.no_hp, current.pesan);
    // whatsapp:// protocol — use anchor click instead of window.open so the browser
    // hands off to WhatsApp Desktop without leaving a blank tab behind.
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Fire-and-forget log insert; don't block the UI.
    insertLog.mutate(
      {
        l0lnno: current.l0lnno,
        nama: current.nama,
        no_hp: current.no_hp,
        pesan: current.pesan,
        template_id: current.template_id,
        metode: 'wame',
        status: 'opened',
        kol: current.kol,
        tunggakan: current.tunggakan,
        upload_id: current.upload_id,
        kategori: current.kategori || 'tagihan',
      } as any,
      {
        onError: (e: any) => toast.error('Gagal mencatat log: ' + e.message),
      },
    );
    setSent((s) => s + 1);
    setIdx((i) => i + 1);
  };

  const handleSkip = () => {
    setSkipped((s) => s + 1);
    setIdx((i) => i + 1);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Antrian Pengiriman WhatsApp
          </DialogTitle>
          <DialogDescription>
            Sistem akan membuka chat WA satu per satu — klik tombol Send di WhatsApp untuk mengirim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold">{idx} / {items.length}</span>
            </div>
            <Progress value={pct} />
            <div className="flex gap-3 text-xs mt-2 text-muted-foreground">
              <span className="text-emerald-600">✓ Terkirim: <strong>{sent}</strong></span>
              <span className="text-amber-600">↷ Dilewati: <strong>{skipped}</strong></span>
            </div>
          </div>

          {done ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500" />
              <h3 className="text-xl font-bold">Antrian selesai</h3>
              <p className="text-muted-foreground">
                {sent} reminder berhasil dibuka, {skipped} dilewati.
              </p>
            </div>
          ) : current ? (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Debitur ke-{idx + 1}</p>
                  <p className="font-bold text-base">{current.nama}</p>
                  <p className="text-xs font-mono text-muted-foreground">{current.l0lnno}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono">{formatPhoneDisplay(current.no_hp)}</Badge>
                  <p className="text-xs text-amber-600 mt-1">KOL {current.kol} • Tunggakan Rp {Math.round(current.tunggakan).toLocaleString('id-ID')}</p>
                </div>
              </div>
              <Textarea value={current.pesan} readOnly className="font-mono text-xs h-48 resize-none" />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
          {done ? (
            <Button onClick={handleClose} className="w-full">Tutup</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}><X className="w-4 h-4 mr-1" />Batalkan</Button>
              <Button variant="outline" onClick={handleSkip}><SkipForward className="w-4 h-4 mr-1" />Skip</Button>
              <Button onClick={handleSend} className="bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="w-4 h-4 mr-1" />
                Buka WhatsApp & Tandai
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
