import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FileSpreadsheet, FileDown, Wallet, TrendingDown, Target, Plus, Pencil, Trash2 } from 'lucide-react';
import { useMLFUploads, useMLFDataByBranch, type MLFRow } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum } from '@/lib/mlf-utils';
import { getUnit, isProduktif, getAngsuranPokok, type UnitKredit } from '@/lib/produktif-utils';
import { useProyeksi, useProyeksiMutations, type ProyeksiRow } from '@/hooks/use-proyeksi';
import { useAuth } from '@/contexts/AuthContext';
import { getRolePermissions } from '@/lib/role-permissions';

type Segment = 'konsumtif' | 'mikro' | 'kecil' | 'menengah';

const SEGMENT_LABEL: Record<Segment, string> = {
  konsumtif: 'Konsumtif',
  mikro: 'Produktif Mikro (< 100 Juta)',
  kecil: 'Produktif Kecil (100 – 500 Juta)',
  menengah: 'Produktif Lainnya (> 500 Juta)',
};

const SEGMENT_ORDER: Segment[] = ['konsumtif', 'mikro', 'kecil', 'menengah'];

const JENIS_KREDIT_OPTIONS = [
  'Konsumtif',
  'Produktif - Modal Kerja',
  'Produktif - Investasi',
  'KUR',
  'Lainnya',
];

const segmentFromValue = (jenis: string, plafon: number): Segment => {
  if (jenis.toLowerCase().startsWith('konsumtif')) return 'konsumtif';
  if (plafon < 100_000_000) return 'mikro';
  if (plafon <= 500_000_000) return 'kecil';
  return 'menengah';
};

const getSegment = (row: MLFRow): Segment => {
  if (!isProduktif(row)) return 'konsumtif';
  const pla = Number(row.pla) || 0;
  if (pla < 100_000_000) return 'mikro';
  if (pla <= 500_000_000) return 'kecil';
  return 'menengah';
};

interface Item {
  l0lnno: string;
  nama: string;
  segment: Segment;
  unit: UnitKredit;
  plafon: number;
  baki: number;
  angsuran: number;
  kol: number;
  produk: string;
  jatuhTempo: string | null;
  sisaBulan: number;
}

const monthsUntil = (dateStr?: string | null, ref?: Date): number => {
  if (!dateStr) return 9999;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 9999;
  const base = ref ?? new Date();
  return (d.getFullYear() - base.getFullYear()) * 12 + (d.getMonth() - base.getMonth());
};

const toItem = (r: MLFRow, ref: Date): Item => ({
  l0lnno: r.l0lnno || '-',
  nama: r.l0name || '-',
  segment: getSegment(r),
  unit: getUnit(r),
  plafon: Number(r.pla) || 0,
  baki: Number(r.baki) || 0,
  angsuran: getAngsuranPokok(r),
  kol: Number(r.kol) || 0,
  produk: r.lytitl || '-',
  jatuhTempo: r.date1 || null,
  sisaBulan: monthsUntil(r.date1, ref),
});

const sum = (arr: Item[], key: 'plafon' | 'baki' | 'angsuran') => arr.reduce((a, b) => a + b[key], 0);

