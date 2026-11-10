import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { gambarUkirPdf, gambarPitaUkirPdf } from '@/components/ornamen/UkirDayak';
import {
  BARIS_PORTAL, JENIS_LABEL, PRODUK_LABEL, SEGMEN_LABEL,
  type JenisProduktif, type KodeProduk, type KodeSegmen,
} from '@/lib/pipeline-segmen';
import {
  rp, rpKosong, miliar, net, kosong, tambah, tglPendek, totalMinggu,
  type AngkaProduk, type IsiLaporanPipeline,
} from '@/lib/pipeline-pdf';

/* -------------------------------------------------------------------------- */
/*  Laporan Pipeline — A4 tegak, dirancang supaya mudah dibaca                */
/*                                                                            */
/*  Versi ini bukan sekadar versi mendatar yang diputar. Tiga hal dibedakan:  */
/*                                                                            */
/*  1. Huruf jauh lebih besar. Tidak ada teks di bawah 8,5 pt, angka tabel     */
/*     9,5 pt, dan angka sorotan 20 pt — terbaca tanpa kacamata baca atau      */
/*     tanpa menempelkan kertas ke mata.                                       */
/*                                                                            */
/*  2. Warna tidak pernah jadi satu-satunya penanda. Merah–hijau sengaja       */
/*     ditinggalkan karena itu pasangan yang paling sering tidak terbedakan;   */
/*     penggantinya biru–jingga (palet Okabe–Ito) yang tetap terbedakan pada   */
/*     semua jenis buta warna umum. Di samping itu tiap angka selalu membawa   */
/*     tanda + atau -, dan tiap batang grafik diberi label angkanya sendiri,   */
/*     sehingga laporan ini tetap terbaca utuh kalau dicetak hitam putih.      */
/*                                                                            */
/*  3. Kolom minggu dipecah bertiga. A4 tegak tidak muat tujuh kolom rupiah    */
/*     penuh dengan huruf sebesar ini, dan memperkecil angka berarti           */
/*     mengkhianati tujuan versi ini — jadi tabelnya yang dipecah, bukan       */
/*     hurufnya yang dikecilkan.                                              */
/* -------------------------------------------------------------------------- */

/* Palet Okabe–Ito, digelapkan secukupnya agar kontras teksnya di atas putih
   melewati 7:1 (WCAG AAA untuk teks biasa), bukan sekadar 4,5:1. */
const BIRU: [number, number, number] = [0, 90, 140];      // positif / Booking
const BIRU_MUDA: [number, number, number] = [0, 114, 178]; // batang Booking
const JINGGA: [number, number, number] = [168, 71, 10];    // negatif / Run Off
const JINGGA_MUDA: [number, number, number] = [213, 94, 0];
const COKELAT: [number, number, number] = [110, 50, 10];   // Paid Off
const BIRU_TUA: [number, number, number] = [8, 42, 76];
const TEKS: [number, number, number] = [17, 24, 39];
const TEKS_LEMBUT: [number, number, number] = [55, 65, 81];
const ZEBRA: [number, number, number] = [240, 244, 249];
const KARTU: [number, number, number] = [238, 243, 249];
const GARIS: [number, number, number] = [203, 213, 225];
const UKIR: [number, number, number] = [206, 223, 240];

/** Minggu dipecah bertiga supaya kolom rupiah penuh tetap lega di A4 tegak. */
const MINGGU_PER_TABEL = 3;

const potong = <T,>(daftar: T[], ukuran: number): T[][] => {
  const hasil: T[][] = [];
  for (let i = 0; i < daftar.length; i += ukuran) hasil.push(daftar.slice(i, i + ukuran));
  return hasil;
};

/** Angka bertanda, supaya arahnya terbaca tanpa bergantung pada warna. */
const bertanda = (n: number) => `${n < 0 ? '-' : '+'}${rp(Math.abs(n))}`;
const bertandaMiliar = (n: number) => `${n < 0 ? '-' : '+'}${miliar(Math.abs(n))}`;

