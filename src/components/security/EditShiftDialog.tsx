import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SHIFT_LABEL, ShiftType, SecurityShift, useUpdateShift, useSecurityUsers } from '@/hooks/use-security-log';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift: SecurityShift;
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  try {
    return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
};

export const EditShiftDialog: React.FC<Props> = ({ open, onOpenChange, shift }) => {
  const update = useUpdateShift();
  const { toast } = useToast();
  const { data: secUsers = [] } = useSecurityUsers();

  const [tanggal, setTanggal] = useState(shift.tanggal);
  const [jenisShift, setJenisShift] = useState<ShiftType>(shift.shift);
  const [nama, setNama] = useState(shift.nama_petugas);
  const [jamMulai, setJamMulai] = useState(toLocalInput(shift.jam_mulai));
  const [jamSelesai, setJamSelesai] = useState(toLocalInput(shift.jam_selesai));
  const [isLembur, setIsLembur] = useState(shift.is_lembur);
  const [kondisiAkhir, setKondisiAkhir] = useState(shift.kondisi_akhir || '');
  const [serahTerimaKe, setSerahTerimaKe] = useState(shift.serah_terima_ke_nama || '');
  const [catatanSerahTerima, setCatatanSerahTerima] = useState(shift.catatan_serah_terima || '');

  useEffect(() => {
    if (!open) return;
    setTanggal(shift.tanggal);
    setJenisShift(shift.shift);
    setNama(shift.nama_petugas);
    setJamMulai(toLocalInput(shift.jam_mulai));
    setJamSelesai(toLocalInput(shift.jam_selesai));
    setIsLembur(shift.is_lembur);
    setKondisiAkhir(shift.kondisi_akhir || '');
    setSerahTerimaKe(shift.serah_terima_ke_nama || '');
    setCatatanSerahTerima(shift.catatan_serah_terima || '');
  }, [open, shift]);

  const submit = async () => {
    if (!nama.trim()) {
      toast({ title: 'Nama petugas wajib diisi', variant: 'destructive' });
      return;
    }
    if (!jamMulai) {
      toast({ title: 'Jam mulai wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      const matched = secUsers.find((u) => u.nama === nama.trim());
      await update.mutateAsync({
        id: shift.id,
        tanggal,
        shift: jenisShift,
        nama_petugas: nama.trim(),
        petugas_user_id: matched?.user_id ?? shift.petugas_user_id ?? null,
        jam_mulai: new Date(jamMulai).toISOString(),
        jam_selesai: jamSelesai ? new Date(jamSelesai).toISOString() : null,
        is_lembur: isLembur,
        kondisi_akhir: kondisiAkhir.trim() || null,
        serah_terima_ke_nama: serahTerimaKe.trim() || null,
        catatan_serah_terima: catatanSerahTerima.trim() || null,
      });
      toast({ title: 'Shift diperbarui' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Gagal update shift', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Shift (Admin)</DialogTitle>
          <DialogDescription className="text-xs">
            Perbaiki data shift jika ada kesalahan input (mis. salah pilih jenis shift atau petugas).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label>Jenis Shift</Label>
              <Select value={jenisShift} onValueChange={(v) => setJenisShift(v as ShiftType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['pagi', 'sore', 'malam'] as ShiftType[]).map((s) => (
                    <SelectItem key={s} value={s}>{SHIFT_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Nama Petugas</Label>
            {secUsers.length > 0 ? (
              <Select value={nama} onValueChange={setNama}>
                <SelectTrigger><SelectValue placeholder="Pilih petugas" /></SelectTrigger>
                <SelectContent>
                  {secUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.nama}>{u.nama}</SelectItem>
                  ))}
                  {!secUsers.some((u) => u.nama === nama) && nama && (
                    <SelectItem value={nama}>{nama} (manual)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input value={nama} onChange={(e) => setNama(e.target.value)} />
            )}
            <Input className="mt-2" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Atau ketik manual" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jam Mulai</Label>
              <Input type="datetime-local" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
            </div>
            <div>
              <Label>Jam Selesai</Label>
              <Input type="datetime-local" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Kosongkan jika shift masih aktif</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="edit-lembur" checked={isLembur} onCheckedChange={(c) => setIsLembur(!!c)} />
            <Label htmlFor="edit-lembur" className="cursor-pointer text-sm">Lembur</Label>
          </div>
          <div className="border-t pt-3 space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">Data Serah Terima (opsional)</div>
            <div>
              <Label>Kondisi Akhir</Label>
              <Textarea value={kondisiAkhir} onChange={(e) => setKondisiAkhir(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Diserahkan kepada</Label>
              <Input value={serahTerimaKe} onChange={(e) => setSerahTerimaKe(e.target.value)} />
            </div>
            <div>
              <Label>Catatan Serah Terima</Label>
              <Textarea value={catatanSerahTerima} onChange={(e) => setCatatanSerahTerima(e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
