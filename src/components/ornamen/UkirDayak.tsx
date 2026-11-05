/* -------------------------------------------------------------------------- */
/*  Ornamen ukir Dayak                                                        */
/*                                                                            */
/*  Motifnya gambar milik Haris sendiri; di sini cuma di-trace jadi vektor     */
/*  supaya tajam di layar maupun di cetakan dan bisa diwarnai mengikuti tema.  */
/*  Satu kuntum disimpan sebagai satu path tertutup di kotak 100×100,          */
/*  digambar dengan aturan isi evenodd agar lubang di tengah tetap berlubang.  */
/*                                                                            */
/*  Dipakai tiga tempat: siluet latar di sidebar, pola band di laporan PDF,    */
/*  dan aksen kecil di kop PDF. Karena itu semua memakai currentColor dan      */
/*  tidak pernah mengunci ukuran.                                             */
/* -------------------------------------------------------------------------- */

import React from 'react';

/** Satu kuntum ukir, dinormalkan ke kotak 100×100. */
const MOTIF_D =
  'M40.4 96.4C34.5 95.5 30.1 91.4 30.1 86.6C30.1 79.9 39.9 76.9 43.7 82.4' +
  'C45.5 84.9 44 87.6 40.8 87.5C39.5 87.5 39.1 87.3 39.8 86.9C42 85.7 40.9 83.1 38.1 83.1' +
  'C34.4 83.1 32.9 87.6 35.8 90.3C42.4 96.4 55.7 89.4 56 79.7L56.1 77.6L55.4 78.3' +
  'C52.5 80.9 49.7 81.5 46.6 79.9C44.2 78.7 43.3 75.1 45.2 73.7C45.7 73.4 46.2 74 46.2 74.8' +
  'C46.2 75.1 47.5 76.3 48 76.4C50.5 76.8 52.7 73.1 51.9 69.6C50.5 62.8 43.6 62.4 42.3 69' +
  'C42.1 70.1 42 70.2 41 69.8C39.6 69.2 38.6 67.6 38.3 65.4C37.9 63.2 38 63.4 37.2 63.5' +
  'C30.4 64.5 26.8 73 32.3 75C35.2 76.1 38.3 74.2 36.6 72.4C35.9 71.8 35.9 71.8 37.1 71.6' +
  'C38.8 71.4 39.9 72.7 39.9 74.8C39.9 77.3 38.1 78.6 34.4 78.8C27.6 79.1 24.7 76.1 24.9 69.2' +
  'L25 66.6L24.3 66.7C12.7 68.6 3.6 83.2 11.2 87.8C15.7 90.5 23.7 86.3 21.3 82.4' +
  'C20.1 80.3 16.1 81.4 16.8 83.7C17.1 84.9 15.1 84.2 14.6 83C13 79.1 19.5 75.8 23 78.7' +
  'C29.7 84.4 22.5 94.5 13 92.7C5.4 91.3 2.6 87.5 3.6 80.1C4.6 72 8.9 67 22.4 57.9L25 56.2' +
  'L23.4 56.2C17.8 56.1 10.5 52.9 7 49.1C5.1 47.1 4 45.2 2.8 41.6C0 33.6 5.8 24.8 11.8 27.9' +
  'C15.7 29.9 15.4 35.8 11.3 38.2C10.1 38.9 10.1 38.9 10.9 37.4C12.5 34.2 11.8 31.7 9.3 31.7' +
  'C5.3 31.7 5.2 39.6 9.2 43.4C11.8 45.9 19.3 48 25.9 48C28.5 48.1 28.5 48.1 27.8 47.1' +
  'C22.9 40 20.5 26.5 22.3 16.3C23.5 9.2 28 4.6 33.6 4.6C39.1 4.5 41.9 11.4 37.4 13.7' +
  'C36.7 14.1 36.7 14 36.8 13.1C37.5 8 31.3 7.3 28.8 12.3C26 18 27.7 29.5 32.4 36.5' +
  'C34 39 37.6 42.5 38.1 42.2C39.2 41.5 39.9 37.7 39.2 35.9C39.1 35.6 39.1 35.6 39.5 35.7' +
  'C41.6 36.4 43 38.2 43.1 40.5L43.2 41.7L43.9 41.4C48.4 39.1 49.8 32.1 46.2 29.8' +
  'C43.3 27.9 41.9 28.2 42 30.9C42 31.9 42 31.9 41.2 31.8C37.1 31.2 37.8 28.3 42.8 25.3' +
  'C47.6 22.4 52.5 25.4 54.1 32.1C54.2 32.7 55 32.4 57 31.1C64.5 26.2 67.5 12.3 61.4 10.5' +
  'C56.1 8.9 50.4 13.9 52.5 18.3C53.9 21.3 56.1 21.4 58.6 18.6L59.6 17.4L59.5 18.4' +
  'C59 23.7 56.2 25.1 51.2 22.5C42 17.7 49.9 2.4 60.1 5.5C70.7 8.8 73.1 17.6 66.5 29.3' +
  'C63.3 34.9 57.9 42 54.8 44.6C53.4 45.8 53.5 45.9 56.9 45.8C61.9 45.6 64.1 44.6 66.4 41.6' +
  'C69.6 37.3 69.7 35.2 66.7 34.8C65.6 34.7 65.8 34.5 68 33.9C72.8 32.5 74.3 34.8 72.2 40.4' +
  'L71.5 42.2L74.1 42.3C89.4 42.9 98.9 50.2 99.4 61.7C100 76.8 78.6 84.5 72.1 71.5' +
  'C69.1 65.7 71.5 59 76.7 58.7C81.2 58.5 82.9 61.7 79.2 63.5C77.5 64.3 76.6 64 76.1 62.5' +
  'C75.9 61.7 73.9 65 73.7 66.6C73.4 70.1 77.4 72.9 82.9 72.9C90.4 72.9 94.7 67.1 92.9 59.4' +
  'C90 46.7 74.8 45.3 55.9 55.9L53.5 57.2L54.8 58.4C58.4 61.9 62.1 61.3 64.7 56.7' +
  'C65.7 54.9 65.6 54.9 66.1 56C68.4 60.6 66.2 64.2 60.7 65C59.8 65.2 59.8 65.1 60.4 66.5' +
  'C63.5 74.9 63 81.5 58.7 89.3C55.8 94.7 48.2 97.6 40.4 96.4ZM43 60C47.1 58.5 48.6 53.4 46 50' +
  'C42.8 46 36.2 46.7 34.2 51.3C31.8 56.7 37.3 62.2 43 60ZM39.1 58.1C35.2 56.7 34.8 52.1 38.3 50.1' +
  'C41.2 48.5 45 50.7 45 53.9C45 56.8 41.8 59.1 39.1 58.1Z';

