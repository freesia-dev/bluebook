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

const SHIFT_ORDER: ShiftType[] = ['pagi', 'sore', 'malam'];

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

  // Shift yang sudah pernah dicatat (aktif maupun selesai) untuk tanggal ini — tidak boleh dibuat ulang
  const usedShifts = new Set(
    todayShifts.filter((s) => s.tanggal === tanggal && !s.is_lembur).map((s) => s.shift),
  );
  const availableShifts = SHIFT_ORDER.filter((s) => isLembur || !usedShifts.has(s));

  // Auto-pindah pilihan kalau shift terpilih sudah dipakai
  React.useEffect(() => {
    if (!isLembur && usedShifts.has(shift) && availableShifts.length > 0) {
      setShift(availableShifts[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tanggal, isLembur, todayShifts.length]);

  const previousShift = todayShifts
    .filter((s) => s.status === 'selesai')
    .sort((a, b) => (a.jam_selesai || '').localeCompare(b.jam_selesai || ''))
    .pop();

  const submit = async () => {
    if (!nama.trim()) {
      toast({ title: 'Nama petugas wajib diisi', variant: 'destructive' });
      return;
    }
    if (isPengganti && !namaPengganti.trim()) {
      toast({ title: 'Nama security pengganti wajib diisi', variant: 'destructive' });
      return;
    }
    if (!isLembur && usedShifts.has(shift)) {
      toast({ title: 'Shift ini sudah pernah dibuat', description: 'Pilih shift lain atau aktifkan opsi Lembur.', variant: 'destructive' });
      return;
    }
    const finalNama = isPengganti ? `Pengganti - ${namaPengganti.trim()}` : nama.trim();
    try {
      await start.mutateAsync({
        tanggal,
        shift,
        nama_petugas: finalNama,
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
                  {availableShifts.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">Semua shift sudah dibuat untuk tanggal ini</div>
                  ) : (
                    availableShifts.map((s) => (
                      <SelectItem key={s} value={s}>{SHIFT_LABEL[s]}</SelectItem>
                    ))
                  )}
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
          {isPengganti && (
            <div>
              <Label>Nama Security Pengganti (Manual)</Label>
              <Input
                value={namaPengganti}
                onChange={(e) => setNamaPengganti(e.target.value)}
                placeholder="Tulis nama lengkap security pengganti"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Akan dicatat sebagai: <strong>Pengganti - {namaPengganti || '...'}</strong>
              </p>
            </div>
          )}
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
          <Button onClick={submit} disabled={start.isPending || availableShifts.length === 0}>
            {start.isPending ? 'Memulai...' : 'Mulai Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
