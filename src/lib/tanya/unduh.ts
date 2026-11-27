// Tanya Bluebook — unduh jawaban tabel sebagai Excel atau PDF.
// Library dimuat saat tombol ditekan supaya pop up tetap ringan.
// Izin unduh tetap mengikuti penjaga export (hanya Admin & Pemimpin).

import { rp, tgl, persen, type JawabTabel, type Kolom, type Lencana } from './jawaban';

const nilaiMentah = (k: Kolom, v: unknown): string | number => {
  if (v === null || v === undefined) return '';
  switch (k.jenis) {
    case 'uang':
    case 'angka':
      return Number(v) || 0;
    case 'persen':
      return Math.round((Number(v) || 0) * 10) / 10;
    case 'tanggal':
      return tgl(String(v));
    case 'lencana':
    case 'kol':
      return (v as Lencana)?.teks ?? '';
    default:
      return String(v);
  }
};

const nilaiTeks = (k: Kolom, v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—';
  switch (k.jenis) {
    case 'uang':
      return rp(Number(v));
    case 'angka':
      return (Number(v) || 0).toLocaleString('id-ID');
    case 'persen':
      return persen(Number(v) || 0, 0);
    case 'tanggal':
      return tgl(String(v));
    case 'lencana':
    case 'kol':
      return (v as Lencana)?.teks ?? '';
    default:
      return String(v);
  }
};

const kolomPakai = (t: JawabTabel) => t.kolom.filter((k) => k.label);

export async function unduhExcel(t: JawabTabel) {
  const XLSX = await import('xlsx');
  const kol = kolomPakai(t);
  const data = t.baris.map((b) => {
    const o: Record<string, string | number> = {};
    for (const k of kol) {
      o[k.label] = nilaiMentah(k, b[k.kunci]);
      if (k.sub && b[k.sub]) o[`${k.label} (keterangan)`] = String(b[k.sub]);
    }
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tanya Bluebook');
  XLSX.writeFile(wb, `${t.namaFile}.xlsx`);
}

export async function unduhPdf(t: JawabTabel) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const kol = kolomPakai(t);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(10, 53, 88);
  doc.text(t.judul, 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(90, 105, 125);
  const sub = [t.angkaUtama, t.keterangan].filter(Boolean).join(' · ');
  if (sub) doc.text(sub, 14, 22);
  if (t.ringkas?.length) doc.text(t.ringkas.map((r) => `${r.label}: ${r.nilai}`).join('   ·   '), 14, 27);
  autoTable(doc, {
    startY: t.ringkas?.length ? 31 : 26,
    head: [kol.map((k) => k.label)],
    body: t.baris.map((b) =>
      kol.map((k) => {
        const utama = nilaiTeks(k, b[k.kunci]);
        return k.sub && b[k.sub] ? `${utama}\n${String(b[k.sub])}` : utama;
      }),
    ),
    styles: { fontSize: 8.5, cellPadding: 2, valign: 'top' },
    headStyles: { fillColor: [10, 80, 138], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    margin: { left: 14, right: 14 },
  });
  const akhirY = (doc as any).lastAutoTable?.finalY ?? 40;
  doc.setFontSize(8);
  doc.setTextColor(120, 130, 145);
  (t.catatan ?? []).forEach((c, i) => doc.text(doc.splitTextToSize(c, 265), 14, akhirY + 7 + i * 5));
  const tinggi = doc.internal.pageSize.getHeight();
  const halaman = doc.getNumberOfPages();
  for (let i = 1; i <= halaman; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 160, 170);
    doc.text(`Tanya Bluebook · Bluebook Telihan · dicetak ${tgl(new Date().toISOString())}`, 14, tinggi - 7);
    doc.text(`${i}/${halaman}`, 283, tinggi - 7, { align: 'right' });
  }
  doc.save(`${t.namaFile}.pdf`);
}

export { nilaiTeks };
