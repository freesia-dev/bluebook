/* -------------------------------------------------------------------------- */
/*  Ornamen ukir Dayak                                                        */
/*                                                                            */
/*  Digambar sendiri dari kosakata bentuk ukir Dayak yang memang milik         */
/*  bersama: satu mata di tengah, lalu empat sulur yang tumbuh memutar dan     */
/*  berakhir sebagai lingkaran rapat. Simetri putar empat arah dibuat dengan   */
/*  menggambar satu sulur lalu memutarnya 90°, 180°, dan 270° — supaya         */
/*  bentuknya betul-betul seimbang, bukan kira-kira.                           */
/*                                                                            */
/*  Dipakai dua tempat: siluet samar di sidebar dan aksen di laporan PDF.      */
/*  Karena itu semuanya memakai currentColor dan tanpa ukuran tetap.           */
/* -------------------------------------------------------------------------- */

import React from 'react';

/** Satu sulur, digambar di kotak 100×100 dengan mata di titik (50,50). */
const SULUR = 'M50 42 C 62 30, 80 30, 85 42 C 89 52, 80 60, 73 55 C 67 51, 70 43, 77 45';

const PUTARAN = [0, 90, 180, 270];

/** Satu kuntum ukir utuh. */
export const UkirDayakKuntum: React.FC<{ tebal?: number }> = ({ tebal = 3.2 }) => (
  <g>
    <g fill="none" stroke="currentColor" strokeWidth={tebal} strokeLinecap="round">
      {PUTARAN.map((sudut) => (
        <path key={sudut} d={SULUR} transform={sudut ? `rotate(${sudut} 50 50)` : undefined} />
      ))}
    </g>
    <circle cx="50" cy="50" r="5.5" fill="none" stroke="currentColor" strokeWidth={tebal * 0.9} />
    <circle cx="50" cy="50" r="1.6" fill="currentColor" />
  </g>
);

/** Pola berulang: satu kuntum digambar sekali lalu diulang oleh browser. */
export const PolaUkirDayak: React.FC<{ id: string; ukuran?: number }> = ({ id, ukuran = 150 }) => (
  <pattern id={id} width={ukuran} height={ukuran} patternUnits="userSpaceOnUse">
    <g transform={`scale(${ukuran / 100})`}>
      <UkirDayakKuntum />
      {/* titik kecil di sela kuntum, seperti isen-isen pada kain */}
      {[
        [0, 0],
        [100, 0],
        [0, 100],
        [100, 100],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.6" fill="currentColor" />
      ))}
    </g>
  </pattern>
);

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
export const UkirDayakIkon: React.FC<{ className?: string; tebal?: number }> = ({
  className,
  tebal,
}) => (
  <svg className={className} viewBox="0 0 100 100" aria-hidden focusable="false">
    <UkirDayakKuntum tebal={tebal} />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*  Versi untuk PDF                                                           */
/*                                                                            */
/*  jsPDF tidak bisa menggambar SVG, jadi sulur yang sama diberikan sebagai    */
/*  titik-titik kendali Bézier. Perputaran 90° dihitung sendiri di sini, lalu  */
/*  diubah ke bentuk relatif yang diminta jsPDF.lines().                       */
/* -------------------------------------------------------------------------- */

type Titik = [number, number];

/** Titik kendali SULUR di atas, dalam koordinat mutlak kotak 100×100. */
const SULUR_PDF: { awal: Titik; kurva: [Titik, Titik, Titik][] } = {
  awal: [50, 42],
  kurva: [
    [[62, 30], [80, 30], [85, 42]],
    [[89, 52], [80, 60], [73, 55]],
    [[67, 51], [70, 43], [77, 45]],
  ],
};

const putar = ([x, y]: Titik, derajat: number): Titik => {
  const r = (derajat * Math.PI) / 180;
  const dx = x - 50;
  const dy = y - 50;
  return [50 + dx * Math.cos(r) - dy * Math.sin(r), 50 + dx * Math.sin(r) + dy * Math.cos(r)];
};

/**
 * Daftar sulur siap gambar untuk jsPDF. Tiap sulur berisi titik awal dan
 * deretan segmen Bézier relatif — bentuk yang diminta `doc.lines()`.
 */
export const sulurPdf = (
  skala = 1,
  geserX = 0,
  geserY = 0,
): { awal: Titik; segmen: number[][] }[] =>
  PUTARAN.map((sudut) => {
    const petakan = (t: Titik): Titik => {
      const [x, y] = putar(t, sudut);
      return [geserX + x * skala, geserY + y * skala];
    };
    const awal = petakan(SULUR_PDF.awal);
    let kini = awal;
    const segmen: number[][] = [];
    SULUR_PDF.kurva.forEach(([k1, k2, akhir]) => {
      const a = petakan(k1);
      const b = petakan(k2);
      const c = petakan(akhir);
      segmen.push([a[0] - kini[0], a[1] - kini[1], b[0] - kini[0], b[1] - kini[1], c[0] - kini[0], c[1] - kini[1]]);
      kini = c;
    });
    return { awal, segmen };
  });

/** Gambar satu kuntum ukir di PDF. `doc` adalah instance jsPDF. */
export const gambarUkirPdf = (
  doc: any,
  x: number,
  y: number,
  ukuran: number,
  warna: [number, number, number],
  tebal = 0.6,
) => {
  const skala = ukuran / 100;
  doc.setDrawColor(...warna);
  doc.setFillColor(...warna);
  doc.setLineWidth(tebal);
  doc.setLineCap('round');
  sulurPdf(skala, x, y).forEach(({ awal, segmen }) => {
    doc.lines(segmen, awal[0], awal[1], [1, 1], 'S', false);
  });
  doc.circle(x + 50 * skala, y + 50 * skala, 5.5 * skala, 'S');
  doc.circle(x + 50 * skala, y + 50 * skala, 1.6 * skala, 'F');
};

export default UkirDayakKuntum;
