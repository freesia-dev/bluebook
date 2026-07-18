import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileSpreadsheet, FileDown, TrendingUp, Users, Wallet, AlertTriangle, Percent, CalendarClock, ExternalLink } from 'lucide-react';
import { useMLFUploads, useMLFDataByBranch, type MLFRow } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum, KOL_LABEL, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import {
  getUnit,
  isProduktif,
  jenisProduktif,
  getJangkaWaktuBulan,
  getAngsuranPokok,
  UNIT_LABEL,
  type UnitKredit,
} from '@/lib/produktif-utils';
import logoUrl from '@/assets/logo-bankaltimtara.png';
import { cn } from '@/lib/utils';

const loadImageBase64 = async (url: string): Promise<string> => {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
};

interface UnitAgg {
  count: number;
  plafon: number;
  baki: number;
  tunggakan: number;
  angsuran: number;
  npl: number;
  nplCount: number;
  modalKerja: number;
  investasi: number;
  kolCounts: Record<number, number>;
}

const emptyAgg = (): UnitAgg => ({
  count: 0, plafon: 0, baki: 0, tunggakan: 0, angsuran: 0,
  npl: 0, nplCount: 0, modalKerja: 0, investasi: 0, kolCounts: {},
});

const aggregate = (rows: (MLFRow & { _unit: UnitKredit; _angsuran: number; _jw: number })[]): UnitAgg => {
  const a = emptyAgg();
  rows.forEach((r) => {
    const k = Number(r.kol) || 0;
    const tung = (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
    a.count += 1;
    a.plafon += Number(r.pla) || 0;
    a.baki += Number(r.baki) || 0;
    a.tunggakan += tung;
    a.angsuran += r._angsuran;
    if (k >= 3) { a.npl += Number(r.baki) || 0; a.nplCount += 1; }
    if (jenisProduktif(r) === 'Modal Kerja') a.modalKerja += 1;
    else if (jenisProduktif(r) === 'Investasi') a.investasi += 1;
    a.kolCounts[k] = (a.kolCounts[k] || 0) + 1;
  });
  return a;
};

const KreditProduktifPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);
  const [includeEkstrakom, setIncludeEkstrakom] = useState(false);
  const [activeUnit, setActiveUnit] = useState<'telihan' | 'meranti'>('telihan');
  const [search, setSearch] = useState('');
  const [kolFilter, setKolFilter] = useState<string>('all');

  useEffect(() => {
    if (!selectedUpload && uploads.length > 0) setSelectedUpload(uploads[0].id);
  }, [uploads, selectedUpload]);

  const { data: allRows = [], isLoading } = useMLFDataByBranch(selectedUpload, '143');
  const selectedUploadInfo = uploads.find((u) => u.id === selectedUpload);

  // Enrich + filter Produktif
  const produktifRows = useMemo(() => {
    return allRows
      .filter(isProduktif)
      .filter((r) => includeEkstrakom || (Number(r.kol) || 0) !== 0)
      .map((r) => ({
        ...r,
        _unit: getUnit(r),
        _jw: getJangkaWaktuBulan(r),
        _angsuran: getAngsuranPokok(r),
      }));
  }, [allRows, includeEkstrakom]);

  const telihanRows = useMemo(() => produktifRows.filter((r) => r._unit === 'telihan'), [produktifRows]);
  const merantiRows = useMemo(() => produktifRows.filter((r) => r._unit === 'meranti'), [produktifRows]);
  const unknownRows = useMemo(() => produktifRows.filter((r) => r._unit === 'unknown'), [produktifRows]);
  const missingDate = useMemo(
    () => produktifRows.length > 0 && produktifRows.every((r) => !(r as any).date),
    [produktifRows],
  );

  const telihanAgg = useMemo(() => aggregate(telihanRows), [telihanRows]);
  const merantiAgg = useMemo(() => aggregate(merantiRows), [merantiRows]);

  const rowsForActive = activeUnit === 'telihan' ? telihanRows : merantiRows;
  const aggForActive = activeUnit === 'telihan' ? telihanAgg : merantiAgg;

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsForActive.filter((r) => {
      if (kolFilter !== 'all' && String(Number(r.kol) || 0) !== kolFilter) return false;
      if (!q) return true;
      return (
        (r.l0name || '').toLowerCase().includes(q) ||
        (r.l0lnno || '').toLowerCase().includes(q) ||
        (r.l0narr || '').toLowerCase().includes(q) ||
        (r.lytitl || '').toLowerCase().includes(q) ||
        (r.l0usid || '').toLowerCase().includes(q)
      );
    });
  }, [rowsForActive, search, kolFilter]);

  const nplRatioTelihan = telihanAgg.baki > 0 ? (telihanAgg.npl / telihanAgg.baki) * 100 : 0;
  const nplRatioMeranti = merantiAgg.baki > 0 ? (merantiAgg.npl / merantiAgg.baki) * 100 : 0;

  const compareData = [
    {
      metric: 'Debitur',
      Telihan: telihanAgg.count,
      Meranti: merantiAgg.count,
    },
    {
      metric: 'NPL (debitur)',
      Telihan: telihanAgg.nplCount,
      Meranti: merantiAgg.nplCount,
    },
    {
      metric: 'Modal Kerja',
      Telihan: telihanAgg.modalKerja,
      Meranti: merantiAgg.modalKerja,
    },
    {
      metric: 'Investasi',
      Telihan: telihanAgg.investasi,
      Meranti: merantiAgg.investasi,
    },
  ];

  const totalProduktif = telihanAgg.count + merantiAgg.count + unknownRows.length;
  const shareTelihan = totalProduktif > 0 ? (telihanAgg.count / totalProduktif) * 100 : 0;
  const shareMeranti = totalProduktif > 0 ? (merantiAgg.count / totalProduktif) * 100 : 0;

  // ================= EXPORT =================


  const handleExportExcel = () => {
    const IDR_FMT = '_-"Rp"* #,##0_-;[Red]-"Rp"* #,##0_-;_-"Rp"* "-"_-;_-@_-';
    const NUM_FMT = '#,##0';
    const headers = [
      'No', 'Nomor Loan', 'Nama Debitur', 'Nomor PK', 'Produk', 'Jenis',
      'Plafon', 'Outstanding', 'Tunggakan', 'Jangka Waktu (bln)',
      'Angsuran Pokok/bln', 'KOL', 'AO', 'Tanggal Mulai', 'Jatuh Tempo',
    ];
    const bodyRows = filteredRows.map((r, idx) => [
      idx + 1,
      r.l0lnno || '-',
      r.l0name || '-',
      r.l0narr || '-',
      r.lytitl || '-',
      jenisProduktif(r),
      Number(r.pla) || 0,
      Number(r.baki) || 0,
      (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0),
      r._jw || 0,
      r._angsuran || 0,
      kolDisplay(Number(r.kol) || 0),
      r.l0usid || '-',
      (r as any).date ? format(new Date((r as any).date), 'dd/MM/yyyy') : '-',
      r.date1 ? format(new Date(r.date1), 'dd/MM/yyyy') : '-',
    ]);
    const totalRow = [
      '', '', `TOTAL (${bodyRows.length} debitur)`, '', '', '',
      bodyRows.reduce((s, r) => s + (r[6] as number), 0),
      bodyRows.reduce((s, r) => s + (r[7] as number), 0),
      bodyRows.reduce((s, r) => s + (r[8] as number), 0),
      '',
      bodyRows.reduce((s, r) => s + (r[10] as number), 0),
      '', '', '', '',
    ];
    const titleRow = [`Laporan Kredit Produktif - Unit ${UNIT_LABEL[activeUnit]}`];
    const periodeRow = [`Periode MLF: ${selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'dd MMMM yyyy', { locale: idLocale }) : '-'}`];
    const aoa = [titleRow, periodeRow, [], headers, ...bodyRows, totalRow];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Column widths
    ws['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 30 }, { wch: 32 }, { wch: 26 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 8 }, { wch: 18 },
      { wch: 6 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    ];
    // Merged title
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 14 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 14 } },
    ];

    const range = XLSX.utils.decode_range(ws['!ref']!);
    const headerRowIdx = 3;
    const totalRowIdx = 4 + bodyRows.length;
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        // Title
        if (R === 0) {
          cell.s = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '003F7F' } }, alignment: { horizontal: 'center', vertical: 'center' } };
        } else if (R === 1) {
          cell.s = { font: { italic: true, sz: 10, color: { rgb: '555555' } }, alignment: { horizontal: 'center' } };
        } else if (R === headerRowIdx) {
          cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '003F7F' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } } } };
        } else if (R === totalRowIdx) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F1F5F9' } }, border: { top: { style: 'medium', color: { rgb: '000000' } } } };
          if ([6, 7, 8, 10].includes(C)) cell.z = IDR_FMT;
        } else if (R > headerRowIdx && R < totalRowIdx) {
          // Data rows
          if ([6, 7, 8, 10].includes(C)) { cell.z = IDR_FMT; cell.t = 'n'; }
          if (C === 9) { cell.z = NUM_FMT; cell.t = 'n'; }
          if (C === 0) cell.s = { alignment: { horizontal: 'center' } };
          if (C === 11) cell.s = { alignment: { horizontal: 'center' }, font: { bold: true } };
        }
      }
    }
    ws['!rows'] = [{ hpt: 22 }, { hpt: 18 }, { hpt: 6 }, { hpt: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Kredit Produktif ${UNIT_LABEL[activeUnit]}`);
    const dateStr = selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'yyyyMMdd') : format(new Date(), 'yyyyMMdd');
    XLSX.writeFile(wb, `Kredit_Produktif_${UNIT_LABEL[activeUnit]}_${dateStr}.xlsx`);
  };

  const handleExportPDF = async () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;

    // Kop
    let y = 10;
    try {
      const logoB64 = await loadImageBase64(logoUrl);
      doc.addImage(logoB64, 'PNG', marginX, y + 2, 28, 14);
    } catch { /* ignore */ }
    const textX = marginX + 33;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 63, 127);
    doc.text('PT. BPD Kalimantan Timur & Kalimantan Utara', textX, y + 5);
    doc.setFontSize(10.5);
    doc.text('Kantor Cabang Pembantu Telihan', textX, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text('Jl. Letjend S. Parman No. 14–15, Bontang 75383  ·  Telp. 0548-26567', textX, y + 14.5);
    doc.setDrawColor(0, 63, 127); doc.setLineWidth(0.9);
    doc.line(marginX, y + 21, pageW - marginX, y + 21);
    doc.setDrawColor(245, 130, 32); doc.setLineWidth(0.4);
    doc.line(marginX, y + 22, pageW - marginX, y + 22);

    y = 30;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`LAPORAN KREDIT PRODUKTIF - UNIT ${UNIT_LABEL[activeUnit].toUpperCase()}`, pageW / 2, y, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const periode = selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'dd MMMM yyyy', { locale: idLocale }) : '-';
    doc.text(`Capem 143 Telihan · Periode MLF: ${periode}`, pageW / 2, y + 5, { align: 'center' });
    doc.text(`Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, pageW / 2, y + 9.5, { align: 'center' });

    // Unit banner
    const unitColor: [number, number, number] = activeUnit === 'telihan' ? [37, 99, 235] : [5, 150, 105];
    doc.setFillColor(...unitColor);
    doc.roundedRect(marginX, 42, 52, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`UNIT ${UNIT_LABEL[activeUnit].toUpperCase()}`, marginX + 26, 47.5, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Ringkasan
    y = 54;
    const kolDist = [0, 1, 2, 3, 4, 5]
      .map((k) => (aggForActive.kolCounts[k] ? `KOL ${kolDisplay(k)}: ${fmtNum(aggForActive.kolCounts[k])}` : null))
      .filter(Boolean)
      .join('   ·   ');
    const nplPct = aggForActive.baki > 0 ? (aggForActive.npl / aggForActive.baki) * 100 : 0;
    const summary = [
      ['Total Debitur', `${fmtNum(aggForActive.count)}   (Modal Kerja: ${fmtNum(aggForActive.modalKerja)} · Investasi: ${fmtNum(aggForActive.investasi)})`],
      ['Total Plafon', fmtIDR(aggForActive.plafon)],
      ['Total Outstanding', fmtIDR(aggForActive.baki)],
      ['Total Tunggakan', fmtIDR(aggForActive.tunggakan)],
      ['NPL (KOL 3-5)', `${fmtNum(aggForActive.nplCount)} debitur · ${fmtIDR(aggForActive.npl)} · ${nplPct.toFixed(2)}%`],
      ['Total Angsuran Pokok/bulan', fmtIDR(aggForActive.angsuran)],
      ['Distribusi KOL', kolDist || '-'],
    ];
    autoTable(doc, {
      startY: y,
      body: summary,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60, textColor: [70, 70, 70], fillColor: [241, 245, 249] },
        1: { textColor: [0, 0, 0] },
      },
      margin: { left: marginX, right: marginX },
    });

    const startY = (doc as any).lastAutoTable.finalY + 4;

    const body = filteredRows.map((r, idx) => [
      String(idx + 1),
      r.l0lnno || '-',
      r.l0name || '-',
      r.l0narr || '-',
      jenisProduktif(r),
      fmtIDR(Number(r.pla) || 0),
      fmtIDR(Number(r.baki) || 0),
      fmtIDR((Number(r.tungpk) || 0) + (Number(r.tungbg) || 0)),
      String(r._jw),
      fmtIDR(r._angsuran),
      kolDisplay(Number(r.kol) || 0),
      r.date1 ? format(new Date(r.date1), 'dd/MM/yy') : '-',
    ]);

    autoTable(doc, {
      startY,
      head: [['No', 'Nomor Loan', 'Nama', 'Nomor PK', 'Jenis', 'Plafon', 'Outstanding', 'Tunggakan', 'JW (bln)', 'Angs. Pokok/bln', 'KOL', 'Jatuh Tempo']],
      body: body.length ? body : [['—', '—', '—', 'Tidak ada data', '—', '—', '—', '—', '—', '—', '—', '—']],
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.5, overflow: 'linebreak' },
      headStyles: { fillColor: [0, 63, 127], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 38 },
        3: { cellWidth: 40 },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 12, halign: 'center' },
        9: { cellWidth: 26, halign: 'right' },
        10: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        11: { cellWidth: 18, halign: 'center' },
      },
      margin: { left: marginX, right: marginX },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 10) {
          const v = Number(data.cell.raw === 'E' ? 0 : data.cell.raw);
          if (v >= 3) { data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
          else if (v === 2) { data.cell.styles.textColor = [180, 83, 9]; }
        }
      },
      didDrawPage: () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(
          `Bluebook Telihan · Laporan Kredit Produktif ${UNIT_LABEL[activeUnit]} · Halaman ${currentPage} dari ${pageCount}`,
          pageW / 2, pageH - 6, { align: 'center' },
        );
      },
    });

    const dateStr = selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'yyyyMMdd') : format(new Date(), 'yyyyMMdd');
    doc.save(`Kredit_Produktif_${UNIT_LABEL[activeUnit]}_${dateStr}.pdf`);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Kredit Produktif Unit"
        description="Pemisahan debitur kredit produktif (Modal Kerja & Investasi) Capem 143 Telihan berdasarkan Unit Telihan vs Meranti (dari nomor PK di MLF)."
      />

      {/* Controls */}
      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Periode MLF</p>
            <Select value={selectedUpload} onValueChange={setSelectedUpload}>
              <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
              <SelectContent>
                {uploads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })} — {u.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Switch id="ekstra-toggle" checked={includeEkstrakom} onCheckedChange={setIncludeEkstrakom} />
            <Label htmlFor="ekstra-toggle" className="cursor-pointer text-sm">
              Sertakan Ekstrakomtabel
            </Label>
          </div>
        </CardContent>
      </Card>

      {uploads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada data MLF. Silakan upload terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {missingDate && (
            <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-sm text-amber-900 dark:text-amber-100">
              <strong>Perhatian:</strong> File MLF pada periode ini belum memiliki kolom <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/40">DATE</code> (tanggal mulai kredit), sehingga <em>Jangka Waktu</em> dan <em>Angsuran Pokok/bulan</em> tidak dapat dihitung. Silakan upload ulang file MLF (kolom DATE akan otomatis terbaca).
            </div>
          )}

          {/* KPI comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <MiniKPI icon={Users} title="Telihan" primary={fmtNum(telihanAgg.count)} sub={`${shareTelihan.toFixed(1)}% · OS ${fmtIDR(telihanAgg.baki)} · Angs/bln ${fmtIDR(telihanAgg.angsuran)}`} tone="blue" />
            <MiniKPI icon={Users} title="Meranti" primary={fmtNum(merantiAgg.count)} sub={`${shareMeranti.toFixed(1)}% · OS ${fmtIDR(merantiAgg.baki)} · Angs/bln ${fmtIDR(merantiAgg.angsuran)}`} tone="emerald" />
            <MiniKPI icon={TrendingUp} title="Perbandingan NPL" primary={`${nplRatioTelihan.toFixed(2)}% vs ${nplRatioMeranti.toFixed(2)}%`} sub={`Telihan vs Meranti · ${unknownRows.length} tanpa unit`} tone="amber" />
          </div>

          {/* Bar chart comparison */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Perbandingan Telihan vs Meranti</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={compareData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: any) => fmtNum(v as number)} />
                  <Legend />
                  <Bar dataKey="Telihan" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Meranti" fill="#059669" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base">Detail Debitur Kredit Produktif</CardTitle>
                  <Badge className={cn(
                    'text-white',
                    activeUnit === 'telihan' ? 'bg-blue-600 hover:bg-blue-600' : 'bg-emerald-600 hover:bg-emerald-600'
                  )}>
                    Unit {UNIT_LABEL[activeUnit]}
                  </Badge>
                  <Badge variant="outline" className="font-mono">
                    {fmtNum(filteredRows.length)} / {fmtNum(aggForActive.count)} debitur
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Angs. Pokok/bln: {fmtIDR(aggForActive.angsuran)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleExportExcel}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleExportPDF}>
                    <FileDown className="w-4 h-4 mr-2" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeUnit} onValueChange={(v) => setActiveUnit(v as any)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="telihan">Telihan ({fmtNum(telihanAgg.count)})</TabsTrigger>
                  <TabsTrigger value="meranti">Meranti ({fmtNum(merantiAgg.count)})</TabsTrigger>
                </TabsList>

                {(['telihan', 'meranti'] as const).map((unit) => {
                  const agg = unit === 'telihan' ? telihanAgg : merantiAgg;
                  const nplRatio = agg.baki > 0 ? (agg.npl / agg.baki) * 100 : 0;
                  return (
                    <TabsContent key={unit} value={unit} className="space-y-4">
                      {/* Stat row */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <StatBox icon={Users} label="Debitur" value={fmtNum(agg.count)} />
                        <StatBox icon={Wallet} label="Plafon" value={fmtIDR(agg.plafon)} />
                        <StatBox icon={Wallet} label="Outstanding" value={fmtIDR(agg.baki)} tone="emerald" />
                        <StatBox icon={AlertTriangle} label="Tunggakan" value={fmtIDR(agg.tunggakan)} tone="amber" />
                        <StatBox icon={Percent} label="NPL" value={`${nplRatio.toFixed(2)}%`} sub={`${fmtNum(agg.nplCount)} debitur`} tone={nplRatio >= 5 ? 'rose' : nplRatio >= 2 ? 'amber' : 'emerald'} />
                        <StatBox icon={CalendarClock} label="Angsuran Pokok/bln" value={fmtIDR(agg.angsuran)} tone="blue" />
                      </div>

                      {/* Breakdown */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-muted-foreground">Jenis:</span>
                        <Badge variant="outline">Modal Kerja: {fmtNum(agg.modalKerja)}</Badge>
                        <Badge variant="outline">Investasi: {fmtNum(agg.investasi)}</Badge>
                        <span className="text-xs text-muted-foreground ml-4">Distribusi KOL:</span>
                        {[0, 1, 2, 3, 4, 5].map((k) => (
                          agg.kolCounts[k] ? (
                            <Badge key={k} style={{ backgroundColor: KOL_COLOR[k], color: 'white' }}>
                              KOL {kolDisplay(k)}: {fmtNum(agg.kolCounts[k])}
                            </Badge>
                          ) : null
                        ))}
                      </div>

                      {/* Filter */}
                      {unit === activeUnit && (
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Input
                            placeholder="Cari nama, nomor loan, PK, produk, AO..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1"
                          />
                          <Select value={kolFilter} onValueChange={setKolFilter}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                              <SelectValue placeholder="Filter KOL" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Semua KOL</SelectItem>
                              {[0, 1, 2, 3, 4, 5].map((k) => (
                                <SelectItem key={k} value={String(k)}>KOL {kolDisplay(k)} - {KOL_LABEL[k]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Table */}
                      {unit === activeUnit && (
                        <div className="rounded-lg border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-10">No</TableHead>
                                <TableHead>Nomor Loan</TableHead>
                                <TableHead>Nama Debitur</TableHead>
                                <TableHead>Nomor PK</TableHead>
                                <TableHead>Produk</TableHead>
                                <TableHead>Jenis</TableHead>
                                <TableHead className="text-right">Plafon</TableHead>
                                <TableHead className="text-right">Outstanding</TableHead>
                                <TableHead className="text-right">Tunggakan</TableHead>
                                <TableHead className="text-center">JW (bln)</TableHead>
                                <TableHead className="text-right">Angs. Pokok/bln</TableHead>
                                <TableHead className="text-center">KOL</TableHead>
                                <TableHead>AO</TableHead>
                                <TableHead>Jatuh Tempo</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRows.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                                    {isLoading ? 'Memuat data...' : 'Tidak ada debitur produktif untuk unit ini.'}
                                  </TableCell>
                                </TableRow>
                              ) : filteredRows.map((r, idx) => {
                                const kol = Number(r.kol) || 0;
                                const tung = (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
                                return (
                                  <TableRow key={r.id} className={cn(kol >= 3 && 'bg-rose-50/50 dark:bg-rose-950/20')}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.l0lnno || '-'}</TableCell>
                                    <TableCell className="font-medium">{r.l0name || '-'}</TableCell>
                                    <TableCell className="font-mono text-xs">{r.l0narr || '-'}</TableCell>
                                    <TableCell className="text-xs">{r.lytitl || '-'}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className="text-xs">{jenisProduktif(r)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{fmtIDR(Number(r.pla) || 0)}</TableCell>
                                    <TableCell className="text-right">{fmtIDR(Number(r.baki) || 0)}</TableCell>
                                    <TableCell className={cn('text-right', tung > 0 && 'text-amber-700 font-medium')}>{fmtIDR(tung)}</TableCell>
                                    <TableCell className="text-center">{r._jw || '-'}</TableCell>
                                    <TableCell className="text-right font-medium">{r._angsuran ? fmtIDR(r._angsuran) : '-'}</TableCell>
                                    <TableCell className="text-center">
                                      <Badge style={{ backgroundColor: KOL_COLOR[kol], color: 'white' }}>{kolDisplay(kol)}</Badge>
                                    </TableCell>
                                    <TableCell className="text-xs">{r.l0usid || '-'}</TableCell>
                                    <TableCell className="text-xs">{r.date1 ? format(new Date(r.date1), 'dd/MM/yy') : '-'}</TableCell>
                                    <TableCell>
                                      {kol >= 3 && (
                                        <Link to={`/monitoring/kontak?q=${encodeURIComponent(r.l0name || '')}`}
                                          title="Lihat di Kontak Debitur"
                                          className="text-primary hover:underline inline-flex">
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>

              {unknownRows.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-200">
                  <strong>{unknownRows.length} debitur</strong> memiliki nomor PK tanpa penanda ULM-TLH / BPD-TLH sehingga tidak dapat dipisahkan otomatis. Cek kolom Nomor PK di data MLF untuk verifikasi.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </MainLayout>
  );
};

// ============= small UI components =============
const MiniKPI: React.FC<{ icon: React.ElementType; title: string; primary: string; sub: string; tone: 'blue' | 'emerald' | 'amber' }> = ({ icon: Icon, title, primary, sub, tone }) => {
  const bg = tone === 'blue' ? 'from-blue-500 to-indigo-600' : tone === 'emerald' ? 'from-emerald-500 to-teal-600' : 'from-amber-500 to-orange-600';
  return (
    <div className={cn('relative overflow-hidden rounded-xl p-5 text-white shadow-md bg-gradient-to-br', bg)}>
      <Icon className="absolute right-3 top-3 w-6 h-6 opacity-70" />
      <p className="text-xs uppercase tracking-wider opacity-90">{title}</p>
      <p className="text-2xl font-bold mt-1 break-words">{primary}</p>
      <p className="text-xs opacity-90 mt-1 break-words">{sub}</p>
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; tone?: 'emerald' | 'amber' | 'rose' | 'blue' }> = ({ icon: Icon, label, value, sub, tone }) => {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'rose' ? 'text-rose-600' : tone === 'blue' ? 'text-blue-600' : 'text-foreground';
  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={cn('text-lg font-bold break-words', color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
};

export default KreditProduktifPage;
