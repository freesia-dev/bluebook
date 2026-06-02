import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { SHIFT_LABEL, ShiftType, useStartShift, SecurityShift, useSecurityUsers, useKondisiTemplates, useSecurityShifts } from '@/hooks/use-security-log';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, parseISO } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

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
  const { data: kondisiTemplates = [] } = useKondisiTemplates();

  const [nama, setNama] = useState(userName);
  const [namaPengganti, setNamaPengganti] = useState('');
  const [shift, setShift] = useState<ShiftType>(detectShift());
  const [isLembur, setIsLembur] = useState(false);
  const [catatanAwal, setCatatanAwal] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [jamMulai, setJamMulai] = useState(format(new Date(), 'HH:mm'));

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

  // ===== RULE: cannot start a shift on a new day if the previous day's
  // pagi/sore/malam are not ALL completed. Empty prev day = allow (e.g. first day).
  const prevDateStr = format(subDays(parseISO(tanggal), 1), 'yyyy-MM-dd');
  const { data: prevDayShifts = [] } = useSecurityShifts(prevDateStr);
  const prevDayBlocker = React.useMemo(() => {
    const real = prevDayShifts.filter((s) => !s.is_lembur);
    if (real.length === 0) return null; // no prior day data, allow
    const missing = SHIFT_ORDER.filter((s) => !real.some((r) => r.shift === s));
    const belumSelesai = real.filter((s) => s.status !== 'selesai').map((s) => SHIFT_LABEL[s.shift]);
    if (missing.length === 0 && belumSelesai.length === 0) return null;
    return {
      missing: missing.map((s) => SHIFT_LABEL[s]),
      belumSelesai,
    };
  }, [prevDayShifts]);

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
    if (prevDayBlocker) {
      const parts: string[] = [];
      if (prevDayBlocker.missing.length) parts.push(`Shift hilang: ${prevDayBlocker.missing.join(', ')}`);
      if (prevDayBlocker.belumSelesai.length) parts.push(`Belum selesai: ${prevDayBlocker.belumSelesai.join(', ')}`);
      toast({
        title: `Shift hari sebelumnya (${prevDateStr}) belum lengkap`,
        description: parts.join(' · ') + '. Lengkapi & akhiri shift hari sebelumnya dulu.',
        variant: 'destructive',
      });
      return;
    }
    const finalNama = isPengganti ? `Pengganti - ${namaPengganti.trim()}` : nama.trim();
    // Build ISO timestamp from tanggal + jamMulai (local time)
    const [hh, mm] = (jamMulai || '00:00').split(':');
    const jamIso = new Date(`${tanggal}T${hh.padStart(2, '0')}:${(mm || '00').padStart(2, '0')}:00`).toISOString();
    try {
      await start.mutateAsync({
        tanggal,
        shift,
        nama_petugas: finalNama,
        is_lembur: isLembur,
        parent_shift_id: isLembur ? previousShift?.id ?? null : null,
        catatan_awal: catatanAwal.trim(),
        jam_mulai: jamIso,
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
          {prevDayBlocker && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold mb-0.5">Shift hari sebelumnya ({prevDateStr}) belum lengkap</div>
                {prevDayBlocker.missing.length > 0 && (
                  <div>Belum dibuat: <strong>{prevDayBlocker.missing.join(', ')}</strong></div>
                )}
                {prevDayBlocker.belumSelesai.length > 0 && (
                  <div>Belum diakhiri: <strong>{prevDayBlocker.belumSelesai.join(', ')}</strong></div>
                )}
                <div className="mt-1 opacity-80">Selesaikan ketiga shift (Pagi, Sore, Malam) di tanggal {prevDateStr} sebelum memulai shift baru.</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
            </div>
            <div>
              <Label>Jam Mulai</Label>
              <Input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Sesuaikan jika input tidak realtime</p>
            </div>
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
            {kondisiTemplates.length > 0 && (
              <Select
                value=""
                onValueChange={(v) => {
                  if (!v) return;
                  setCatatanAwal((prev) => (prev.trim() ? `${prev.trim()} ${v}` : v));
                }}
              >
                <SelectTrigger className="mt-1 mb-2 h-9 text-xs">
                  <SelectValue placeholder="Pilih template kondisi (opsional) — bisa diedit manual" />
                </SelectTrigger>
                <SelectContent>
                  {kondisiTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.label} className="text-xs">{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          <Button onClick={submit} disabled={start.isPending || availableShifts.length === 0 || !!prevDayBlocker}>
            {start.isPending ? 'Memulai...' : 'Mulai Shift'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