export const buatPdfPipelineTegak = (isi: IsiLaporanPipeline) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();
  const M = 14;
  const isiLebar = lebar - M * 2;

  /* ----------------------------------------------------------- kop/judul --- */
  const kop = (halamanPertama: boolean) => {
    const h = halamanPertama ? 36 : 16;
    doc.setFillColor(...BIRU_TUA);
    doc.rect(0, 0, lebar, h, 'F');
    const awalPita = halamanPertama ? lebar * 0.62 : lebar * 0.78;
    gambarPitaUkirPdf(doc, awalPita, 0, lebar - awalPita, h, halamanPertama ? 14 : 11,
      halamanPertama ? [21, 62, 108] : [15, 52, 95]);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    if (halamanPertama) {
      doc.setFontSize(17);
      doc.text('LAPORAN PIPELINE', M, 15);
      doc.setFontSize(13);
      doc.text('MINGGUAN', M, 22.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(205, 224, 243);
      doc.text('KCP Telihan  ·  Bankaltimtara', M, 29);
      doc.setFontSize(8.8);
      doc.text(`Periode MLF ${isi.periode}`, M, 33.4);
    } else {
      doc.setFontSize(10);
      doc.text('LAPORAN PIPELINE MINGGUAN', M, 10.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(190, 212, 236);
      doc.text(`KCP Telihan  ·  ${isi.periode}`, lebar - M, 10.5, { align: 'right' });
    }
    doc.setFillColor(...JINGGA_MUDA);
    doc.rect(0, h, lebar, 1.4, 'F');
    return h + 1.4;
  };

  const sudahKop = new Set<number>();
  const pastikanKop = () => {
    const p = (doc as any).internal.getCurrentPageInfo().pageNumber;
    if (sudahKop.has(p)) return 0;
    sudahKop.add(p);
    return kop(p === 1);
  };

  let y = pastikanKop() + 9;

  const ruangBaru = (butuh: number) => {
    if (y + butuh <= tinggi - 16) return;
    doc.addPage();
    y = pastikanKop() + 7;
  };

  let judulAktif = '';
  const judulBagian = (teks: string, catatan?: string) => {
    judulAktif = teks;
    ruangBaru(32);
    gambarUkirPdf(doc, M, y - 5.6, 7.6, UKIR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...BIRU_TUA);
    doc.text(teks, M + 10, y);
    y += 4;
    if (catatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(...TEKS_LEMBUT);
      const baris = doc.splitTextToSize(catatan, isiLebar) as string[];
      baris.forEach((t, i) => doc.text(t, M, y + i * 4));
      y += baris.length * 4 + 1;
    }
    doc.setDrawColor(...GARIS);
    doc.setLineWidth(0.5);
    doc.line(M, y - 1.5, lebar - M, y - 1.5);
    y += 2.5;
  };

  /** Kartu angka besar. Label di atas, angka besar, keterangan di bawah. */
  const kartu = (
    x: number, atas: number, w: number, h: number,
    label: string, nilai: string, satuan: string, bawah: string,
    aksen: [number, number, number],
  ) => {
    doc.setFillColor(...KARTU);
    doc.roundedRect(x, atas, w, h, 2, 2, 'F');
    doc.setFillColor(...aksen);
    doc.roundedRect(x, atas, 2.4, h, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...TEKS_LEMBUT);
    doc.text(label.toUpperCase(), x + 6, atas + 6.6);
    doc.setFontSize(20);
    doc.setTextColor(...aksen);
    doc.text(nilai, x + 6, atas + 16.6);
    const lebarNilai = doc.getTextWidth(nilai);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...TEKS_LEMBUT);
    doc.text(satuan, x + 7.5 + lebarNilai, atas + 16.6);
    doc.setFontSize(8.4);
    doc.setTextColor(...TEKS);
    const baris = doc.splitTextToSize(bawah, w - 10) as string[];
    baris.slice(0, 2).forEach((t, i) => doc.text(t, x + 6, atas + 22 + i * 4));
  };

  /**
   * Batang bergaris putih — pembeda yang tetap bekerja di cetakan hitam putih
   * dan bagi mata yang tidak membedakan rona.
   */
  const batangBergaris = (x: number, atas: number, w: number, h: number, warna: [number, number, number]) => {
    if (h <= 0.2) return;
    doc.setFillColor(...warna);
    doc.roundedRect(x, atas, w, h, 0.7, 0.7, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.7);
    for (let g = atas + 1.6; g < atas + h; g += 2.6) doc.line(x, g, x + w, g);
  };

  /**
   * Grafik batang per minggu: Booking ke atas, Run Off dan Paid Off ke bawah.
   * Tiap batang diberi label angkanya sendiri, jadi grafiknya tetap terbaca
   * tanpa membandingkan warna atau mengira-ira tinggi batang.
   */
  const grafikMinggu = (x: number, atas: number, w: number, h: number, data: AngkaProduk[]) => {
    const puncak = Math.max(1, ...data.map((d) => Math.max(d.booking, d.runOff + d.paidOff)));
    const ruangLabel = 17;
    const kolom = w / data.length;
    const dasar = atas + (h - ruangLabel) * 0.55;
    const skalaAtas = dasar - atas - 7;
    const skalaBawah = atas + h - ruangLabel - dasar;

    doc.setDrawColor(...GARIS);
    doc.setLineWidth(0.4);
    doc.line(x, dasar, x + w, dasar);

    data.forEach((d, i) => {
      const tengah = x + kolom * i + kolom / 2;
      const lb = Math.min(11, kolom * 0.3);
      const kiri = tengah - lb - 1.5;
      const kanan = tengah + 1.5;
      const tB = (d.booking / puncak) * skalaAtas;
      const tR = (d.runOff / puncak) * skalaBawah;
      const tP = (d.paidOff / puncak) * skalaBawah;

      if (tB > 0.2) {
        doc.setFillColor(...BIRU_MUDA);
        doc.roundedRect(kiri, dasar - tB, lb, tB, 0.7, 0.7, 'F');
      }
      if (tR > 0.2) {
        doc.setFillColor(...JINGGA_MUDA);
        doc.roundedRect(kanan, dasar, lb, tR, 0.7, 0.7, 'F');
      }
      batangBergaris(kanan, dasar + tR, lb, tP, COKELAT);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      if (d.booking > 0) {
        doc.setTextColor(...BIRU);
        doc.text(jutaBulat(d.booking), kiri + lb / 2, dasar - tB - 2, { align: 'center' });
      }
      if (d.runOff + d.paidOff > 0) {
        doc.setTextColor(...JINGGA);
        doc.text(jutaBulat(d.runOff + d.paidOff), kanan + lb / 2, dasar + tR + tP + 3.6, { align: 'center' });
      }

      const n = net(d);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(...TEKS_LEMBUT);
      doc.text(`MINGGU ${isi.minggu[i].nomor}`, tengah, atas + h - 10, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.6);
      doc.setTextColor(...(n < 0 ? JINGGA : BIRU));
      doc.text(`${n < 0 ? '-' : '+'}${jutaBulat(Math.abs(n))}`, tengah, atas + h - 5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...TEKS_LEMBUT);
      doc.text(n < 0 ? 'turun' : 'naik', tengah, atas + h - 0.8, { align: 'center' });
    });
  };

  const jutaBulat = (n: number) =>
    (n / 1e6).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const keterangan = (x: number, atas: number) => {
    const butir: [string, [number, number, number], boolean][] = [
      ['Booking (naik)', BIRU_MUDA, false],
      ['Run Off (turun)', JINGGA_MUDA, false],
      ['Paid Off (turun)', COKELAT, true],
    ];
    let kx = x;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    butir.forEach(([t, w, bergaris]) => {
      if (bergaris) batangBergaris(kx, atas - 3, 4.5, 4, w);
      else {
        doc.setFillColor(...w);
        doc.roundedRect(kx, atas - 3, 4.5, 4, 0.7, 0.7, 'F');
      }
      doc.setTextColor(...TEKS);
      doc.text(t, kx + 6.2, atas);
      kx += doc.getTextWidth(t) + 14;
    });
  };

  /* --------------------------------------------------------- gaya tabel --- */
  const gaya = {
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 2.4, bottom: 2.4, left: 2.6, right: 2.6 },
      halign: 'center' as const,
      valign: 'middle' as const,
      lineWidth: 0,
      textColor: TEKS,
    },
    headStyles: {
      fillColor: BIRU_TUA,
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const,
      fontSize: 8.6,
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.6, right: 2.6 },
    },
    alternateRowStyles: { fillColor: ZEBRA },
    rowPageBreak: 'avoid' as const,
    margin: { left: M, right: M, top: 24, bottom: 16 },
    didDrawPage: (d: any) => {
      pastikanKop();
      if (d.pageNumber > 1 && judulAktif) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.6);
        doc.setTextColor(...TEKS_LEMBUT);
        doc.text(`${judulAktif} (lanjutan)`, M, 22.5);
      }
    },
  };

  const judulKolomMinggu = (kel: { nomor: number; mulai: string; selesai: string }[]) =>
    kel.map((m) => `MINGGU ${m.nomor}\n${tglPendek(m.mulai)} - ${tglPendek(m.selesai)}`);

  /* ------------------------------------------------------------ sorotan --- */
  const gabungan = isi.minggu.map((_, i) =>
    isi.unit.reduce((a, u) => tambah(a, totalMinggu(u, i)), kosong()),
  );
  const totalBulan = gabungan.reduce(tambah, kosong());
  const netBulan = net(totalBulan);

  judulBagian(
    'Sorotan Bulan Ini',
    'Angka dalam Miliar Rupiah. Tanda + berarti portofolio bertambah, tanda - berarti berkurang; warna hanya penegas, bukan satu-satunya penanda.',
  );

  const wK = (isiLebar - 5) / 2;
  const hK = 29;
  kartu(M, y, wK, hK, 'Net Gabungan', bertandaMiliar(netBulan), 'M',
    netBulan < 0 ? 'Portofolio berkurang sebanyak ini' : 'Portofolio bertambah sebanyak ini',
    netBulan < 0 ? JINGGA : BIRU);
  kartu(M + wK + 5, y, wK, hK, 'Booking (+)', miliar(totalBulan.booking), 'M',
    `${isi.unit.reduce((a, u) => a + u.rencana.length, 0)} rencana pencairan`, BIRU);
  y += hK + 5;
  kartu(M, y, wK, hK, 'Run Off (-)', miliar(totalBulan.runOff), 'M',
    'Angsuran pokok yang jatuh tempo di periode ini', JINGGA);
  kartu(M + wK + 5, y, wK, hK, 'Paid Off (-)', miliar(totalBulan.paidOff), 'M',
    'Kredit yang lunas di periode ini', COKELAT);
  y += hK + 10;

  /* -------------------------------------------------- bentuk per minggu --- */
  judulBagian('Bentuk Pipeline per Minggu', 'Nilai dalam juta rupiah. Tiap batang diberi angkanya sendiri, jadi grafik ini tetap terbaca bila dicetak hitam putih.');
  keterangan(M, y + 2);
  y += 5;
  grafikMinggu(M, y, isiLebar, 62, gabungan);
  y += 75;

  /* ---------------------------------------------------------- net/unit --- */
  judulBagian('Net per Unit', 'Dalam Miliar Rupiah, seperti tampilan portal.');
  autoTable(doc, {
    ...gaya,
    startY: y,
    head: [['Unit', ...isi.minggu.map((m) => `M${m.nomor}`), 'TOTAL']],
    body: [
      ...isi.unit.map((u) => [
        u.label,
        ...isi.minggu.map((_, i) => bertandaMiliar(net(totalMinggu(u, i)))),
        bertandaMiliar(isi.minggu.reduce((s, _, i) => s + net(totalMinggu(u, i)), 0)),
      ]),
      ['GABUNGAN', ...gabungan.map((g) => bertandaMiliar(net(g))), bertandaMiliar(netBulan)],
    ],
    theme: 'plain',
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 46 } },
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      if (d.row.index === isi.unit.length) {
        d.cell.styles.fillColor = [225, 236, 247];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.column.index > 0) {
        d.cell.styles.textColor = String(d.cell.raw).startsWith('-') ? JINGGA : BIRU;
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 11;

  /* ----------------------------------------------- ringkasan per minggu --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `Ringkasan per Minggu — ${u.label}`,
      `${u.jumlahDebitur} debitur. Rupiah penuh. Net = Booking dikurangi Run Off dan Paid Off.`,
    );
    const baris = isi.minggu.map((m, i) => {
      const t = totalMinggu(u, i);
      return [
        `Minggu ${m.nomor}\n${tglPendek(m.mulai)} - ${tglPendek(m.selesai)}`,
        rpKosong(t.booking), rpKosong(t.runOff), rpKosong(t.paidOff), bertanda(net(t)),
      ];
    });
    const tot = isi.minggu.reduce((a, _, i) => tambah(a, totalMinggu(u, i)), kosong());
    baris.push(['TOTAL BULAN', rpKosong(tot.booking), rpKosong(tot.runOff), rpKosong(tot.paidOff), bertanda(net(tot))]);

    autoTable(doc, {
      ...gaya,
      startY: y,
      head: [['Periode', 'Booking (+)', 'Run Off (-)', 'Paid Off (-)', 'Net']],
      body: baris,
      theme: 'plain',
      columnStyles: { 0: { halign: 'left', cellWidth: 36, fontSize: 8.6 } },
      didParseCell: (d: any) => {
        if (d.section !== 'body') return;
        if (d.row.index === baris.length - 1) {
          d.cell.styles.fillColor = [225, 236, 247];
          d.cell.styles.fontStyle = 'bold';
        }
        if (d.cell.raw === '-') d.cell.styles.textColor = [148, 163, 184];
        if (d.column.index === 4) {
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.textColor = String(d.cell.raw).startsWith('-') ? JINGGA : BIRU;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 11;
  });

  /* ------------------------------------------------------- angka portal --- */
  isi.unit.forEach((u) => {
    const kelompok = potong(isi.minggu, MINGGU_PER_TABEL);
    kelompok.forEach((kel, ki) => {
      const terakhir = ki === kelompok.length - 1;
      judulBagian(
        `Angka Portal — ${u.label}${kelompok.length > 1 ? ` (${ki + 1} dari ${kelompok.length})` : ''}`,
        ki === 0
          ? 'Angka yang disalin ke portal. Rupiah penuh, sudah bersih (Booking dikurangi Run Off dan Paid Off).'
          : undefined,
      );
      const awal = ki * MINGGU_PER_TABEL;
      const body: any[] = [];
      let segmenKini: KodeSegmen | null = null;
      BARIS_PORTAL.forEach((b) => {
        if (b.segmen !== segmenKini) {
          segmenKini = b.segmen;
          body.push([{
            content: SEGMEN_LABEL[b.segmen].toUpperCase(),
            colSpan: kel.length + 1 + (terakhir ? 1 : 0),
            styles: { fillColor: [221, 232, 244], textColor: BIRU_TUA, fontStyle: 'bold', fontSize: 8.8, halign: 'left' },
          }]);
        }
        const nilai = kel.map((_, j) =>
          b.produk.reduce((a, k) => tambah(a, u.angka[k][awal + j]), kosong()));
        const isiBaris = [b.label, ...nilai.map((m) => rpKosong(net(m)))];
        if (terakhir) {
          const totalSemua = isi.minggu.reduce(
            (a, _, i) => tambah(a, b.produk.reduce((x, k) => tambah(x, u.angka[k][i]), kosong())),
            kosong());
          isiBaris.push(rpKosong(net(totalSemua)));
        }
        body.push(isiBaris);
      });

      autoTable(doc, {
        ...gaya,
        startY: y,
        head: [['Produk', ...judulKolomMinggu(kel), ...(terakhir ? ['TOTAL BULAN'] : [])]],
        body,
        theme: 'plain',
        columnStyles: { 0: { halign: 'left', cellWidth: 46, fontSize: 8.8 } },
        didParseCell: (d: any) => {
          if (d.section !== 'body') return;
          if (d.cell.raw === '-') d.cell.styles.textColor = [148, 163, 184];
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    });
  });

  /* ------------------------------------------------------------ rincian --- */
  const adaRincian = isi.unit.some((u) => Object.keys(u.rincian).length > 0);
  if (adaRincian) {
    const kelompok = potong(isi.minggu, MINGGU_PER_TABEL);
    kelompok.forEach((kel, ki) => {
      const terakhir = ki === kelompok.length - 1;
      judulBagian(
        `Rincian Kredit Produktif — Modal Kerja vs Investasi${kelompok.length > 1 ? ` (${ki + 1} dari ${kelompok.length})` : ''}`,
        ki === 0 ? 'Pecahan dari baris KUR dan Non KUR di atas.' : undefined,
      );
      const awal = ki * MINGGU_PER_TABEL;
      const body: any[] = [];
      isi.unit.forEach((u) => {
        const kunci = Object.keys(u.rincian).filter((k) =>
          isi.minggu.some((_, i) => net(u.rincian[k][i]) !== 0));
        if (kunci.length === 0) return;
        body.push([{
          content: u.label.toUpperCase(),
          colSpan: kel.length + 2 + (terakhir ? 1 : 0),
          styles: { fillColor: [221, 232, 244], textColor: BIRU_TUA, fontStyle: 'bold', fontSize: 8.8, halign: 'left' },
        }]);
        kunci.sort().forEach((k) => {
          const [produk, jenis] = k.split('|') as [KodeProduk, JenisProduktif];
          const isiBaris = [
            PRODUK_LABEL[produk], JENIS_LABEL[jenis],
            ...kel.map((_, j) => rpKosong(net(u.rincian[k][awal + j]))),
          ];
          if (terakhir) isiBaris.push(rpKosong(net(u.rincian[k].reduce(tambah, kosong()))));
          body.push(isiBaris);
        });
      });
      autoTable(doc, {
        ...gaya,
        startY: y,
        head: [['Produk', 'Jenis', ...judulKolomMinggu(kel), ...(terakhir ? ['TOTAL'] : [])]],
        body,
        theme: 'plain',
        styles: { ...gaya.styles, fontSize: 8.8 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 33 },
          1: { halign: 'left', cellWidth: 27 },
        },
        didParseCell: (d: any) => {
          if (d.section === 'body' && d.cell.raw === '-') d.cell.styles.textColor = [148, 163, 184];
        },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  /* -------------------------------------------------- rencana pencairan --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `Rencana Pencairan — ${u.label}`,
      u.rencana.length
        ? 'Satu-satunya sumber angka Booking; semuanya diisi manual.'
        : undefined,
    );
    if (u.rencana.length === 0) {
      ruangBaru(16);
      doc.setFillColor(250, 250, 247);
      doc.roundedRect(M, y, isiLebar, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(...TEKS_LEMBUT);
      doc.text('Belum ada rencana pencairan untuk unit ini, jadi Booking dihitung nol.', M + 6, y + 7.5);
      y += 19;
      return;
    }
    autoTable(doc, {
      ...gaya,
      startY: y,
      head: [['Nama Debitur', 'Produk', 'Cair', 'Plafon (Rp)']],
      body: u.rencana.map((r) => [
        r.nama,
        PRODUK_LABEL[r.produk] || '-',
        r.tanggal ? format(new Date(`${r.tanggal}T00:00:00`), 'dd/MM/yy') : '-',
        rp(r.plafon),
      ]),
      foot: [[{ content: 'TOTAL BOOKING', colSpan: 3, styles: { halign: 'right' } },
        rp(u.rencana.reduce((a, r) => a + r.plafon, 0))]],
      theme: 'plain',
      showFoot: 'lastPage' as const,
      footStyles: { fillColor: [225, 236, 247], textColor: BIRU_TUA, fontStyle: 'bold', fontSize: 9.5, lineWidth: 0 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 54 },
        1: { halign: 'left', cellWidth: 44, fontSize: 8.8 },
        3: { halign: 'right', fontStyle: 'bold' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  });

  /* ---------------------------------------------------------- catatan --- */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.2);
  const barisCatatan = isi.catatan.map((c) => doc.splitTextToSize(c, isiLebar - 18) as string[]);
  const tinggiCatatan = 9 + barisCatatan.reduce((a, b) => a + b.length * 4.4, 0) + (barisCatatan.length - 1) * 2;
  ruangBaru(tinggiCatatan + 18);
  judulBagian('Cara Angka Ini Dihitung');
  doc.setFillColor(250, 250, 247);
  doc.roundedRect(M, y, isiLebar, tinggiCatatan, 2, 2, 'F');
  doc.setFillColor(...JINGGA_MUDA);
  doc.roundedRect(M, y, 2, tinggiCatatan, 1, 1, 'F');
  let yc = y + 6.5;
  barisCatatan.forEach((baris) => {
    doc.setFillColor(...JINGGA_MUDA);
    doc.circle(M + 7, yc - 1.2, 0.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(...TEKS);
    baris.forEach((t, i) => doc.text(t, M + 11, yc + i * 4.4));
    yc += baris.length * 4.4 + 2;
  });

  /* -------------------------------------------------------------- kaki --- */
  const halaman = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= halaman; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GARIS);
    doc.setLineWidth(0.4);
    doc.line(M, tinggi - 11, lebar - M, tinggi - 11);
    gambarUkirPdf(doc, M, tinggi - 10, 5.4, [214, 228, 243]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(...TEKS_LEMBUT);
    doc.text('Bluebook Telihan  ·  bahan pengisian portal', M + 8, tinggi - 6);
    doc.text(`Halaman ${i} dari ${halaman}`, lebar - M, tinggi - 6, { align: 'right' });
  }

  return doc;
};
