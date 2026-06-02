import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  useHandoverShift,
  SecurityShift,
  SHIFT_LABEL_SHORT,
  useSecurityUsers,
  useKondisiTemplates,
  useStartShift,
  ShiftType,
} from '@/hooks/use-security-log';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift: SecurityShift;
}

const NEXT_SHIFT: Record<ShiftType, ShiftType> = {
  pagi: 'sore',
  sore: 'malam',
  malam: 'pagi',
};

export const HandoverDialog: React.FC<Props> = ({ open, onOpenChange, shift }) => {
  const { toast } = useToast();
  const handover = useHandoverShift();
  const startShift = useStartShift();
  const { data: secUsers = [] } = useSecurityUsers();
  const { data: kondisiTemplates = [] } = useKondisiTemplates();

  const [kondisi, setKondisi] = useState('');
  const [penerima, setPenerima] = useState('');
  const [penggantiNama, setPenggantiNama] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isLembur, setIsLembur] = useState(false);

  const isPengganti = /pengganti/i.test(penerima);

  const submit = async () => {
    if (!kondisi.trim()) {
      toast({ title: 'Review kondisi akhir wajib diisi', variant: 'destructive' });
      return;
    }

    if (isLembur) {
      // Lanjut shift sendiri (lembur) — tidak perlu nama penerima lain
      const finalNama = `Lembur - ${shift.nama_petugas}`;
      try {
        await handover.mutateAsync({
          shift_id: shift.id,
          kondisi_akhir: kondisi.trim(),
          serah_terima_ke_nama: finalNama,
          catatan_serah_terima: catatan.trim(),
        });
        const nowIso = new Date().toISOString();
        const nextShift = NEXT_SHIFT[shift.shift as ShiftType] ?? shift.shift;
        await startShift.mutateAsync({
          tanggal: format(new Date(), 'yyyy-MM-dd'),
          shift: nextShift,
          nama_petugas: shift.nama_petugas,
          is_lembur: true,
          parent_shift_id: shift.id,
          catatan_awal: catatan.trim()
            ? `Lembur lanjutan dari shift ${SHIFT_LABEL_SHORT[shift.shift]}. ${catatan.trim()}`
            : `Lembur lanjutan dari shift ${SHIFT_LABEL_SHORT[shift.shift]}.`,
          jam_mulai: nowIso,
        });
        toast({ title: 'Lembur dimulai', description: `${shift.nama_petugas} melanjutkan dengan status Lembur` });
        onOpenChange(false);
      } catch (err: any) {
        toast({ title: 'Gagal mulai lembur', description: err.message, variant: 'destructive' });
      }
      return;
    }

    if (!penerima.trim()) {
      toast({ title: 'Nama penerima shift wajib diisi', variant: 'destructive' });
      return;
    }
    if (isPengganti && !penggantiNama.trim()) {
      toast({ title: 'Nama security pengganti wajib diisi', variant: 'destructive' });
      return;
    }
    const finalNama = isPengganti ? `Pengganti - ${penggantiNama.trim()}` : penerima.trim();
    try {
      await handover.mutateAsync({
        shift_id: shift.id,
        kondisi_akhir: kondisi.trim(),
        serah_terima_ke_nama: finalNama,
        catatan_serah_terima: catatan.trim(),
      });
      toast({ title: 'Shift diserahkan', description: `Kepada ${finalNama}` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Gagal serah terima', description: err.message, variant: 'destructive' });
    }
  };

  const isPending = handover.isPending || startShift.isPending;

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
            {kondisiTemplates.length > 0 && (
              <Select
                value=""
                onValueChange={(v) => {
                  if (!v) return;
                  setKondisi((prev) => (prev.trim() ? `${prev.trim()} ${v}` : v));
                }}
              >
                <SelectTrigger className="mt-1 mb-2 h-9 text-xs">
                  <SelectValue placeholder="Pilih template (opsional) — isi tetap bisa diedit manual" />
                </SelectTrigger>
                <SelectContent>
                  {kondisiTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.label} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Textarea
              rows={3}
              placeholder="Kondisi kantor, kunci, CCTV, dll. (boleh pilih template lalu edit)"
              value={kondisi}
              onChange={(e) => setKondisi(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-md border bg-amber-50 border-amber-200">
            <Checkbox
              id="lembur-handover"
              checked={isLembur}
              onCheckedChange={(c) => setIsLembur(!!c)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label htmlFor="lembur-handover" className="cursor-pointer text-sm font-medium text-amber-900">
                Lembur (tidak ada security pengganti)
              </Label>
              <p className="text-xs text-amber-800 mt-1">
                Shift saat ini akan ditutup, lalu otomatis dibuatkan shift baru dengan petugas yang sama
                (<strong>{shift.nama_petugas}</strong>) dengan label <strong>Lembur</strong>.
              </p>
            </div>
          </div>

          {!isLembur && (
            <>
              <div>
                <Label>Diserahkan Kepada (Nama Security)</Label>
                {secUsers.filter((u) => u.nama !== shift.nama_petugas).length > 0 ? (
                  <Select value={penerima} onValueChange={setPenerima}>
                    <SelectTrigger><SelectValue placeholder="Pilih penerima shift" /></SelectTrigger>
                    <SelectContent>
                      {secUsers.filter((u) => u.nama !== shift.nama_petugas).map((u) => (
                        <SelectItem key={u.user_id} value={u.nama}>{u.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={penerima} onChange={(e) => setPenerima(e.target.value)} placeholder="Nama lengkap penerima" />
                )}
              </div>
              {isPengganti && (
                <div>
                  <Label>Nama Security Pengganti (Manual)</Label>
                  <Input
                    value={penggantiNama}
                    onChange={(e) => setPenggantiNama(e.target.value)}
                    placeholder="Tulis nama lengkap security pengganti"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Akan dicatat sebagai: <strong>Pengganti - {penggantiNama || '...'}</strong>
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <Label>
              {isLembur ? 'Catatan Lembur' : 'Catatan Untuk Shift Berikutnya'}{' '}
              <span className="text-muted-foreground text-xs">(opsional)</span>
            </Label>
            <Textarea
              rows={2}
              placeholder={isLembur ? 'Alasan lembur, hal yang perlu diperhatikan' : 'Pesan / hal yang perlu diperhatikan'}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={isPending}>
            {isPending
              ? 'Memproses...'
              : isLembur
                ? 'Akhiri & Mulai Lembur'
                : 'Konfirmasi Serah Terima'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