/** Satu kuntum ukir utuh, mengikuti warna teks di sekitarnya. */
export const UkirDayakKuntum: React.FC = () => (
  <path d={MOTIF_D} fill="currentColor" fillRule="evenodd" />
);

/**
 * Pola berulang. Susunannya setengah-langkah (half drop): satu kuntum di kotak
 * kiri atas, satu lagi digeser setengah ke kanan-bawah, persis seperti susunan
 * kain yang jadi acuan — jadi barisannya terbaca miring, bukan kaku berjajar.
 */
export const PolaUkirDayak: React.FC<{ id: string; ukuran?: number }> = ({ id, ukuran = 150 }) => {
  const s = ukuran / 100;
  return (
    <pattern id={id} width={ukuran} height={ukuran} patternUnits="userSpaceOnUse">
      {[
        [0.02, 0.02],
        [0.52, 0.52],
      ].map(([gx, gy]) => (
        <g key={`${gx}`} transform={`translate(${gx * ukuran} ${gy * ukuran}) scale(${s * 0.46})`}>
          <UkirDayakKuntum />
        </g>
      ))}
    </pattern>
  );
};

/**
 * Siluet latar — sangat samar, hanya terasa saat dilihat lekat. Murni hiasan,
 * jadi disembunyikan dari pembaca layar dan tidak menangkap klik.
 */
