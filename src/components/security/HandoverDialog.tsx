import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHandoverShift, SecurityShift, SHIFT_LABEL_SHORT, useSecurityUsers } from '@/hooks/use-security-log';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift: SecurityShift;
}

export const HandoverDialog: React.FC<Props> = ({ open, onOpenChange, shift }) => {
  const { toast } = useToast();
  const handover = useHandoverShift();

  const [kondisi, setKondisi] = useState('');
  const [penerima, setPenerima] = useState('');
  const [catatan, setCatatan] = useState('');

  const submit = async () => {
    if (!kondisi.trim()) {
      toast({ title: 'Review kondisi akhir wajib diisi', variant: 'destructive' });
      return;
    }
    if (!penerima.trim()) {
      toast({ title: 'Nama penerima shift wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      await handover.mutateAsync({
        shift_id: shift.id,
        kondisi_akhir: kondisi.trim(),
        serah_terima_ke_nama: penerima.trim(),
        catatan_serah_terima: catatan.trim(),
      });
      toast({ title: 'Shift diserahkan', description: `Kepada ${penerima}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Gagal serah terima', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Akhiri & Serah Terima Shift</DialogTitle>
          <DialogDescription>
            Shift {SHIFT_LABEL_SHORT[shift.shift]} oleh <strong>{shift.nama_petugas}</strong>. Setelah serah terima,
            penerima wajib login dan menekan "Mulai Shift" untuk memulai shiftnya.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Review Kondisi Akhir Area</Label>
            <Textarea
              rows={3}
              placeholder="Kondisi kantor, kunci, CCTV, dll."
              value={kondisi}
              onChange={(e) => setKondisi(e.target.value)}
            />
          </div>
          <div>
            <Label>Diserahkan Kepada (Nama Security)</Label>
            <Input value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="Nama lengkap penerima" />
          </div>
          <div>
            <Label>Catatan Untuk Shift Berikutnya <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            <Textarea
              rows={2}
              placeholder="Pesan / hal yang perlu diperhatikan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={handover.isPending}>
            {handover.isPending ? 'Memproses...' : 'Konfirmasi Serah Terima'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
