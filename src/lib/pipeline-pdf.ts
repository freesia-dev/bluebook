import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { gambarUkirPdf } from '@/components/ornamen/UkirDayak';
import {
  BARIS_PORTAL, JENIS_LABEL, PRODUK_LABEL, SEGMEN_LABEL,
  type JenisProduktif, type KodeProduk, type KodeSegmen, type Minggu,
} from '@/lib/pipeline-segmen';

/* -------------------------------------------------------------------------- */
/*  Laporan Pipeline dalam bentuk PDF                                         */
/*                                                                            */
/*  Isinya disusun mengikuti urutan orang membacanya: ringkasan dulu (berapa   */
/*  Net tiap unit), baru angka per produk yang disalin ke portal, lalu         */
/*  rincian Modal Kerja dan Investasi, dan terakhir daftar rencana pencairan   */
/*  yang jadi sumber angka Booking — terpisah Telihan dan Meranti.             */
/*                                                                            */
/*  Aksen ukir Dayak dipakai tipis di kop dan pembatas bagian. Sengaja samar:  */
/*  ini laporan kerja, hiasannya tidak boleh mengganggu angka.                 */
/* -------------------------------------------------------------------------- */

const BIRU: [number, number, number] = [11, 83, 148];
const BIRU_TUA: [number, number, number] = [8, 47, 84];
const ORANYE: [number, number, number] = [245, 130, 32];
const ABU: [number, number, number] = [71, 85, 105];
const ZEBRA: [number, number, number] = [244, 247, 252];
const UKIR: [number, number, number] = [205, 222, 243];
const HIJAU: [number, number, number] = [21, 128, 61];
const MERAH: [number, number, number] = [190, 50, 50];

export interface AngkaProduk {
  booking: number;
  runOff: number;
  paidOff: number;
}

export interface RencanaPdf {
  nama: string;
  produk: KodeProduk;
  tanggal: string | null;
  plafon: number;
  keterangan?: string | null;
}

export interface DataUnitPdf {
  label: string;
  /** angka[produk][indeks minggu] */
  angka: Record<KodeProduk, AngkaProduk[]>;
  /** rincian[`${produk}|${jenis}`][indeks minggu] — khusus kredit produktif */
  rincian: Record<string, AngkaProduk[]>;
  rencana: RencanaPdf[];
  jumlahDebitur: number;
}

export interface IsiLaporanPipeline {
  periode: string;
  minggu: Minggu[];
  unit: DataUnitPdf[];
  batasMikro: number;
  catatan: string[];
}