const SummaryTable: React.FC<{ items: Item[]; valueKey: 'baki' | 'angsuran' | 'plafon'; valueLabel: string }> = ({ items, valueKey, valueLabel }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Segmentasi</TableHead>
        <TableHead className="text-right">Debitur</TableHead>
        <TableHead className="text-right">{valueLabel}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {SEGMENT_ORDER.map((s) => {
        const rows = items.filter((i) => i.segment === s);
        return (
          <TableRow key={s}>
            <TableCell className="text-sm">{SEGMENT_LABEL[s]}</TableCell>
            <TableCell className="text-right text-sm">{fmtNum(rows.length)}</TableCell>
            <TableCell className="text-right text-sm font-medium">{fmtIDR(sum(rows, valueKey))}</TableCell>
          </TableRow>
        );
      })}
      <TableRow className="bg-muted/50 font-bold">
        <TableCell>TOTAL</TableCell>
        <TableCell className="text-right">{fmtNum(items.length)}</TableCell>
        <TableCell className="text-right">{fmtIDR(sum(items, valueKey))}</TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

const DetailTable: React.FC<{ items: Item[]; valueKey: 'baki' | 'angsuran'; valueLabel: string }> = ({ items, valueKey, valueLabel }) => (
  <div className="max-h-[420px] overflow-auto rounded-lg border">
    <Table>
      <TableHeader className="sticky top-0 bg-background z-10">
        <TableRow>
          <TableHead>No. Loan</TableHead>
          <TableHead>Nama Debitur</TableHead>
          <TableHead>Segmentasi</TableHead>
          <TableHead>Produk</TableHead>
          <TableHead className="text-right">Plafon</TableHead>
          <TableHead className="text-right">{valueLabel}</TableHead>
          <TableHead className="text-center">Kol</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 && (
          <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">Tidak ada data</TableCell></TableRow>
        )}
        {items.map((i, idx) => (
          <TableRow key={`${i.l0lnno}-${idx}`} className={idx % 2 ? 'bg-muted/30' : ''}>
            <TableCell className="text-xs font-mono">{i.l0lnno}</TableCell>
            <TableCell className="text-xs">{i.nama}</TableCell>
            <TableCell className="text-xs">{SEGMENT_LABEL[i.segment]}</TableCell>
            <TableCell className="text-xs">{i.produk}</TableCell>
            <TableCell className="text-xs text-right">{fmtIDR(i.plafon)}</TableCell>
            <TableCell className="text-xs text-right font-medium">{fmtIDR(i[valueKey])}</TableCell>
            <TableCell className="text-xs text-center">{i.kol === 0 ? 'E' : i.kol}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const emptyForm = (unit: string) => ({
  unit,
  nama_debitur: '',
  jenis_kredit: 'Konsumtif',
  plafon: 0,
  jangka_waktu_bulan: 0,
  keterangan: '',
});

/** Form + tabel proyeksi manual */
const ProyeksiManual: React.FC<{ unit: 'telihan' | 'meranti'; rows: ProyeksiRow[]; canEdit: boolean }> = ({ unit, rows, canEdit }) => {
  const { create, update, remove } = useProyeksiMutations();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProyeksiRow | null>(null);
  const [form, setForm] = useState(emptyForm(unit));

  const openNew = () => { setEditing(null); setForm(emptyForm(unit)); setOpen(true); };
  const openEdit = (r: ProyeksiRow) => {
    setEditing(r);
    setForm({
      unit: r.unit,
      nama_debitur: r.nama_debitur,
      jenis_kredit: r.jenis_kredit,
      plafon: r.plafon,
      jangka_waktu_bulan: r.jangka_waktu_bulan,
      keterangan: r.keterangan || '',
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nama_debitur.trim()) return;
    const payload = { ...form, unit, plafon: Number(form.plafon) || 0, jangka_waktu_bulan: Number(form.jangka_waktu_bulan) || 0 };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
    setOpen(false);
  };

  const total = rows.reduce((s, r) => s + Number(r.plafon || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Rekap Proyeksi per Segmentasi (input manual)</CardTitle>
            {canEdit && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Tambah Proyeksi</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Edit Proyeksi' : 'Tambah Proyeksi'} — Unit {unit === 'meranti' ? 'Meranti' : 'Telihan'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nama Debitur</Label>
                      <Input value={form.nama_debitur} onChange={(e) => setForm({ ...form, nama_debitur: e.target.value })} placeholder="Nama calon debitur" />
                    </div>
                    <div>
                      <Label>Jenis Kredit</Label>
                      <Select value={form.jenis_kredit} onValueChange={(v) => setForm({ ...form, jenis_kredit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {JENIS_KREDIT_OPTIONS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Plafon (Rp)</Label>
                        <Input type="number" value={form.plafon} onChange={(e) => setForm({ ...form, plafon: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Jangka Waktu (bulan)</Label>
                        <Input type="number" value={form.jangka_waktu_bulan} onChange={(e) => setForm({ ...form, jangka_waktu_bulan: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label>Keterangan (opsional)</Label>
                      <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                    <Button onClick={submit}>Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Segmentasi</TableHead>
                <TableHead className="text-right">Debitur</TableHead>
                <TableHead className="text-right">Plafon Proyeksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SEGMENT_ORDER.map((s) => {
                const seg = rows.filter((r) => segmentFromValue(r.jenis_kredit, Number(r.plafon) || 0) === s);
                return (
                  <TableRow key={s}>
                    <TableCell className="text-sm">{SEGMENT_LABEL[s]}</TableCell>
                    <TableCell className="text-right text-sm">{fmtNum(seg.length)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmtIDR(seg.reduce((a, b) => a + Number(b.plafon || 0), 0))}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{fmtNum(rows.length)}</TableCell>
                <TableCell className="text-right">{fmtIDR(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="max-h-[420px] overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Nama Debitur</TableHead>
              <TableHead>Jenis Kredit</TableHead>
              <TableHead>Segmentasi</TableHead>
              <TableHead className="text-right">Plafon</TableHead>
              <TableHead className="text-center">JW (bln)</TableHead>
              <TableHead>Keterangan</TableHead>
              {canEdit && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-sm text-muted-foreground py-6">Belum ada data proyeksi — tambahkan manual</TableCell></TableRow>
            )}
            {rows.map((r, idx) => (
              <TableRow key={r.id} className={idx % 2 ? 'bg-muted/30' : ''}>
                <TableCell className="text-xs font-medium">{r.nama_debitur}</TableCell>
                <TableCell className="text-xs">{r.jenis_kredit}</TableCell>
                <TableCell className="text-xs">{SEGMENT_LABEL[segmentFromValue(r.jenis_kredit, Number(r.plafon) || 0)]}</TableCell>
                <TableCell className="text-xs text-right font-medium">{fmtIDR(Number(r.plafon) || 0)}</TableCell>
                <TableCell className="text-xs text-center">{r.jangka_waktu_bulan || '-'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.keterangan || '-'}</TableCell>
                {canEdit && (
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const LaporanBulananContent: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);
  const [unit, setUnit] = useState<'telihan' | 'meranti'>('telihan');
  const { userRole } = useAuth() as any;
  const permissions = getRolePermissions(userRole);
  const canEdit = !!permissions?.canEdit;

  const { data: proyeksiAll = [] } = useProyeksi();

  useEffect(() => {
    if (!selectedUpload && uploads.length > 0) setSelectedUpload(uploads[0].id);
  }, [uploads, selectedUpload]);

  const selInfo = uploads.find((u) => u.id === selectedUpload);
  const refDate = selInfo ? new Date(selInfo.jobdate) : new Date();

  // Baseline = MLF terakhir sebelum awal bulan berjalan
  const baselineInfo = useMemo(() => {
    if (!selInfo) return undefined;
    const monthStart = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    return uploads
      .filter((u) => new Date(u.jobdate) < monthStart)
      .sort((a, b) => new Date(b.jobdate).getTime() - new Date(a.jobdate).getTime())[0];
  }, [uploads, selInfo, refDate]);

  const { data: currentRows = [], isLoading } = useMLFDataByBranch(selectedUpload, '143');
  const { data: baselineRows = [] } = useMLFDataByBranch(baselineInfo?.id, '143');

  const current = useMemo(
    () => currentRows.filter((r) => (Number(r.kol) || 0) !== 0).map((r) => toItem(r, refDate)),
    [currentRows, refDate],
  );

  // Pelunasan = ada di baseline, hilang di MLF terkini
  const pelunasan = useMemo(() => {
    const now = new Set(currentRows.map((r) => r.l0lnno).filter(Boolean) as string[]);
    return baselineRows
      .filter((r) => r.l0lnno && !now.has(r.l0lnno))
      .filter((r) => (Number(r.kol) || 0) !== 0)
      .map((r) => toItem(r, refDate));
  }, [currentRows, baselineRows, refDate]);

  const byUnit = (items: Item[]) =>
    unit === 'meranti' ? items.filter((i) => i.unit === 'meranti') : items.filter((i) => i.unit !== 'meranti');

  const pelunasanU = byUnit(pelunasan);
  const runoffU = byUnit(current).filter((i) => i.angsuran > 0);
  const proyeksiU = useMemo(() => proyeksiAll.filter((p) => (p.unit || 'telihan') === unit), [proyeksiAll, unit]);
  const proyeksiTotal = proyeksiU.reduce((s, r) => s + (Number(r.plafon) || 0), 0);

  const periode = selInfo ? format(new Date(selInfo.jobdate), 'MMMM yyyy', { locale: idLocale }) : '-';
  const unitLabel = unit === 'meranti' ? 'Unit Meranti' : 'KCP Telihan (tanpa Meranti)';

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const mkSummary = (title: string, items: Item[], key: 'baki' | 'angsuran') => {
      const rows: (string | number)[][] = [
        [`LAPORAN BULANAN — ${title.toUpperCase()}`],
        [`Periode MLF: ${periode}`, `Unit: ${unitLabel}`],
        [],
        ['Segmentasi', 'Jumlah Debitur', key === 'baki' ? 'Nilai (Rp)' : 'Angsuran Pokok / Bulan (Rp)'],
      ];
      SEGMENT_ORDER.forEach((s) => {
        const seg = items.filter((i) => i.segment === s);
        rows.push([SEGMENT_LABEL[s], seg.length, sum(seg, key)]);
      });
      rows.push(['TOTAL', items.length, sum(items, key)]);
      rows.push([]);
      rows.push(['No. Loan', 'Nama Debitur', 'Segmentasi', 'Produk', 'Plafon', key === 'baki' ? 'Nilai' : 'Angsuran Pokok', 'Kol']);
      items.forEach((i) => rows.push([i.l0lnno, i.nama, SEGMENT_LABEL[i.segment], i.produk, i.plafon, i[key], i.kol]));
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 28 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 6 }];
      return ws;
    };

    const mkProyeksi = () => {
      const rows: (string | number)[][] = [
        ['LAPORAN BULANAN — PROYEKSI (INPUT MANUAL)'],
        [`Periode: ${periode}`, `Unit: ${unitLabel}`],
        [],
        ['Segmentasi', 'Jumlah Calon Debitur', 'Plafon Proyeksi (Rp)'],
      ];
      SEGMENT_ORDER.forEach((s) => {
        const seg = proyeksiU.filter((p) => segmentFromValue(p.jenis_kredit, Number(p.plafon) || 0) === s);
        rows.push([SEGMENT_LABEL[s], seg.length, seg.reduce((a, b) => a + (Number(b.plafon) || 0), 0)]);
      });
      rows.push(['TOTAL', proyeksiU.length, proyeksiTotal]);
      rows.push([]);
      rows.push(['Nama Debitur', 'Jenis Kredit', 'Segmentasi', 'Plafon', 'Jangka Waktu (bln)', 'Keterangan']);
      proyeksiU.forEach((p) =>
        rows.push([
          p.nama_debitur,
          p.jenis_kredit,
          SEGMENT_LABEL[segmentFromValue(p.jenis_kredit, Number(p.plafon) || 0)],
          Number(p.plafon) || 0,
          p.jangka_waktu_bulan || 0,
          p.keterangan || '',
        ]),
      );
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 34 }, { wch: 24 }, { wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 30 }];
      return ws;
    };

    XLSX.utils.book_append_sheet(wb, mkSummary('Pelunasan', pelunasanU, 'baki'), 'Pelunasan');
    XLSX.utils.book_append_sheet(wb, mkSummary('Run Off', runoffU, 'angsuran'), 'Run Off');
    XLSX.utils.book_append_sheet(wb, mkProyeksi(), 'Proyeksi');
    XLSX.writeFile(wb, `Laporan-Bulanan-${unit}-${periode.replace(' ', '-')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFillColor(15, 52, 96);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('LAPORAN BULANAN — PELUNASAN, RUN OFF & PROYEKSI', 14, 10);
    doc.setFontSize(9);
    doc.text(`Periode MLF: ${periode}  |  ${unitLabel}`, 14, 17);
    doc.setTextColor(0, 0, 0);

    let y = 30;
    const block = (title: string, items: Item[], key: 'baki' | 'angsuran', valueLabel: string) => {
      doc.setFontSize(11);
      doc.text(title, 14, y);
      y += 3;
      autoTable(doc, {
        startY: y,
        head: [['Segmentasi', 'Debitur', valueLabel]],
        body: SEGMENT_ORDER.map((s) => {
          const seg = items.filter((i) => i.segment === s);
          return [SEGMENT_LABEL[s], fmtNum(seg.length), fmtIDR(sum(seg, key))];
        }).concat([['TOTAL', fmtNum(items.length), fmtIDR(sum(items, key))]]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 52, 96] },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    };
    block('1. Pelunasan Bulan Berjalan', pelunasanU, 'baki', 'Nilai Pelunasan');
    block('2. Run Off (Angsuran Pokok / Bulan)', runoffU, 'angsuran', 'Angsuran Pokok');

    doc.setFontSize(11);
    doc.text('3. Proyeksi / Calon Prospek (input manual)', 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [['Segmentasi', 'Calon Debitur', 'Plafon Proyeksi']],
      body: SEGMENT_ORDER.map((s) => {
        const seg = proyeksiU.filter((p) => segmentFromValue(p.jenis_kredit, Number(p.plafon) || 0) === s);
        return [SEGMENT_LABEL[s], fmtNum(seg.length), fmtIDR(seg.reduce((a, b) => a + (Number(b.plafon) || 0), 0))];
      }).concat([['TOTAL', fmtNum(proyeksiU.length), fmtIDR(proyeksiTotal)]]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 52, 96] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    if (proyeksiU.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Nama Debitur', 'Jenis Kredit', 'Plafon', 'JW (bln)', 'Keterangan']],
        body: proyeksiU.map((p) => [
          p.nama_debitur,
          p.jenis_kredit,
          fmtIDR(Number(p.plafon) || 0),
          String(p.jangka_waktu_bulan || '-'),
          p.keterangan || '-',
        ]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 64, 175] },
        columnStyles: { 2: { halign: 'right' }, 3: { halign: 'center' } },
        margin: { left: 14, right: 14 },
      });
    }
    doc.save(`Laporan-Bulanan-${unit}-${periode.replace(' ', '-')}.pdf`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={selectedUpload} onValueChange={setSelectedUpload}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pilih data MLF" /></SelectTrigger>
          <SelectContent>
            {uploads.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{unitLabel}</Badge>
        {baselineInfo ? (
          <Badge variant="secondary">
            Baseline: {format(new Date(baselineInfo.jobdate), 'dd MMM yyyy', { locale: idLocale })}
          </Badge>
        ) : (
          <Badge variant="destructive">Baseline bulan lalu belum ada</Badge>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileDown className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <Tabs value={unit} onValueChange={(v) => setUnit(v as 'telihan' | 'meranti')} className="mb-4">
        <TabsList>
          <TabsTrigger value="telihan">Telihan (tanpa Meranti)</TabsTrigger>
          <TabsTrigger value="meranti">Unit Meranti</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat data MLF…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wallet className="w-4 h-4" /> Total Pelunasan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtIDR(sum(pelunasanU, 'baki'))}</p>
                <p className="text-xs text-muted-foreground">{fmtNum(pelunasanU.length)} fasilitas lunas bulan ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Run Off / Bulan</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtIDR(sum(runoffU, 'angsuran'))}</p>
                <p className="text-xs text-muted-foreground">Angsuran pokok {fmtNum(runoffU.length)} fasilitas</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Proyeksi Prospek</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtIDR(proyeksiTotal)}</p>
                <p className="text-xs text-muted-foreground">{fmtNum(proyeksiU.length)} calon debitur (input manual)</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pelunasan">
            <TabsList>
              <TabsTrigger value="pelunasan">Pelunasan</TabsTrigger>
              <TabsTrigger value="runoff">Run Off</TabsTrigger>
              <TabsTrigger value="proyeksi">Proyeksi</TabsTrigger>
            </TabsList>

            <TabsContent value="pelunasan" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Rekap Pelunasan per Segmentasi — {periode}</CardTitle></CardHeader>
                <CardContent><SummaryTable items={pelunasanU} valueKey="baki" valueLabel="Nilai Pelunasan" /></CardContent>
              </Card>
              <DetailTable items={pelunasanU} valueKey="baki" valueLabel="Nilai Pelunasan" />
            </TabsContent>

            <TabsContent value="runoff" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Rekap Run Off (Angsuran Pokok per Bulan)</CardTitle></CardHeader>
                <CardContent><SummaryTable items={runoffU} valueKey="angsuran" valueLabel="Angsuran Pokok / Bulan" /></CardContent>
              </Card>
              <DetailTable items={runoffU} valueKey="angsuran" valueLabel="Angsuran Pokok" />
            </TabsContent>

            <TabsContent value="proyeksi">
              <ProyeksiManual unit={unit} rows={proyeksiU} canEdit={canEdit} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

const LaporanBulananPage: React.FC = () => (
  <MainLayout>
    <PageHeader title="Laporan Bulanan" description="Pelunasan, Run Off, dan Proyeksi per segmentasi kredit" />
    <LaporanBulananContent />
  </MainLayout>
);

export default LaporanBulananPage;
