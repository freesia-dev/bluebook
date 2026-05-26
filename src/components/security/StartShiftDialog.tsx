import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SHIFT_LABEL, ShiftType, useStartShift, SecurityShift, useSecurityUsers } from '@/hooks/use-security-log';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  todayShifts: SecurityShift[];
}

const detectShift = (): ShiftType => {
  const h = new Date().getHours();
  if (h >= 8 && h < 16) return 'pagi';
  if (h >= 16 && h < 24) return 'sore';
  return 'malam';
};

export const StartShiftDialog: React.FC<Props> = ({ open, onOpenChange, todayShifts }) => {
  const { userName } = useAuth();
  const { toast } = useToast();
  const start = useStartShift();
  const { data: secUsers = [] } = useSecurityUsers();

  const [nama, setNama] = useState(userName);
  const [namaPengganti, setNamaPengganti] = useState('');
  const [shift, setShift] = useState<ShiftType>(detectShift());
  const [isLembur, setIsLembur] = useState(false);
  const [catatanAwal, setCatatanAwal] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));

  const isPengganti = /pengganti/i.test(nama);

  const previousShift = todayShifts
    .filter((s) => s.status === 'selesai')
    .sort((a, b) => (a.jam_selesai || '').localeCompare(b.jam_selesai || ''))
    .pop();

  const submit = async () => {
    if (!nama.trim()) {
      toast({ title: 'Nama petugas wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      await start.mutateAsync({
        tanggal,
        shift,
        nama_petugas: nama.trim(),
        is_lembur: isLembur,
        parent_shift_id: isLembur ? previousShift?.id ?? null : null,
        catatan_awal: catatanAwal.trim(),
      });
      toast({ title: 'Shift dimulai', description: `${SHIFT_LABEL[shift]} oleh ${nama}` });
      onOpenChange(false);
      setCatatanAwal('');
      setIsLembur(false);
    } catch (err: any) {
      toast({ title: 'Gagal mulai shift', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mulai Shift Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label>Shift</Label>
              <Select value={shift} onValueChange={(v) => setShift(v as ShiftType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHIFT_LABEL) as ShiftType[]).map((s) => (
                    <SelectItem key={s} value={s}>{SHIFT_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Nama Petugas Security</Label>
            {secUsers.length > 0 ? (
              <Select value={nama} onValueChange={setNama}>
                <SelectTrigger><SelectValue placeholder="Pilih petugas security" /></SelectTrigger>
                <SelectContent>
                  {secUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.nama}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="lembur" checked={isLembur} onCheckedChange={(c) => setIsLembur(!!c)} />
            <Label htmlFor="lembur" className="cursor-pointer text-sm">
              Lembur (lanjutan shift sebelumnya)
            </Label>
          </div>
          <div>
            <Label>Catatan Awal Shift <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            <Textarea
              placeholder="Kondisi awal area, serah terima dari shift sebelumnya, dll."
              value={catatanAwal}
              onChange={(e) => setCatatanAwal(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={start.isPending}>
            {start.isPending ? 'Memulai...' : 'Mulai Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
