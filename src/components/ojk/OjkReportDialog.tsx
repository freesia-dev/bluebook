import React, { useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { CalendarIcon, FileBarChart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { generateOjkReportPDF } from '@/lib/ojk-report';
import { getSuratKeluar } from '@/lib/supabase-store';
import { OjkStatus } from '@/types';

type RangeMode = 'all' | 'this_month' | 'last_30' | 'this_year' | 'custom';

interface Props {
  generatedBy?: string;
  trigger?: React.ReactNode;
}

export const OjkReportDialog: React.FC<Props> = ({ generatedBy = 'Admin', trigger }) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [statusFilter, setStatusFilter] = useState<OjkStatus | 'all'>('all');
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const resolveRange = (): { from: Date | null; to: Date | null } => {
    const now = new Date();
    if (rangeMode === 'all') return { from: null, to: null };
    if (rangeMode === 'this_month') {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }
    if (rangeMode === 'last_30') {
      const f = new Date(); f.setDate(now.getDate() - 29);
      return { from: f, to: now };
    }
    if (rangeMode === 'this_year') {
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31),
      };
    }
    return { from: from ?? null, to: to ?? null };
  };

  const handleGenerate = async () => {
    const { from: f, to: t } = resolveRange();
    if (rangeMode === 'custom' && !f && !t) {
      toast({ title: 'Rentang Kosong', description: 'Pilih minimal salah satu tanggal.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await generateOjkReportPDF({ data, generatedBy, statusFilter, dateFrom: f, dateTo: t });
      toast({ title: 'Laporan Dibuat', description: 'Laporan SLIK OJK berhasil diunduh.' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message || 'Gagal membuat laporan.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <FileBarChart className="w-4 h-4" />
            Generate Laporan
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-primary" />
            Generate Laporan SLIK OJK
          </DialogTitle>
          <DialogDescription>
            Pilih rentang periode dan filter status sebelum mengunduh laporan PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Rentang Periode</Label>
            <Select value={rangeMode} onValueChange={(v) => setRangeMode(v as RangeMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Data</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="last_30">30 Hari Terakhir</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Rentang Kustom…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rangeMode === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dari</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('justify-start text-left font-normal', !from && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 w-4 h-4" />
                      {from ? format(from, 'dd MMM yyyy', { locale: idLocale }) : 'Pilih'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={from} onSelect={setFrom} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sampai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('justify-start text-left font-normal', !to && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 w-4 h-4" />
                      {to ? format(to, 'dd MMM yyyy', { locale: idLocale }) : 'Pilih'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={to} onSelect={setTo} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status Pengajuan</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="diajukan">Diajukan</SelectItem>
                <SelectItem value="diproses">Diproses</SelectItem>
                <SelectItem value="selesai">Disetujui</SelectItem>
                <SelectItem value="ditolak">Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBarChart className="w-4 h-4" />}
            {loading ? 'Membuat…' : 'Unduh PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
