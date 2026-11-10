import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { gambarUkirPdf, gambarPitaUkirPdf } from '@/components/ornamen/UkirDayak';
import {
  BARIS_PORTAL, JENIS_LABEL, PRODUK_LABEL, SEGMEN_LABEL,
  type JenisProduktif, type KodeProduk, type KodeSegmen, type Minggu,
} from '@/lib/pipeline-segmen';

/* -------------------------------------------------------------------------- */
/*  Laporan Pipeline dalam bentuk PDF                                         */
/*                                                                            */
/*  Disusun mengikuti cara orang membacanya: sorotan dulu (sebesar apa         */
/*  bulan ini), lalu bentuknya per minggu dalam grafik, baru angka rinci yang  */
/*  disalin ke portal, rincian Modal Kerja vs Investasi, daftar rencana        */
/*  pencairan, dan terakhir cara angkanya dihitung.                            */
/*                                                                            */
/*  Garis kotak sengaja dihemat: yang memisahkan baris cukup selang-seling     */
/*  warna dan jarak, bukan kerangkeng garis. Ukir Dayak dipakai sebagai pita   */
/*  di kop dan penanda bagian — tipis, supaya angkanya yang menonjol.          */
/* -------------------------------------------------------------------------- */

const BIRU: [number, number, number] = [11, 83, 148];
const BIRU_TUA: [number, number, number] = [8, 42, 76];
const EMAS: [number, number, number] = [228, 160, 25];
const ABU: [number, number, number] = [100, 116, 139];
const ABU_TUA: [number, number, number] = [51, 65, 85];
const ZEBRA: [number, number, number] = [246, 249, 253];
const KARTU: [number, number, number] = [241, 245, 251];
const UKIR: [number, number, number] = [214, 228, 245];
const HIJAU: [number, number, number] = [16, 122, 72];
const MERAH: [number, number, number] = [187, 45, 45];

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

export const rp = (n: number) =>
  n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** Angka tabel: nol ditulis sebagai garis supaya mata langsung lari ke yang berisi. */
