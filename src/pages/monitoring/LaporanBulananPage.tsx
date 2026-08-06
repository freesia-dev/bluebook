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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileDown, Wallet, TrendingDown, Target } from 'lucide-react';
import { useMLFUploads, useMLFDataByBranch, type MLFRow } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum } from '@/lib/mlf-utils';
import { getUnit, isProduktif, getAngsuranPokok, type UnitKredit } from '@/lib/produktif-utils';

type Segment = 'konsumtif' | 'mikro' | 'kecil' | 'menengah';

const SEGMENT_LABEL: Record<Segment, string> = {
  konsumtif: 'Konsumtif',
  mikro: 'Produktif Mikro (< 100 Juta)',
  kecil: 'Produktif Kecil (100 – 500 Juta)',
  menengah: 'Produktif Lainnya (> 500 Juta)',
};

const SEGMENT_ORDER: Segment[] = ['konsumtif', 'mikro', 'kecil', 'menengah'];

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

const LaporanBulananPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);
  const [unit, setUnit] = useState<'telihan' | 'meranti'>('telihan');

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

  // Proyeksi = prospek top-up: sisa tenor <= 3 bulan atau outstanding <= 25% plafon, kol 1-2
  const proyeksi = useMemo(
    () =>
      current.filter(
        (i) => i.kol <= 2 && i.baki > 0 && (i.sisaBulan <= 3 || (i.plafon > 0 && i.baki / i.plafon <= 0.25)),
      ),
    [current],
  );

  const byUnit = (items: Item[]) =>
    unit === 'meranti' ? items.filter((i) => i.unit === 'meranti') : items.filter((i) => i.unit !== 'meranti');

  const pelunasanU = byUnit(pelunasan);
  const runoffU = byUnit(current).filter((i) => i.angsuran > 0);
  const proyeksiU = byUnit(proyeksi);

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
    XLSX.utils.book_append_sheet(wb, mkSummary('Pelunasan', pelunasanU, 'baki'), 'Pelunasan');
    XLSX.utils.book_append_sheet(wb, mkSummary('Run Off', runoffU, 'angsuran'), 'Run Off');
    XLSX.utils.book_append_sheet(wb, mkSummary('Proyeksi Prospek', proyeksiU, 'baki'), 'Proyeksi');
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
    block('3. Proyeksi / Calon Prospek', proyeksiU, 'baki', 'Outstanding');
    doc.save(`Laporan-Bulanan-${unit}-${periode.replace(' ', '-')}.pdf`);
  };

  return (
    <MainLayout>
      <PageHeader title="Laporan Bulanan" description="Pelunasan, Run Off, dan Proyeksi per segmentasi kredit" />

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
                <p className="text-2xl font-bold">{fmtIDR(sum(proyeksiU, 'baki'))}</p>
                <p className="text-xs text-muted-foreground">{fmtNum(proyeksiU.length)} calon top up / pengajuan ulang</p>
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

            <TabsContent value="proyeksi" className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Proyeksi / Calon Prospek (sisa tenor ≤ 3 bulan atau outstanding ≤ 25% plafon)</CardTitle></CardHeader>
                <CardContent><SummaryTable items={proyeksiU} valueKey="baki" valueLabel="Outstanding" /></CardContent>
              </Card>
              <DetailTable items={proyeksiU} valueKey="baki" valueLabel="Outstanding" />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </MainLayout>
  );
};

export default LaporanBulananPage;
