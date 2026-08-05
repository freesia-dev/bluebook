import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { ExecutiveKPI } from '@/pages/executive/ExecutiveDashboardPage';

const IDR = '#,##0;(#,##0);"-"';
const PCT = '0.00"%"';

const setCol = (ws: XLSX.WorkSheet, widths: number[]) => {
  (ws as any)['!cols'] = widths.map((w) => ({ wch: w }));
};

const applyFormat = (ws: XLSX.WorkSheet, cols: number[], fmt: string, startRow: number) => {
  const ref = XLSX.utils.decode_range(ws['!ref'] as string);
  for (let r = startRow; r <= ref.e.r; r++) {
    cols.forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = (ws as any)[addr];
      if (cell && typeof cell.v === 'number') cell.z = fmt;
    });
  }
};

export const exportExecutiveExcel = (k: ExecutiveKPI) => {
  const wb = XLSX.utils.book_new();

  const ringkasan = [
    ['EXECUTIVE DASHBOARD — BLUEBOOK TELIHAN'],
    ['Bank Kaltimtara'],
    [],
    ['Periode Data', k.periode],
    ['Pembanding', k.pembanding || '-'],
    ['Cakupan', k.cabang],
    ['Dicetak', format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })],
    [],
    ['INDIKATOR UTAMA', 'NILAI'],
    ['Total Debitur', k.totalDebitur],
    ['Outstanding / Baki Debet', k.totalBaki],
    ['Total Plafon', k.totalPlafon],
    ['Total Tunggakan', k.totalTunggakan],
    ['— Tunggakan Pokok', k.totalTungpk],
    ['— Tunggakan Bunga', k.totalTungbg],
    [],
    ['KUALITAS ASET', 'NILAI'],
    ['NPL (KOL 3-5) — Nominal', k.nplBaki],
    ['NPL — Jumlah Debitur', k.nplCount],
    ['NPL — Rasio (%)', k.nplRatio],
    ['NPL Periode Lalu (%)', k.nplPrevRatio ?? 0],
    ['KKR (KOL 2-5) — Nominal', k.kkrBaki],
    ['KKR — Rasio (%)', k.kkrRatio],
    ['Lancar (KOL 1) — Nominal', k.lancarBaki],
    ['Lancar — Rasio (%)', k.lancarRatio],
    ['DPK (KOL 2) — Nominal', k.dpkBaki],
    ['Ekstrakomtabel — Rekening', k.ekstraCount],
    [],
    ['PERTUMBUHAN KREDIT', 'NILAI'],
    ['Pertumbuhan Baki Debet', k.growthBaki],
    ['Pertumbuhan (%)', k.growthBakiPct],
    ['Pertumbuhan Debitur', k.growthDebitur],
    ['Fasilitas Baru Cair (unit)', k.cairCount],
    ['Fasilitas Baru Cair (nominal)', k.cairBaki],
    ['Fasilitas Lunas/Tutup (unit)', k.lunasCount],
    ['Fasilitas Lunas/Tutup (nominal)', k.lunasBaki],
    [],
    ['LOAN PIPELINE', 'JUMLAH', 'PLAFON'],
    ...k.pipeline.map((p) => [p.label, p.count, p.plafon]),
    ['Total Aktif', k.pipelineTotal.count, k.pipelineTotal.plafon],
    ['Dibatalkan', k.pipelineTotal.batal, 0],
    ['Konversi ke Cair (%)', k.pipelineTotal.konversi, ''],
  ];
  const wsR = XLSX.utils.aoa_to_sheet(ringkasan);
  setCol(wsR, [38, 22, 20]);
  (wsR as any)['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];
  applyFormat(wsR, [1, 2], IDR, 9);
  XLSX.utils.book_append_sheet(wb, wsR, 'Ringkasan Eksekutif');

  const wsK = XLSX.utils.aoa_to_sheet([
    ['Kolektibilitas', 'Debitur', 'Baki Debet', 'Tunggakan', 'Porsi (%)'],
    ...k.kolData.map((d) => [d.name, d.count, d.baki, d.tunggakan, Number(d.share.toFixed(2))]),
    ['TOTAL', k.totalDebitur, k.totalBaki, k.totalTunggakan, 100],
  ]);
  setCol(wsK, [30, 12, 20, 20, 12]);
  applyFormat(wsK, [1, 2, 3], IDR, 1);
  applyFormat(wsK, [4], PCT, 1);
  XLSX.utils.book_append_sheet(wb, wsK, 'Kolektibilitas');

  const wsB = XLSX.utils.aoa_to_sheet([
    ['Kode', 'Cabang', 'Debitur', 'Baki Debet', 'Tunggakan', 'NPL (%)'],
    ...k.branchData.map((b) => [b.code, b.name, b.count, b.baki, b.tunggakan, Number(b.nplRatio.toFixed(2))]),
  ]);
  setCol(wsB, [10, 30, 12, 20, 20, 12]);
  applyFormat(wsB, [2, 3, 4], IDR, 1);
  applyFormat(wsB, [5], PCT, 1);
  XLSX.utils.book_append_sheet(wb, wsB, 'Per Cabang');

  const wsP = XLSX.utils.aoa_to_sheet([
    ['Produk', 'Debitur', 'Baki Debet'],
    ...k.produkData.map((p) => [p.name, p.count, p.baki]),
  ]);
  setCol(wsP, [40, 12, 20]);
  applyFormat(wsP, [1, 2], IDR, 1);
  XLSX.utils.book_append_sheet(wb, wsP, 'Per Produk');

  const wsA = XLSX.utils.aoa_to_sheet([
    ['Account Officer', 'Debitur', 'Baki Debet', 'Tunggakan', 'NPL (%)'],
    ...k.aoData.map((a) => [a.ao, a.count, a.baki, a.tunggakan, Number(a.nplRatio.toFixed(2))]),
  ]);
  setCol(wsA, [22, 12, 20, 20, 12]);
  applyFormat(wsA, [1, 2, 3], IDR, 1);
  applyFormat(wsA, [4], PCT, 1);
  XLSX.utils.book_append_sheet(wb, wsA, 'Kinerja AO');

  const wsT = XLSX.utils.aoa_to_sheet([
    ['Nama Debitur', 'No. Loan', 'KOL', 'Baki Debet', 'Tunggakan'],
    ...k.topDebitur.map((d) => [d.nama, d.loan, d.kol, d.baki, d.tunggakan]),
  ]);
  setCol(wsT, [32, 16, 8, 20, 20]);
  applyFormat(wsT, [3, 4], IDR, 1);
  XLSX.utils.book_append_sheet(wb, wsT, 'Top Tunggakan');

  XLSX.writeFile(wb, `Executive-Dashboard_${k.cabang.replace(/\s+/g, '-')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

const money = (n: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);

export const exportExecutivePDF = (k: ExecutiveKPI) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();

  // Header banner
  doc.setFillColor(12, 45, 96);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('EXECUTIVE DASHBOARD', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Bluebook Telihan · ${k.cabang}`, 14, 18.5);
  doc.text(`Periode data: ${k.periode}${k.pembanding ? `  |  Pembanding: ${k.pembanding}` : ''}`, W - 14, 12, { align: 'right' });
  doc.text(`Dicetak: ${format(new Date(), 'dd MMM yyyy HH:mm', { locale: idLocale })}`, W - 14, 18.5, { align: 'right' });

  // KPI cards
  const cards = [
    { l: 'Outstanding', v: `Rp ${money(k.totalBaki)}`, s: `Plafon Rp ${money(k.totalPlafon)}` },
    { l: 'Total Debitur', v: money(k.totalDebitur), s: `${k.growthDebitur >= 0 ? '+' : ''}${money(k.growthDebitur)} vs lalu` },
    { l: 'NPL (KOL 3-5)', v: `${k.nplRatio.toFixed(2)}%`, s: `Rp ${money(k.nplBaki)} · ${money(k.nplCount)} debitur` },
    { l: 'KKR (KOL 2-5)', v: `${k.kkrRatio.toFixed(2)}%`, s: `Rp ${money(k.kkrBaki)}` },
    { l: 'Pertumbuhan', v: `${k.growthBakiPct.toFixed(2)}%`, s: `Rp ${money(k.growthBaki)}` },
    { l: 'Tunggakan', v: `Rp ${money(k.totalTunggakan)}`, s: `Pokok Rp ${money(k.totalTungpk)}` },
  ];
  const cw = (W - 28 - 5 * 4) / 6;
  cards.forEach((c, i) => {
    const x = 14 + i * (cw + 4);
    doc.setFillColor(243, 246, 251);
    doc.setDrawColor(210, 220, 235);
    doc.roundedRect(x, 32, cw, 22, 2, 2, 'FD');
    doc.setTextColor(90, 100, 120);
    doc.setFontSize(7);
    doc.text(c.l.toUpperCase(), x + 3, 38);
    doc.setTextColor(12, 45, 96);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(c.v, x + 3, 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(110, 118, 135);
    doc.text(c.s, x + 3, 50.5);
  });

  const head = { fillColor: [12, 45, 96] as [number, number, number], textColor: 255, fontSize: 8 };
  const body = { fontSize: 8, cellPadding: 1.6 };

  autoTable(doc, {
    startY: 60,
    head: [['Kolektibilitas', 'Debitur', 'Baki Debet (Rp)', 'Tunggakan (Rp)', 'Porsi']],
    body: [
      ...k.kolData.map((d) => [d.name, money(d.count), money(d.baki), money(d.tunggakan), `${d.share.toFixed(1)}%`]),
      ['TOTAL', money(k.totalDebitur), money(k.totalBaki), money(k.totalTunggakan), '100%'],
    ],
    headStyles: head,
    styles: body,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    theme: 'grid',
    margin: { left: 14, right: W / 2 + 2 },
    tableWidth: W / 2 - 16,
  });

  autoTable(doc, {
    startY: 60,
    head: [['Cabang', 'Debitur', 'Baki Debet (Rp)', 'NPL']],
    body: k.branchData.map((b) => [`${b.code} · ${b.name}`, money(b.count), money(b.baki), `${b.nplRatio.toFixed(2)}%`]),
    headStyles: head,
    styles: body,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    theme: 'grid',
    margin: { left: W / 2 + 2, right: 14 },
    tableWidth: W / 2 - 16,
  });

  const y1 = Math.max((doc as any).lastAutoTable?.finalY || 100, 100) + 6;

  autoTable(doc, {
    startY: y1,
    head: [['Loan Pipeline', 'Jumlah', 'Plafon (Rp)']],
    body: [
      ...k.pipeline.map((p) => [p.label, money(p.count), money(p.plafon)]),
      ['Total Aktif', money(k.pipelineTotal.count), money(k.pipelineTotal.plafon)],
      ['Dibatalkan', money(k.pipelineTotal.batal), '-'],
      ['Konversi ke Cair', `${k.pipelineTotal.konversi.toFixed(2)}%`, '-'],
    ],
    headStyles: head,
    styles: body,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    theme: 'grid',
    margin: { left: 14, right: W / 2 + 2 },
    tableWidth: W / 2 - 16,
  });

  autoTable(doc, {
    startY: y1,
    head: [['Mutasi Fasilitas', 'Unit', 'Nominal (Rp)']],
    body: [
      ['Baru cair periode berjalan', money(k.cairCount), money(k.cairBaki)],
      ['Lunas / ditutup', money(k.lunasCount), money(k.lunasBaki)],
      ['Ekstrakomtabel', money(k.ekstraCount), money(k.ekstraBaki)],
      ['Lancar (KOL 1)', '-', money(k.lancarBaki)],
      ['DPK (KOL 2)', money(k.dpkCount), money(k.dpkBaki)],
    ],
    headStyles: head,
    styles: body,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    theme: 'grid',
    margin: { left: W / 2 + 2, right: 14 },
    tableWidth: W / 2 - 16,
  });

  doc.addPage('a4', 'landscape');
  autoTable(doc, {
    startY: 18,
    head: [['Account Officer', 'Debitur', 'Baki Debet (Rp)', 'Tunggakan (Rp)', 'NPL']],
    body: k.aoData.map((a) => [a.ao, money(a.count), money(a.baki), money(a.tunggakan), `${a.nplRatio.toFixed(2)}%`]),
    headStyles: head,
    styles: body,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    theme: 'striped',
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(12, 45, 96);
      doc.text('Kinerja Account Officer & Debitur Tunggakan Terbesar', 14, 13);
    },
  });

  autoTable(doc, {
    startY: ((doc as any).lastAutoTable?.finalY || 60) + 6,
    head: [['Nama Debitur', 'No. Loan', 'KOL', 'Baki Debet (Rp)', 'Tunggakan (Rp)']],
    body: k.topDebitur.map((d) => [d.nama, d.loan, String(d.kol), money(d.baki), money(d.tunggakan)]),
    headStyles: head,
    styles: body,
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    theme: 'striped',
    margin: { left: 14, right: 14 },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(130, 138, 155);
    doc.text('Bluebook Telihan — dokumen internal, dilarang disebarluaskan tanpa izin.', 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Halaman ${i} dari ${pages}`, W - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`Executive-Dashboard_${k.cabang.replace(/\s+/g, '-')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
