import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { SuratKeluar, OjkStatus, isOjkSurat } from '@/types';
import logoUrl from '@/assets/logo-bankaltimtara.png';

const OJK_LABEL: Record<OjkStatus, string> = {
  diajukan: 'Diajukan',
  diproses: 'Diproses',
  ditolak: 'Ditolak',
  selesai: 'Disetujui',
};

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

export interface OjkReportOptions {
  data: SuratKeluar[];
  generatedBy?: string;
  statusFilter?: OjkStatus | 'all';
}

export const generateOjkReportPDF = async ({
  data,
  generatedBy = 'Sistem',
  statusFilter = 'all',
}: OjkReportOptions) => {
  // Filter only OJK letters
  let ojkData = data.filter(s => s.ojkStatus || isOjkSurat(s));
  if (statusFilter !== 'all') {
    ojkData = ojkData.filter(s => (s.ojkStatus || 'diajukan') === statusFilter);
  }
  // Sort newest first
  ojkData.sort((a, b) =>
    new Date(b.tanggal || b.createdAt).getTime() -
    new Date(a.tanggal || a.createdAt).getTime()
  );

  const stats = {
    total: ojkData.length,
    diajukan: ojkData.filter(s => (s.ojkStatus || 'diajukan') === 'diajukan').length,
    diproses: ojkData.filter(s => s.ojkStatus === 'diproses').length,
    selesai: ojkData.filter(s => s.ojkStatus === 'selesai').length,
    ditolak: ojkData.filter(s => s.ojkStatus === 'ditolak').length,
  };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;

  // ===== KOP SURAT =====
  let y = 10;
  try {
    const logoB64 = await loadImageBase64(logoUrl);
    doc.addImage(logoB64, 'PNG', marginX, y, 18, 18);
  } catch {
    /* ignore */
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 63, 127);
  doc.text('PT. BPD Kalimantan Timur & Kalimantan Utara', marginX + 22, y + 5);
  doc.setFontSize(10.5);
  doc.text('Kantor Cabang Pembantu Telihan', marginX + 22, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Jl. Letjend S. Parman No. 14–15, Bontang 75383  ·  Telp. 0548-26567', marginX + 22, y + 14.5);
  doc.text('kcp.telihan@bankaltimtara.co.id  ·  bankaltimtara.co.id', marginX + 22, y + 18);

  // Brand accent lines
  doc.setDrawColor(0, 63, 127);
  doc.setLineWidth(0.9);
  doc.line(marginX, y + 21, pageW - marginX, y + 21);
  doc.setDrawColor(245, 130, 32);
  doc.setLineWidth(0.4);
  doc.line(marginX, y + 22, pageW - marginX, y + 22);

  // ===== TITLE =====
  y = 38;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN PENGAJUAN SLIK OJK', pageW / 2, y, { align: 'center' });
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  const filterLabel = statusFilter === 'all' ? 'Semua Status' : OJK_LABEL[statusFilter];
  doc.text(
    `Surat Keluar Kode B-4 ke Otoritas Jasa Keuangan  ·  Filter: ${filterLabel}`,
    pageW / 2,
    y + 5.5,
    { align: 'center' }
  );
  doc.text(
    `Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })} oleh ${generatedBy}`,
    pageW / 2,
    y + 10.5,
    { align: 'center' }
  );

  // ===== SUMMARY CARDS =====
  y = 58;
  const cards = [
    { label: 'Total', value: stats.total, color: [0, 63, 127] as const },
    { label: 'Diajukan', value: stats.diajukan, color: [217, 119, 6] as const },
    { label: 'Diproses', value: stats.diproses, color: [37, 99, 235] as const },
    { label: 'Disetujui', value: stats.selesai, color: [22, 163, 74] as const },
    { label: 'Ditolak', value: stats.ditolak, color: [220, 38, 38] as const },
  ];
  const gap = 4;
  const cardW = (pageW - marginX * 2 - gap * (cards.length - 1)) / cards.length;
  const cardH = 18;
  cards.forEach((c, i) => {
    const x = marginX + i * (cardW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.roundedRect(x, y, 2, cardH, 1, 1, 'F');
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(c.label.toUpperCase(), x + 6, y + 6);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(String(c.value), x + 6, y + 14.5);
  });

  // ===== TABLE =====
  const rows = ojkData.map((s, idx) => {
    const status = (s.ojkStatus || 'diajukan') as OjkStatus;
    return [
      String(idx + 1),
      s.nomorAgenda || '-',
      s.tanggal ? format(new Date(s.tanggal), 'dd/MM/yyyy') : '-',
      s.namaPenerima || '-',
      s.perihal || '-',
      OJK_LABEL[status],
      s.ojkStatusUpdatedByNama || '-',
      s.ojkStatusUpdatedAt ? format(new Date(s.ojkStatusUpdatedAt), 'dd/MM/yy HH:mm') : '-',
      status === 'ditolak' ? (s.ojkRejectReason || '-') : '-',
    ];
  });

  autoTable(doc, {
    startY: y + cardH + 8,
    head: [['No', 'Nomor Agenda', 'Tanggal', 'Penerima', 'Perihal', 'Status', 'Diperbarui Oleh', 'Waktu Update', 'Alasan Tolak']],
    body: rows.length ? rows : [['—', '—', '—', '—', 'Tidak ada data', '—', '—', '—', '—']],
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [0, 63, 127], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
    bodyStyles: { textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 30 },
      7: { cellWidth: 24, halign: 'center' },
      8: { cellWidth: 45 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const v = String(data.cell.raw);
        if (v === 'Disetujui') data.cell.styles.textColor = [22, 101, 52];
        else if (v === 'Ditolak') data.cell.styles.textColor = [185, 28, 28];
        else if (v === 'Diproses') data.cell.styles.textColor = [29, 78, 216];
        else if (v === 'Diajukan') data.cell.styles.textColor = [180, 83, 9];
      }
    },
    margin: { left: marginX, right: marginX },
    didDrawPage: () => {
      // Footer with page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Bluebook Telihan · Laporan Pengajuan SLIK OJK · Halaman ${currentPage} dari ${pageCount}`,
        pageW / 2,
        pageH - 6,
        { align: 'center' }
      );
    },
  });

  const fname = `Laporan_Pengajuan_SLIK_OJK_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(fname);
};
