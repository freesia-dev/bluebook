import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useSecurityShifts, SHIFT_LABEL, SHIFT_PERIODE_ORDER, useSignBA } from '@/hooks/use-security-log';
import { ShiftCard } from '@/components/security/ShiftCard';
import { StartShiftDialog } from '@/components/security/StartShiftDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Printer, ShieldCheck, CheckCircle2, Printer as PrinterIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

const LogSecurityPage: React.FC = () => {
  const { permissions, userName } = useAuth();
  const { toast } = useToast();
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [insidenOnly, setInsidenOnly] = useState(false);
  const { data: shifts = [], isLoading } = useSecurityShifts(tanggal);
  const [startOpen, setStartOpen] = useState(false);
  const signBA = useSignBA();

  // Bulk print range
  const today = format(new Date(), 'yyyy-MM-dd');
  const firstOfMonth = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const [bulkDari, setBulkDari] = useState(firstOfMonth);
  const [bulkSampai, setBulkSampai] = useState(today);
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleBulkPrint = () => {
    if (!bulkDari || !bulkSampai) {
      toast({ title: 'Lengkapi rentang tanggal', variant: 'destructive' });
      return;
    }
    if (bulkSampai < bulkDari) {
      toast({ title: 'Tanggal akhir harus >= tanggal awal', variant: 'destructive' });
      return;
    }
    setBulkOpen(false);
    window.open(`/security/log/cetak-bulk?dari=${bulkDari}&sampai=${bulkSampai}`, '_blank');
  };


  const sorted = useMemo(() => {
    return [...shifts].sort((a, b) => {
      const o = (SHIFT_PERIODE_ORDER[a.shift] ?? 99) - (SHIFT_PERIODE_ORDER[b.shift] ?? 99);
      if (o !== 0) return o;
      return a.jam_mulai.localeCompare(b.jam_mulai);
    });
  }, [shifts]);

  const isSigned = sorted.some((s) => !!s.ttd_pimpinan_at);
  const signedBy = sorted.find((s) => !!s.ttd_pimpinan_nama)?.ttd_pimpinan_nama;
  const allClosed = sorted.length > 0 && sorted.every((s) => s.status === 'selesai');
  const activeShift = sorted.find((s) => s.status === 'aktif');
  const [blockOpen, setBlockOpen] = useState(false);

  const handleStartClick = () => {
    if (activeShift) {
      setBlockOpen(true);
      return;
    }
    setStartOpen(true);
  };

  const handlePrint = () => {
    window.open(`/security/log/cetak?tanggal=${tanggal}`, '_blank');
  };

  const handleApprove = async () => {
    try {
      await signBA.mutateAsync({ tanggal, nama_pimpinan: userName });
      toast({ title: 'BA disetujui', description: `Tanda tangan digital tercatat untuk ${tanggal}` });
    } catch (err: any) {
      toast({ title: 'Gagal approve', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Log Security"
        description="Catatan aktivitas pengawasan harian per shift Security KCP Telihan"
      />

      <Card className="p-3 sm:p-4 mb-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-end sm:justify-between gap-3">
        <div className="w-full sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="mt-1 w-full sm:w-44"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(tanggal), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:items-center w-full sm:w-auto">
          {permissions.canCommentSecurityLog && (
            <label className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md border bg-violet-50 border-violet-200 text-violet-900 cursor-pointer">
              <input
                type="checkbox"
                checked={insidenOnly}
                onChange={(e) => setInsidenOnly(e.target.checked)}
                className="accent-violet-600"
              />
              Tampilkan hanya insiden
            </label>
          )}

          {permissions.canSignSecurityBA && (
            isSigned ? (
              <Button variant="outline" disabled className="col-span-2 sm:col-span-1 w-full sm:w-auto border-emerald-300 text-emerald-700 bg-emerald-50">
                <CheckCircle2 className="w-4 h-4 mr-2" />Sudah Disetujui{signedBy ? ` · ${signedBy}` : ''}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="col-span-2 sm:col-span-1 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={sorted.length === 0 || !allClosed || signBA.isPending}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {signBA.isPending ? 'Memproses...' : 'Approve BA'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Setujui & Sahkan BA tanggal ini?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Anda akan menandatangani secara digital BA Log Security untuk{' '}
                      <strong>{format(new Date(tanggal), 'dd MMMM yyyy', { locale: idLocale })}</strong> atas nama{' '}
                      <strong>{userName}</strong>. QR verifikasi akan dibuat dan tindakan ini tidak dapat dibatalkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                      Setujui & Sahkan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          )}
          {!permissions.canSignSecurityBA && sorted.length > 0 && (
            isSigned ? (
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md border border-emerald-300 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Log harian sudah disetujui{signedBy ? ` oleh ${signedBy}` : ''}</span>
              </div>
            ) : (
              <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800">
                <ShieldCheck className="w-4 h-4" />
                <span>{allClosed ? 'Menunggu approval Pimpinan' : 'Belum disetujui (shift belum selesai)'}</span>
              </div>
            )
          )}
          {permissions.canPrintSecurityBA && (
            <Button variant="outline" className="w-full sm:w-auto" onClick={handlePrint} disabled={sorted.length === 0}>
              <Printer className="w-4 h-4 mr-2" />Cetak BA
            </Button>
          )}
          {permissions.canStartSecurityShift && (
            <Button className="w-full sm:w-auto" onClick={handleStartClick}>
              <Plus className="w-4 h-4 mr-2" />Mulai Shift
            </Button>
          )}
        </div>
      </Card>

      <AlertDialog open={blockOpen} onOpenChange={setBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tidak bisa memulai shift baru</AlertDialogTitle>
            <AlertDialogDescription>
              Masih ada shift <strong>{activeShift ? SHIFT_LABEL[activeShift.shift] : ''}</strong> oleh{' '}
              <strong>{activeShift?.nama_petugas}</strong> yang belum melakukan serah terima.
              Harap selesaikan <em>Akhiri & Serah Terima</em> pada shift tersebut terlebih dahulu sebelum memulai shift baru.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setBlockOpen(false)}>Mengerti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">Memuat...</Card>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Belum ada shift dicatat untuk tanggal ini.
          {permissions.canStartSecurityShift && ' Klik "Mulai Shift" untuk memulai pencatatan.'}
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((s) => (
            <ShiftCard key={s.id} shift={s} insidenOnly={insidenOnly} />
          ))}

        </div>
      )}

      <StartShiftDialog open={startOpen} onOpenChange={setStartOpen} todayShifts={shifts} />
    </MainLayout>
  );
};

export default LogSecurityPage;