const rp = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const miliar = (n: number) =>
  (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const net = (a: AngkaProduk) => a.booking - a.runOff - a.paidOff;
const kosong = (): AngkaProduk => ({ booking: 0, runOff: 0, paidOff: 0 });
const tambah = (a: AngkaProduk, b: AngkaProduk): AngkaProduk => ({
  booking: a.booking + b.booking,
  runOff: a.runOff + b.runOff,
  paidOff: a.paidOff + b.paidOff,
});

const tglPendek = (s: string) => format(new Date(`${s}T00:00:00`), 'd MMM', { locale: idLocale });

export const buatPdfPipeline = (isi: IsiLaporanPipeline) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();
  const M = 12;
  const judulMinggu = isi.minggu.map(
    (m) => `Minggu ${m.nomor}\n${tglPendek(m.mulai)}–${tglPendek(m.selesai)}`,
  );

  /* ---------------------------------------------------------------- kop --- */
  doc.setFillColor(...BIRU_TUA);
  doc.rect(0, 0, lebar, 26, 'F');
  // deretan ukir di sepanjang kop, sangat samar
  for (let x = lebar - 120; x < lebar + 20; x += 22) {
    gambarUkirPdf(doc, x, 1, 22, [30, 72, 120], 0.35);
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('LAPORAN PIPELINE MINGGUAN', M, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(198, 219, 245);
  doc.text('PT BPD Kalimantan Timur & Kalimantan Utara · Kantor Cabang Pembantu Telihan', M, 18);
  doc.setFontSize(8);
  doc.text(
    `Periode MLF ${isi.periode}  ·  dicetak ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })} WITA`,
    M,
    22.5,
  );
  doc.setFillColor(...ORANYE);
  doc.rect(0, 26, lebar, 1.1, 'F');

  let y = 34;

  const judulBagian = (teks: string, catatan?: string) => {
    if (y > tinggi - 40) {
      doc.addPage();
      y = 18;
    }
    gambarUkirPdf(doc, M, y - 4.6, 6, UKIR, 0.3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BIRU);
    doc.text(teks, M + 8, y);
    if (catatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...ABU);
      doc.text(catatan, lebar - M, y, { align: 'right' });
    }
    y += 3;
  };

  /* --------------------------------------------------- 1. ringkasan Net --- */
  judulBagian('1. Ringkasan Net per Unit', 'dalam Miliar Rupiah, seperti tampilan portal');

  const barisRingkas = isi.unit.map((u) => {
    const perMinggu = isi.minggu.map((_, i) =>
      BARIS_PORTAL.reduce(
        (acc, b) => acc + net(b.produk.reduce((a, k) => tambah(a, u.angka[k][i]), kosong())),
        0,
      ),
    );
    return [u.label, ...perMinggu.map(miliar), miliar(perMinggu.reduce((a, b) => a + b, 0))];
  });
  const totalRingkas = isi.minggu.map((_, i) =>
    isi.unit.reduce(
      (s, u) =>
        s +
        BARIS_PORTAL.reduce(
          (acc, b) => acc + net(b.produk.reduce((a, k) => tambah(a, u.angka[k][i]), kosong())),
          0,
        ),
      0,
    ),
  );

  autoTable(doc, {
    startY: y,
    head: [['Unit', ...judulMinggu, 'Total Bulan']],
    body: [
      ...barisRingkas,
      ['GABUNGAN', ...totalRingkas.map(miliar), miliar(totalRingkas.reduce((a, b) => a + b, 0))],
    ],
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: BIRU, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 52 } },
    didParseCell: (d: any) => {
      if (d.section === 'body' && d.row.index === barisRingkas.length) {
        d.cell.styles.fillColor = [232, 240, 252];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.section === 'body' && d.column.index > 0) {
        const v = parseFloat(String(d.cell.raw).replace(/\./g, '').replace(',', '.'));
        if (v < 0) d.cell.styles.textColor = MERAH;
        else if (v > 0) d.cell.styles.textColor = HIJAU;
      }
    },
    margin: { left: M, right: M },
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  /* ------------------------------------------- 2. angka portal per unit --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `2. Angka Portal — ${u.label}`,
      `${u.jumlahDebitur} debitur · Rupiah penuh · Net = Booking - Run Off - Paid Off`,
    );

    const body: any[] = [];
    let segmenKini: KodeSegmen | null = null;
    BARIS_PORTAL.forEach((b) => {
      if (b.segmen !== segmenKini) {
        segmenKini = b.segmen;
        body.push([
          {
            content: SEGMEN_LABEL[b.segmen].toUpperCase(),
            colSpan: isi.minggu.length + 2,
            styles: { fillColor: [226, 232, 240], fontStyle: 'bold', fontSize: 7.5, halign: 'left' },
          },
        ]);
      }
      const perMinggu = isi.minggu.map((_, i) =>
        b.produk.reduce((a, k) => tambah(a, u.angka[k][i]), kosong()),
      );
      const total = perMinggu.reduce(tambah, kosong());
      body.push([b.label, ...perMinggu.map((m) => rp(net(m))), rp(net(total))]);
    });
    const totalUnit = isi.minggu.map((_, i) =>
      BARIS_PORTAL.reduce((a, b) => tambah(a, b.produk.reduce((x, k) => tambah(x, u.angka[k][i]), kosong())), kosong()),
    );
    body.push([
      'TOTAL NET',
      ...totalUnit.map((m) => rp(net(m))),
      rp(totalUnit.reduce((a, b) => a + net(b), 0)),
    ]);
    body.push([
      'Run Off (-)',
      ...totalUnit.map((m) => rp(m.runOff)),
      rp(totalUnit.reduce((a, b) => a + b.runOff, 0)),
    ]);
    body.push([
      'Paid Off (-)',
      ...totalUnit.map((m) => rp(m.paidOff)),
      rp(totalUnit.reduce((a, b) => a + b.paidOff, 0)),
    ]);
    body.push([
      'Booking (+)',
      ...totalUnit.map((m) => rp(m.booking)),
      rp(totalUnit.reduce((a, b) => a + b.booking, 0)),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Produk', ...judulMinggu, 'Total Bulan']],
      body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.6, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: BIRU, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: { 0: { halign: 'left', cellWidth: 52 } },
      didParseCell: (d: any) => {
        const n = body.length;
        if (d.section !== 'body') return;
        if (d.row.index === n - 4) {
          d.cell.styles.fillColor = [232, 240, 252];
          d.cell.styles.fontStyle = 'bold';
        }
        if (d.row.index >= n - 3) {
          d.cell.styles.textColor = ABU;
          d.cell.styles.fontSize = 6.8;
        }
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  });

  /* --------------------------------- 3. rincian Modal Kerja & Investasi --- */
  const adaRincian = isi.unit.some((u) => Object.keys(u.rincian).length > 0);
  if (adaRincian) {
    judulBagian(
      '3. Rincian Kredit Produktif — Modal Kerja vs Investasi',
      'pecahan dari baris KUR dan Non KUR di atas',
    );
    const body: any[] = [];
    isi.unit.forEach((u) => {
      const kunci = Object.keys(u.rincian).filter((k) =>
        isi.minggu.some((_, i) => net(u.rincian[k][i]) !== 0),
      );
      if (kunci.length === 0) return;
      body.push([
        {
          content: u.label.toUpperCase(),
          colSpan: isi.minggu.length + 3,
          styles: { fillColor: [226, 232, 240], fontStyle: 'bold', fontSize: 7.5, halign: 'left' },
        },
      ]);
      kunci.sort().forEach((k) => {
        const [produk, jenis] = k.split('|') as [KodeProduk, JenisProduktif];
        const perMinggu = u.rincian[k];
        const total = perMinggu.reduce(tambah, kosong());
        body.push([
          PRODUK_LABEL[produk],
          JENIS_LABEL[jenis],
          ...perMinggu.map((m) => rp(net(m))),
          rp(net(total)),
        ]);
      });
    });
    autoTable(doc, {
      startY: y,
      head: [['Produk', 'Jenis', ...judulMinggu, 'Total Bulan']],
      body,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.6, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: BIRU, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { halign: 'left', cellWidth: 40 },
        1: { halign: 'left', cellWidth: 32 },
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  }

  /* --------------------------------------- 4. rencana pencairan per unit --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `4. Rencana Pencairan (Booking) — ${u.label}`,
      u.rencana.length ? `${u.rencana.length} rencana` : 'belum ada rencana',
    );
    if (u.rencana.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(...ABU);
      doc.text('Belum ada rencana pencairan yang diinput untuk unit ini — Booking dihitung nol.', M + 2, y + 4);
      y += 11;
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [['Nama Debitur', 'Produk', 'Rencana Cair', 'Minggu', 'Plafon (Rp)', 'Keterangan']],
      body: u.rencana.map((r) => {
        const mg = isi.minggu.find((m) => r.tanggal && r.tanggal >= m.mulai && r.tanggal <= m.selesai);
        return [
          r.nama,
          PRODUK_LABEL[r.produk] || '-',
          r.tanggal ? format(new Date(`${r.tanggal}T00:00:00`), 'dd/MM/yyyy') : '—',
          mg ? `Minggu ${mg.nomor}` : 'di luar periode',
          rp(r.plafon),
          r.keterangan || '—',
        ];
      }),
      foot: [[
        { content: 'TOTAL BOOKING', colSpan: 4, styles: { halign: 'right' } },
        rp(u.rencana.reduce((a, r) => a + r.plafon, 0)),
        '',
      ]],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.6, halign: 'center', valign: 'middle' },
      headStyles: { fillColor: BIRU, textColor: 255, fontStyle: 'bold', fontSize: 7 },
      footStyles: { fillColor: [232, 240, 252], textColor: BIRU_TUA, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { halign: 'left', cellWidth: 48 },
        1: { halign: 'left', cellWidth: 44 },
        5: { halign: 'left' },
      },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  });

  /* ----------------------------------------------- 5. cara menghitungnya --- */
  judulBagian('5. Cara Angka Ini Dihitung');
  autoTable(doc, {
    startY: y,
    body: isi.catatan.map((c) => [c]),
    theme: 'plain',
    styles: { fontSize: 7.8, cellPadding: 1.2, textColor: ABU },
    margin: { left: M + 2, right: M },
  });

  /* ------------------------------------------------------------- kaki ---- */
  const halaman = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= halaman; i++) {
    doc.setPage(i);
    doc.setDrawColor(...UKIR);
    doc.setLineWidth(0.3);
    doc.line(M, tinggi - 9, lebar - M, tinggi - 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text('Bluebook Telihan · bahan pengisian portal Weekly Pipeline — bukan laporan resmi', M, tinggi - 5);
    doc.text(`Halaman ${i} dari ${halaman}`, lebar - M, tinggi - 5, { align: 'right' });
  }

  return doc;
};
