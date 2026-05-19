import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMLFUploads, useMLFData143, MLFRow } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum, KOL_LABEL, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { FileDown, Loader2, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const computeStats = (rows: MLFRow[]) => {
  const totalDebitur = rows.length;
  const totalBaki = rows.reduce((s, r) => s + (Number(r.baki) || 0), 0);
  const totalPlafon = rows.reduce((s, r) => s + (Number(r.pla) || 0), 0);
  const totalTungpk = rows.reduce((s, r) => s + (Number(r.tungpk) || 0), 0);
  const totalTungbg = rows.reduce((s, r) => s + (Number(r.tungbg) || 0), 0);
  const totalTunggakan = totalTungpk + totalTungbg;

  const kolMap = new Map<number, { count: number; baki: number; tunggakan: number }>();
  rows.forEach((r) => {
    const k = Number(r.kol) || 0;
    const cur = kolMap.get(k) || { count: 0, baki: 0, tunggakan: 0 };
    cur.count += 1;
    cur.baki += Number(r.baki) || 0;
    cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
    kolMap.set(k, cur);
  });
  const kolData = Array.from(kolMap.entries()).sort((a, b) => a[0] - b[0]).map(([k, v]) => ({ kol: k, ...v }));

  const nplCount = rows.filter((r) => (Number(r.kol) || 0) >= 3).length;
  const nplBaki = rows.filter((r) => (Number(r.kol) || 0) >= 3).reduce((s, r) => s + (Number(r.baki) || 0), 0);
  const nplBaseRows = rows.filter((r) => (Number(r.kol) || 0) !== 0);
  const nplBaseBaki = nplBaseRows.reduce((s, r) => s + (Number(r.baki) || 0), 0);
  const nplBaseCount = nplBaseRows.length;
  const nplRatio = nplBaseBaki > 0 ? (nplBaki / nplBaseBaki) * 100 : 0;
  const nplCountRatio = nplBaseCount > 0 ? (nplCount / nplBaseCount) * 100 : 0;
  const tunggakanRatio = totalBaki > 0 ? (totalTunggakan / totalBaki) * 100 : 0;

  const prodMap = new Map<string, { count: number; baki: number; tunggakan: number }>();
  rows.forEach((r) => {
    const p = r.lytitl || 'Lainnya';
    const cur = prodMap.get(p) || { count: 0, baki: 0, tunggakan: 0 };
    cur.count += 1;
    cur.baki += Number(r.baki) || 0;
    cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
    prodMap.set(p, cur);
  });
  const prodData = Array.from(prodMap.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.baki - a.baki);

  const aoMap = new Map<string, { count: number; baki: number; tunggakan: number }>();
  rows.forEach((r) => {
    const ao = r.l0usid || '-';
    const cur = aoMap.get(ao) || { count: 0, baki: 0, tunggakan: 0 };
    cur.count += 1;
    cur.baki += Number(r.baki) || 0;
    cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
    aoMap.set(ao, cur);
  });
  const aoData = Array.from(aoMap.entries()).map(([ao, v]) => ({ ao, ...v })).sort((a, b) => b.tunggakan - a.tunggakan);

  const topDebitur = [...rows]
    .map((r) => ({ ...r, tunggakan: (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0) }))
    .filter((r) => r.tunggakan > 0)
    .sort((a, b) => b.tunggakan - a.tunggakan);

  return { totalDebitur, totalBaki, totalPlafon, totalTunggakan, totalTungpk, totalTungbg, kolData, nplCount, nplBaki, nplRatio, nplCountRatio, nplBaseBaki, nplBaseCount, tunggakanRatio, prodData, aoData, topDebitur };
};

const ExportPDFPage: React.FC = () => {
  const { toast } = useToast();
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [includeEkstrakom, setIncludeEkstrakom] = useState(false);

  useEffect(() => {
    if (!selectedUpload && uploads.length > 0) setSelectedUpload(uploads[0].id);
  }, [uploads, selectedUpload]);

  const { data: allRows = [], isLoading } = useMLFData143(selectedUpload);
  const rows = useMemo(
    () => (includeEkstrakom ? allRows : allRows.filter((r) => (Number(r.kol) || 0) !== 0)),
    [allRows, includeEkstrakom]
  );
  const stats = useMemo(() => computeStats(rows), [rows]);
  const uploadInfo = uploads.find((u) => u.id === selectedUpload);

  const generatePDF = async () => {
    if (!uploadInfo) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 14;

      // ===== Cover header =====
      doc.setFillColor(15, 27, 61); // navy primary
      doc.rect(0, 0, W, 40, 'F');
      doc.setFillColor(59, 111, 160);
      doc.rect(0, 40, W, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('LAPORAN MONITORING KKR & NPL', M, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Capem Telihan Bontang — Cabang 143', M, 26);
      doc.setFontSize(9);
      doc.text(`Periode Data: ${format(new Date(uploadInfo.jobdate), 'dd MMMM yyyy', { locale: idLocale })}  •  ${includeEkstrakom ? 'Termasuk Ekstrakomtabel' : 'Tanpa Ekstrakomtabel'}`, M, 33);
      doc.text(`Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, W - M, 33, { align: 'right' });

      let y = 52;
      doc.setTextColor(20, 20, 20);

      // ===== KPI cards (2x2) =====
      const kpis: Array<{ label: string; value: string; color: [number, number, number]; sub?: string }> = [
        { label: 'Total Debitur', value: fmtNum(stats.totalDebitur), color: hexToRgb('3b82f6'), sub: `Outstanding ${fmtIDR(stats.totalBaki)}` },
        { label: 'Rasio NPL (KOL 3-5)', value: `${stats.nplRatio.toFixed(2)}%`, color: hexToRgb('ef4444'), sub: `${fmtNum(stats.nplCount)} debitur • ${fmtIDR(stats.nplBaki)}` },
        { label: 'Tunggakan Berjalan', value: fmtIDR(stats.totalTunggakan), color: hexToRgb('f59e0b'), sub: `Pokok ${fmtIDR(stats.totalTungpk)} | Bunga ${fmtIDR(stats.totalTungbg)}` },
        { label: 'Rasio Tunggakan / OS', value: `${stats.tunggakanRatio.toFixed(2)}%`, color: hexToRgb('10b981'), sub: `Plafon ${fmtIDR(stats.totalPlafon)}` },
      ];
      const cardW = (W - M * 2 - 6) / 2;
      const cardH = 26;
      kpis.forEach((k, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = M + col * (cardW + 6);
        const cy = y + row * (cardH + 5);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');
        doc.setFillColor(...k.color);
        doc.roundedRect(x, cy, 2, cardH, 1, 1, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(k.label, x + 5, cy + 6);
        doc.setFontSize(12);
        doc.setTextColor(15, 27, 61);
        doc.setFont('helvetica', 'bold');
        doc.text(k.value, x + 5, cy + 14);
        if (k.sub) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text(k.sub, x + 5, cy + 21);
        }
      });
      y += cardH * 2 + 5 + 8;

      // ===== KOL Section title =====
      const drawSectionTitle = (text: string, yy: number) => {
        doc.setFillColor(15, 27, 61);
        doc.rect(M, yy, 3, 6, 'F');
        doc.setTextColor(15, 27, 61);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(text, M + 6, yy + 5);
        return yy + 9;
      };

      y = drawSectionTitle('Komposisi & Outstanding per Kolektibilitas', y);

      // ===== KOL bar chart (horizontal bars) =====
      const maxBaki = Math.max(...stats.kolData.map((d) => d.baki), 1);
      const barAreaX = M;
      const barAreaW = W - M * 2;
      const rowH = 8;
      stats.kolData.forEach((d, i) => {
        const ry = y + i * rowH;
        const color = hexToRgb((KOL_COLOR[d.kol] || '#94a3b8').replace('#', ''));
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text(`KOL ${kolDisplay(d.kol)} ${KOL_LABEL[d.kol] || ''}`, barAreaX, ry + 5);
        const barX = barAreaX + 38;
        const barMaxW = barAreaW - 38 - 50;
        const barW = (d.baki / maxBaki) * barMaxW;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(barX, ry + 1, barMaxW, 5, 1, 1, 'F');
        doc.setFillColor(...color);
        doc.roundedRect(barX, ry + 1, Math.max(barW, 0.5), 5, 1, 1, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(7.5);
        doc.text(`${fmtNum(d.count)} debitur • ${fmtIDR(d.baki)}`, barX + barMaxW + 2, ry + 5);
      });
      y += stats.kolData.length * rowH + 4;

      // KOL table
      autoTable(doc, {
        startY: y,
        head: [['KOL', 'Keterangan', 'Jml Debitur', 'Outstanding', 'Tunggakan Berjalan']],
        body: stats.kolData.map((d) => [
          kolDisplay(d.kol),
          KOL_LABEL[d.kol] || '-',
          fmtNum(d.count),
          fmtIDR(d.baki),
          fmtIDR(d.tunggakan),
        ]),
        foot: [[
          '',
          'TOTAL',
          fmtNum(stats.totalDebitur),
          fmtIDR(stats.totalBaki),
          fmtIDR(stats.totalTunggakan),
        ]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 27, 61], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [241, 245, 249], textColor: 15, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ===== Product breakdown =====
      if (y > H - 60) { doc.addPage(); y = 20; }
      y = drawSectionTitle('Outstanding per Produk Kredit', y);
      autoTable(doc, {
        startY: y,
        head: [['Produk Kredit', 'Jml Debitur', 'Outstanding', 'Tunggakan Berjalan']],
        body: stats.prodData.map((p) => [p.name, fmtNum(p.count), fmtIDR(p.baki), fmtIDR(p.tunggakan)]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 27, 61], textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ===== AO breakdown =====
      if (y > H - 60) { doc.addPage(); y = 20; }
      y = drawSectionTitle('Ringkasan per AO / Petugas', y);
      autoTable(doc, {
        startY: y,
        head: [['AO', 'Jml Debitur', 'Outstanding', 'Tunggakan Berjalan']],
        body: stats.aoData.map((a) => [a.ao, fmtNum(a.count), fmtIDR(a.baki), fmtIDR(a.tunggakan)]),
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [15, 27, 61], textColor: 255 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 8;

      // ===== Top debitur =====
      doc.addPage();
      y = 20;
      y = drawSectionTitle('Daftar Debitur dengan Tunggakan Berjalan', y);
      autoTable(doc, {
        startY: y,
        head: [['No', 'No Rekening', 'Nama Debitur', 'Produk', 'KOL', 'Outstanding', 'Tunggakan', 'AO']],
        body: stats.topDebitur.map((d, i) => [
          String(i + 1),
          d.l0lnno || '-',
          d.l0name || '-',
          (d.lytitl || '-').slice(0, 28),
          d.kol == null ? '-' : kolDisplay(d.kol),
          fmtIDR(Number(d.baki) || 0),
          fmtIDR(d.tunggakan),
          d.l0usid || '-',
        ]),
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8 },
        headStyles: { fillColor: [15, 27, 61], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 22 },
          4: { halign: 'center', cellWidth: 10 },
          5: { halign: 'right' },
          6: { halign: 'right', textColor: [180, 83, 9], fontStyle: 'bold' },
          7: { cellWidth: 22 },
        },
        margin: { left: M, right: M },
      });

      // ===== Footer on every page =====
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Bluebook Telihan — Laporan Monitoring KKR & NPL', M, H - 6);
        doc.text(`Hal ${p} dari ${pageCount}`, W - M, H - 6, { align: 'right' });
      }

      const fileName = `Laporan_Monitoring_KKR_NPL_${uploadInfo.jobdate}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF Berhasil Dibuat', description: fileName });
    } catch (e: any) {
      toast({ title: 'Gagal Generate PDF', description: e.message || 'Terjadi kesalahan.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Export PDF — Monitoring KKR & NPL" description="Cetak laporan monitoring sebagai dokumen PDF profesional" />

      {uploads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada data MLF yang diupload.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengaturan Cetak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Periode Data</label>
              <Select value={selectedUpload} onValueChange={setSelectedUpload}>
                <SelectTrigger className="w-full sm:w-[320px]">
                  <SelectValue placeholder="Pilih periode" />
                </SelectTrigger>
                <SelectContent>
                  {uploads.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploadInfo && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-muted/40 border border-border">
                <Stat label="Debitur" value={fmtNum(stats.totalDebitur)} />
                <Stat label="Outstanding" value={fmtIDR(stats.totalBaki)} />
                <Stat label="Tunggakan Berjalan" value={fmtIDR(stats.totalTunggakan)} />
                <Stat label="NPL" value={`${fmtNum(stats.nplCount)} • ${fmtIDR(stats.nplBaki)}`} />
              </div>
            )}

            <Button onClick={generatePDF} disabled={generating || isLoading || rows.length === 0} size="lg" className="w-full sm:w-auto">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Membuat PDF...</>
              ) : (
                <><FileDown className="w-4 h-4 mr-2" /> Generate Laporan PDF</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    <p className="text-sm font-bold">{value}</p>
  </div>
);

export default ExportPDFPage;