export const rpKosong = (n: number) => (n === 0 ? '-' : rp(n));
export const miliar = (n: number) =>
  (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
export const juta = (n: number) =>
  (n / 1e6).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const net = (a: AngkaProduk) => a.booking - a.runOff - a.paidOff;
export const kosong = (): AngkaProduk => ({ booking: 0, runOff: 0, paidOff: 0 });
export const tambah = (a: AngkaProduk, b: AngkaProduk): AngkaProduk => ({
  booking: a.booking + b.booking,
  runOff: a.runOff + b.runOff,
  paidOff: a.paidOff + b.paidOff,
});

export const tglPendek = (s: string) => format(new Date(`${s}T00:00:00`), 'd MMM', { locale: idLocale });

/** Total satu unit pada satu minggu, digabung dari semua baris portal. */
export const totalMinggu = (u: DataUnitPdf, i: number): AngkaProduk =>
  BARIS_PORTAL.reduce(
    (acc, b) => tambah(acc, b.produk.reduce((a, k) => tambah(a, u.angka[k][i]), kosong())),
    kosong(),
  );

export const buatPdfPipeline = (isi: IsiLaporanPipeline) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();
  const M = 12;
  const isiLebar = lebar - M * 2;
  const judulMinggu = isi.minggu.map(
    (m) => `MINGGU ${m.nomor}\n${tglPendek(m.mulai)} - ${tglPendek(m.selesai)}`,
  );

  /* ----------------------------------------------------------- kop/judul --- */
  const kop = (halamanPertama: boolean) => {
    const h = halamanPertama ? 30 : 15;
    doc.setFillColor(...BIRU_TUA);
    doc.rect(0, 0, lebar, h, 'F');
    const awalPita = halamanPertama ? lebar * 0.52 : lebar * 0.74;
    gambarPitaUkirPdf(doc, awalPita, 0, lebar - awalPita, h, halamanPertama ? 13 : 10,
      halamanPertama ? [21, 62, 108] : [15, 52, 95]);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    if (halamanPertama) {
      doc.setFontSize(16);
      doc.text('LAPORAN PIPELINE MINGGUAN', M, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      doc.setTextColor(186, 211, 240);
      doc.text(
        'PT BPD Kalimantan Timur & Kalimantan Utara  ·  Kantor Cabang Pembantu Telihan',
        M,
        19.2,
      );
      doc.setFontSize(7.6);
      doc.setTextColor(150, 180, 215);
      doc.text(
        `Periode MLF ${isi.periode}  ·  dicetak ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: idLocale })} WITA`,
        M,
        24.4,
      );
    } else {
      doc.setFontSize(9);
      doc.text('LAPORAN PIPELINE MINGGUAN', M, 9.8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(170, 198, 230);
      doc.text(`KCP Telihan  ·  periode MLF ${isi.periode}`, lebar - M, 9.8, { align: 'right' });
    }
    doc.setFillColor(...EMAS);
    doc.rect(0, h, lebar, 1.1, 'F');
    return h + 1.1;
  };

  /** Halaman yang sudah diberi kop — supaya tabel yang pindah halaman ikut rapi. */
  const sudahKop = new Set<number>();
  const pastikanKop = () => {
    const p = (doc as any).internal.getCurrentPageInfo().pageNumber;
    if (sudahKop.has(p)) return 0;
    sudahKop.add(p);
    return kop(p === 1);
  };

  let y = pastikanKop() + 7;

  const ruangBaru = (butuh: number) => {
    if (y + butuh <= tinggi - 14) return;
    doc.addPage();
    y = pastikanKop() + 6;
  };

  /** Judul bagian: kuntum ukir kecil, teks, lalu garis tipis sampai tepi kanan. */
  let judulAktif = '';
  const judulBagian = (teks: string, catatan?: string) => {
    judulAktif = teks;
    ruangBaru(26);
    gambarUkirPdf(doc, M, y - 5.2, 7, UKIR);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...BIRU_TUA);
    doc.text(teks, M + 9.4, y);
    const lebarJudul = doc.getTextWidth(teks);
    let kananGaris = lebar - M;
    if (catatan) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(...ABU);
      doc.text(catatan, lebar - M, y, { align: 'right' });
      kananGaris = lebar - M - doc.getTextWidth(catatan) - 3;
    }
    const kiriGaris = M + 9.4 + lebarJudul + 3;
    if (kananGaris > kiriGaris) {
      doc.setDrawColor(...UKIR);
      doc.setLineWidth(0.4);
      doc.line(kiriGaris, y - 1.2, kananGaris, y - 1.2);
    }
    y += 3.5;
  };

  /** Kartu angka: label kecil di atas, angka besar, keterangan di bawah. */
  const kartu = (
    x: number,
    atas: number,
    w: number,
    h: number,
    label: string,
    nilai: string,
    satuan: string,
    bawah: string,
    aksen: [number, number, number],
  ) => {
    doc.setFillColor(...KARTU);
    doc.roundedRect(x, atas, w, h, 1.8, 1.8, 'F');
    doc.setFillColor(...aksen);
    doc.roundedRect(x, atas, 1.6, h, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(...ABU);
    doc.text(label.toUpperCase(), x + 5, atas + 4.9);
    doc.setFontSize(15);
    doc.setTextColor(...aksen);
    doc.text(nilai, x + 5, atas + 11.9);
    const lebarNilai = doc.getTextWidth(nilai);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...ABU);
    doc.text(satuan, x + 6 + lebarNilai, atas + 11.9);
    doc.setFontSize(6.6);
    doc.setTextColor(...ABU_TUA);
    doc.text(bawah, x + 5, atas + 16.2);
  };

  /**
   * Grafik batang per minggu. Tiga batang tiap minggu — Booking ke atas,
   * Run Off dan Paid Off ke bawah — supaya langsung terlihat minggu mana yang
   * menambah portofolio dan minggu mana yang menggerusnya.
   */
  const grafikMinggu = (x: number, atas: number, w: number, h: number, data: AngkaProduk[]) => {
    const puncak = Math.max(
      1,
      ...data.map((d) => Math.max(d.booking, d.runOff + d.paidOff)),
    );
    const kolom = w / data.length;
    // Tiga baris keterangan disisakan di bawah: nilai, nama minggu, lalu Net.
    const ruangLabel = 14;
    const dasar = atas + (h - ruangLabel) * 0.6;
    const skalaAtas = dasar - atas - 6;
    const skalaBawah = atas + h - ruangLabel - dasar;

    doc.setDrawColor(228, 234, 243);
    doc.setLineWidth(0.3);
    doc.line(x, dasar, x + w, dasar);

    data.forEach((d, i) => {
      const tengah = x + kolom * i + kolom / 2;
      const lebarBatang = Math.min(9, kolom * 0.26);
      const kiri = tengah - lebarBatang - 1.2;
      const kanan = tengah + 1.2;

      const tB = (d.booking / puncak) * skalaAtas;
      const tR = (d.runOff / puncak) * skalaBawah;
      const tP = (d.paidOff / puncak) * skalaBawah;

      if (tB > 0.2) {
        doc.setFillColor(...BIRU);
        doc.roundedRect(kiri, dasar - tB, lebarBatang, tB, 0.6, 0.6, 'F');
      }
      if (tR > 0.2) {
        doc.setFillColor(...EMAS);
        doc.roundedRect(kanan, dasar, lebarBatang, tR, 0.6, 0.6, 'F');
      }
      if (tP > 0.2) {
        doc.setFillColor(214, 118, 60);
        doc.roundedRect(kanan, dasar + tR, lebarBatang, tP, 0.6, 0.6, 'F');
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.4);
      doc.setTextColor(...BIRU);
      if (d.booking > 0) doc.text(juta(d.booking), kiri + lebarBatang / 2, dasar - tB - 1.4, { align: 'center' });
      doc.setTextColor(160, 110, 20);
      if (d.runOff + d.paidOff > 0) {
        doc.text(juta(d.runOff + d.paidOff), kanan + lebarBatang / 2, dasar + tR + tP + 3, {
          align: 'center',
        });
      }

      const n = net(d);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.4);
      doc.setTextColor(...ABU);
      doc.text(`MINGGU ${isi.minggu[i].nomor}`, tengah, atas + h - 5.4, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.4);
      doc.setTextColor(...(n < 0 ? MERAH : HIJAU));
      doc.text(`${n < 0 ? '-' : '+'}${juta(Math.abs(n))}`, tengah, atas + h - 0.6, { align: 'center' });
    });
  };

  /**
   * Grafik kecil per unit: hanya Net tiap minggu, naik atau turun dari garis
   * nol. Gunanya melihat bentuknya saja — unit mana yang tumbuh, mana yang
   * tergerus — angka tepatnya tetap dibaca di tabel.
   */
  const grafikNetMini = (
    x: number,
    atas: number,
    w: number,
    h: number,
    data: AngkaProduk[],
    judul: string,
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...ABU_TUA);
    doc.text(judul, x, atas + 3);

    const nilai = data.map(net);
    const puncak = Math.max(1, ...nilai.map(Math.abs));
    const atasPlot = atas + 6;
    const tinggiPlot = h - 6 - 5;
    const nol = atasPlot + tinggiPlot / 2;
    const kolom = w / data.length;

    doc.setDrawColor(222, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(x, nol, x + w, nol);

    nilai.forEach((n, i) => {
      const tengah = x + kolom * i + kolom / 2;
      const lb = Math.min(10, kolom * 0.42);
      const t = (Math.abs(n) / puncak) * (tinggiPlot / 2 - 4);
      if (t > 0.2) {
        doc.setFillColor(...(n < 0 ? MERAH : HIJAU));
        if (n < 0) doc.roundedRect(tengah - lb / 2, nol, lb, t, 0.5, 0.5, 'F');
        else doc.roundedRect(tengah - lb / 2, nol - t, lb, t, 0.5, 0.5, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...(n < 0 ? MERAH : HIJAU));
      doc.text(juta(n), tengah, n < 0 ? nol + t + 2.6 : nol - t - 1.4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(...ABU);
      doc.text(`M${isi.minggu[i].nomor}`, tengah, atas + h, { align: 'center' });
    });
  };

  const legenda = (x: number, atas: number) => {
    const butir: [string, [number, number, number]][] = [
      ['Booking', BIRU],
      ['Run Off', EMAS],
      ['Paid Off', [214, 118, 60]],
    ];
    let kx = x;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    butir.forEach(([t, w]) => {
      doc.setFillColor(...w);
      doc.roundedRect(kx, atas - 2, 2.6, 2.6, 0.5, 0.5, 'F');
      doc.setTextColor(...ABU);
      doc.text(t, kx + 4, atas);
      kx += doc.getTextWidth(t) + 11;
    });
  };

  /* ------------------------------------------------------- 1. sorotan --- */
  const gabungan = isi.minggu.map((_, i) =>
    isi.unit.reduce((a, u) => tambah(a, totalMinggu(u, i)), kosong()),
  );
  const totalBulan = gabungan.reduce(tambah, kosong());
  const netBulan = net(totalBulan);

  judulBagian('Sorotan Bulan Ini', `${isi.unit.map((u) => u.label).join('  ·  ')}`);

  const jarak = 4;
  const wK = (isiLebar - jarak * 3) / 4;
  const hK = 18;
  kartu(M, y, wK, hK, 'Net Gabungan', miliar(netBulan), 'miliar', 'Booking dikurangi Run Off & Paid Off',
    netBulan < 0 ? MERAH : HIJAU);
  kartu(M + (wK + jarak), y, wK, hK, 'Booking', miliar(totalBulan.booking), 'miliar',
    `${isi.unit.reduce((a, u) => a + u.rencana.length, 0)} rencana pencairan`, BIRU);
  kartu(M + (wK + jarak) * 2, y, wK, hK, 'Run Off', miliar(totalBulan.runOff), 'miliar',
    'angsuran pokok jatuh tempo di periode ini', EMAS);
  kartu(M + (wK + jarak) * 3, y, wK, hK, 'Paid Off', miliar(totalBulan.paidOff), 'miliar',
    'kredit lunas di periode ini', [214, 118, 60]);
  y += hK + 7;

  /* ---------------------------------------------- 2. bentuk per minggu --- */
  judulBagian('Bentuk Pipeline per Minggu', 'nilai dalam juta rupiah · angka hijau/merah = Net');
  legenda(M + 2, y + 2);
  y += 4;
  grafikMinggu(M, y, isiLebar, 38, gabungan);
  y += 44;

  /* ------------------------------------------------ 3. net per unit --- */
  judulBagian('Net per Unit', 'dalam Miliar Rupiah, seperti tampilan portal');

  const barisRingkas = isi.unit.map((u) => {
    const perMinggu = isi.minggu.map((_, i) => net(totalMinggu(u, i)));
    return [u.label, ...perMinggu.map(miliar), miliar(perMinggu.reduce((a, b) => a + b, 0))];
  });

  const gayaDasar = {
    styles: { fontSize: 7.6, cellPadding: { top: 1.9, bottom: 1.9, left: 2.4, right: 2.4 }, halign: 'center' as const, valign: 'middle' as const, lineWidth: 0, textColor: ABU_TUA },
    headStyles: { fillColor: BIRU_TUA, textColor: [226, 237, 250] as [number, number, number], fontStyle: 'bold' as const, fontSize: 6.6, cellPadding: { top: 2.2, bottom: 2.2, left: 2.4, right: 2.4 } },
    alternateRowStyles: { fillColor: ZEBRA },
    rowPageBreak: 'avoid' as const,
    margin: { left: M, right: M, top: 22, bottom: 14 },
    didDrawPage: (d: any) => {
      pastikanKop();
      // Tabel yang pindah halaman diberi penanda, supaya kepala tabel yang
      // berdiri sendiri di halaman baru tidak membingungkan.
      if (d.pageNumber > 1 && judulAktif) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.4);
        doc.setTextColor(...ABU);
        doc.text(`${judulAktif} (lanjutan)`, M, 20.5);
      }
    },
  };

  autoTable(doc, {
    ...gayaDasar,
    startY: y,
    head: [['Unit', ...judulMinggu, 'TOTAL BULAN']],
    body: [
      ...barisRingkas,
      ['GABUNGAN', ...gabungan.map((g) => miliar(net(g))), miliar(netBulan)],
    ],
    theme: 'plain',
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 56 } },
    didParseCell: (d: any) => {
      if (d.section !== 'body') return;
      if (d.row.index === barisRingkas.length) {
        d.cell.styles.fillColor = [231, 239, 250];
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.column.index > 0) {
        const v = parseFloat(String(d.cell.raw).replace(/\./g, '').replace(',', '.'));
        if (v < 0) d.cell.styles.textColor = MERAH;
        else if (v > 0) d.cell.styles.textColor = HIJAU;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 9;

  /* ----------------------------------------- 3b. bentuk net per unit --- */
  if (isi.unit.length > 1) {
    ruangBaru(30);
    judulBagian('Bentuk Net per Unit', 'nilai dalam juta rupiah');
    const wG = (isiLebar - 10) / isi.unit.length;
    isi.unit.forEach((u, i) => {
      grafikNetMini(
        M + (wG + 10) * i,
        y,
        wG,
        26,
        isi.minggu.map((_, k) => totalMinggu(u, k)),
        u.label.toUpperCase(),
      );
    });
    y += 32;
  }

  /* ------------------------------------------- 4. angka portal per unit --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `Angka Portal — ${u.label}`,
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
            styles: {
              fillColor: [226, 234, 245],
              textColor: BIRU_TUA,
              fontStyle: 'bold',
              fontSize: 6.8,
              halign: 'left',
            },
          },
        ]);
      }
      const perMinggu = isi.minggu.map((_, i) =>
        b.produk.reduce((a, k) => tambah(a, u.angka[k][i]), kosong()),
      );
      const total = perMinggu.reduce(tambah, kosong());
      body.push([b.label, ...perMinggu.map((m) => rpKosong(net(m))), rpKosong(net(total))]);
    });
    const totalUnit = isi.minggu.map((_, i) => totalMinggu(u, i));
    const ringkas: [string, (m: AngkaProduk) => number][] = [
      ['TOTAL NET', net],
      ['Run Off (-)', (m) => m.runOff],
      ['Paid Off (-)', (m) => m.paidOff],
      ['Booking (+)', (m) => m.booking],
    ];
    ringkas.forEach(([label, ambil]) => {
      body.push([
        label,
        ...totalUnit.map((m) => rpKosong(ambil(m))),
        rpKosong(totalUnit.reduce((a, m) => a + ambil(m), 0)),
      ]);
    });

    autoTable(doc, {
      ...gayaDasar,
      startY: y,
      head: [['Produk', ...judulMinggu, 'TOTAL BULAN']],
      body,
      theme: 'plain',
      styles: { ...gayaDasar.styles, fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2.2, right: 2.2 } },
      columnStyles: { 0: { halign: 'left', cellWidth: 56 } },
      didParseCell: (d: any) => {
        const n = body.length;
        if (d.section !== 'body') return;
        if (d.cell.raw === '-') d.cell.styles.textColor = [185, 195, 208];
        if (d.row.index === n - 4) {
          d.cell.styles.fillColor = [231, 239, 250];
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.textColor = BIRU_TUA;
        }
        if (d.row.index > n - 4) {
          d.cell.styles.textColor = ABU;
          d.cell.styles.fontSize = 6.4;
          d.cell.styles.fillColor = [255, 255, 255];
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  });

  /* --------------------------------- 5. rincian Modal Kerja & Investasi --- */
  const adaRincian = isi.unit.some((u) => Object.keys(u.rincian).length > 0);
  if (adaRincian) {
    judulBagian(
      'Rincian Kredit Produktif — Modal Kerja vs Investasi',
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
          styles: {
            fillColor: [226, 234, 245],
            textColor: BIRU_TUA,
            fontStyle: 'bold',
            fontSize: 6.8,
            halign: 'left',
          },
        },
      ]);
      kunci.sort().forEach((k) => {
        const [produk, jenis] = k.split('|') as [KodeProduk, JenisProduktif];
        const perMinggu = u.rincian[k];
        const total = perMinggu.reduce(tambah, kosong());
        body.push([
          PRODUK_LABEL[produk],
          JENIS_LABEL[jenis],
          ...perMinggu.map((m) => rpKosong(net(m))),
          rpKosong(net(total)),
        ]);
      });
    });
    autoTable(doc, {
      ...gayaDasar,
      startY: y,
      head: [['Produk', 'Jenis', ...judulMinggu, 'TOTAL BULAN']],
      body,
      theme: 'plain',
      styles: { ...gayaDasar.styles, fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2.2, right: 2.2 } },
      columnStyles: {
        0: { halign: 'left', cellWidth: 42 },
        1: { halign: 'left', cellWidth: 32 },
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.cell.raw === '-') d.cell.styles.textColor = [185, 195, 208];
      },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  }

  /* --------------------------------------- 6. rencana pencairan per unit --- */
  isi.unit.forEach((u) => {
    judulBagian(
      `Rencana Pencairan (Booking) — ${u.label}`,
      u.rencana.length ? `${u.rencana.length} rencana` : 'belum ada rencana',
    );
    if (u.rencana.length === 0) {
      ruangBaru(14);
      doc.setFillColor(250, 250, 248);
      doc.roundedRect(M, y, isiLebar, 10, 1.6, 1.6, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.6);
      doc.setTextColor(...ABU);
      doc.text(
        'Belum ada rencana pencairan yang diinput untuk unit ini — Booking dihitung nol.',
        M + 5,
        y + 6.3,
      );
      y += 16;
      return;
    }
    autoTable(doc, {
      ...gayaDasar,
      startY: y,
      head: [['Nama Debitur', 'Produk', 'Rencana Cair', 'Minggu', 'Plafon (Rp)', 'Keterangan']],
      body: u.rencana.map((r) => {
        const mg = isi.minggu.find((m) => r.tanggal && r.tanggal >= m.mulai && r.tanggal <= m.selesai);
        return [
          r.nama,
          PRODUK_LABEL[r.produk] || '-',
          r.tanggal ? format(new Date(`${r.tanggal}T00:00:00`), 'dd/MM/yyyy') : '-',
          mg ? `Minggu ${mg.nomor}` : 'di luar periode',
          rp(r.plafon),
          r.keterangan || '-',
        ];
      }),
      foot: [[
        { content: 'TOTAL BOOKING', colSpan: 4, styles: { halign: 'right' } },
        rp(u.rencana.reduce((a, r) => a + r.plafon, 0)),
        '',
      ]],
      theme: 'plain',
      showFoot: 'lastPage' as const,
      footStyles: {
        fillColor: [231, 239, 250],
        textColor: BIRU_TUA,
        fontStyle: 'bold',
        fontSize: 7.4,
        lineWidth: 0,
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 52 },
        1: { halign: 'left', cellWidth: 46 },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'left' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 9;
  });

  /* ----------------------------------------------- 7. cara menghitungnya --- */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  const barisCatatan = isi.catatan.map((c) => doc.splitTextToSize(c, isiLebar - 16) as string[]);
  const tinggiCatatan =
    8 + barisCatatan.reduce((a, b) => a + b.length * 3.5, 0) + (barisCatatan.length - 1) * 1.6;
  ruangBaru(tinggiCatatan + 14);
  judulBagian('Cara Angka Ini Dihitung');
  doc.setFillColor(250, 250, 247);
  doc.roundedRect(M, y, isiLebar, tinggiCatatan, 1.8, 1.8, 'F');
  doc.setFillColor(...EMAS);
  doc.roundedRect(M, y, 1.4, tinggiCatatan, 0.7, 0.7, 'F');
  let yc = y + 5.6;
  barisCatatan.forEach((baris) => {
    doc.setFillColor(...EMAS);
    doc.circle(M + 6, yc - 1, 0.6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.4);
    doc.setTextColor(...ABU_TUA);
    baris.forEach((t, i) => doc.text(t, M + 9, yc + i * 3.5));
    yc += baris.length * 3.5 + 1.6;
  });

  /* ------------------------------------------------------------- kaki ---- */
  const halaman = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= halaman; i++) {
    doc.setPage(i);
    doc.setDrawColor(...UKIR);
    doc.setLineWidth(0.3);
    doc.line(M, tinggi - 9, lebar - M, tinggi - 9);
    gambarUkirPdf(doc, M, tinggi - 8.4, 5.2, [224, 233, 244]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(145, 155, 170);
    doc.text(
      'Bluebook Telihan  ·  bahan pengisian portal Weekly Pipeline — bukan laporan resmi',
      M + 7.4,
      tinggi - 4.6,
    );
    doc.text(`Halaman ${i} dari ${halaman}`, lebar - M, tinggi - 4.6, { align: 'right' });
  }

  return doc;
};