export const LatarUkirDayak: React.FC<{ className?: string; ukuran?: number }> = ({
  className,
  ukuran = 128,
}) => {
  const id = React.useId().replace(/:/g, '');
  return (
    <svg
      className={className}
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
    >
      <defs>
        <PolaUkirDayak id={`ukir-${id}`} ukuran={ukuran} />
      </defs>
      <rect width="100%" height="100%" fill={`url(#ukir-${id})`} />
    </svg>
  );
};

/** Satu kuntum sebagai gambar berdiri sendiri — untuk penanda atau hiasan kecil. */
export const UkirDayakIkon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 100 100" aria-hidden focusable="false">
    <UkirDayakKuntum />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Versi untuk PDF                                                           */
/*                                                                            */
/*  jsPDF tidak bisa membaca SVG, tapi bisa menggambar path lewat doc.path().  */
/*  Jadi path yang sama di atas dibaca sekali jadi daftar perintah gambar,     */
/*  lalu tiap pemakaian tinggal menggeser dan menskalakannya.                  */
/* -------------------------------------------------------------------------- */

type Perintah = { op: 'm' | 'l' | 'c' | 'h'; c: number[] };

const bacaPath = (d: string): Perintah[] => {
  const hasil: Perintah[] = [];
  const potongan: string[] = d.match(/[MCLZ][^MCLZ]*/g) ?? [];
  potongan.forEach((p) => {
    const huruf = p[0];
    if (huruf === 'Z') {
      hasil.push({ op: 'h', c: [] });
      return;
    }
    const angka = (p.slice(1).match(/-?\d*\.?\d+/g) || []).map(Number);
    hasil.push({ op: huruf === 'M' ? 'm' : huruf === 'L' ? 'l' : 'c', c: angka });
  });
  return hasil;
};

const PERINTAH = bacaPath(MOTIF_D);

/** Daftar perintah gambar untuk jsPDF, sudah digeser dan diskalakan. */
export const motifPdf = (skala: number, geserX: number, geserY: number): Perintah[] =>
  PERINTAH.map(({ op, c }) => ({
    op,
    c: c.map((n, i) => (i % 2 === 0 ? geserX + n * skala : geserY + n * skala)),
  }));

/** Gambar satu kuntum ukir di PDF. `doc` adalah instance jsPDF. */
export const gambarUkirPdf = (
  doc: any,
  x: number,
  y: number,
  ukuran: number,
  warna: [number, number, number],
) => {
  doc.setFillColor(...warna);
  doc.path(motifPdf(ukuran / 100, x, y));
  doc.fillEvenOdd();
};

/**
 * Pita pola ukir untuk PDF: kuntum disusun setengah-langkah di dalam kotak
 * yang ditentukan, dan yang keluar kotak dipotong lewat clipping.
 */
export const gambarPitaUkirPdf = (
  doc: any,
  x: number,
  y: number,
  lebar: number,
  tinggi: number,
  ukuran: number,
  warna: [number, number, number],
) => {
  doc.saveGraphicsState();
  doc.rect(x, y, lebar, tinggi, null);
  doc.clip();
  doc.discardPath();
  doc.setFillColor(...warna);
  const langkah = ukuran * 1.2;
  for (let by = y - langkah / 2; by < y + tinggi; by += langkah) {
    for (let bx = x - langkah / 2; bx < x + lebar; bx += langkah) {
      doc.path(motifPdf(ukuran / 100, bx, by));
      doc.fillEvenOdd();
      doc.path(motifPdf(ukuran / 100, bx + langkah / 2, by + langkah / 2));
      doc.fillEvenOdd();
    }
  }
  doc.restoreGraphicsState();
};

export default UkirDayakKuntum;
