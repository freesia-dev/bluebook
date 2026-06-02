import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useSaveLoanSimulation } from '@/hooks/use-loan-calc';
import { calcAmortization, calcPotongan, calcPelunasan, fmtRp, fmtNumber } from '@/lib/loan-calc';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import {
  Save, Download, FileText, History, Briefcase, Building2, TrendingUp,
  Wallet, ShieldCheck, AlertTriangle, Factory, Landmark,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/contexts/AuthContext';
import logoBpd from '@/assets/logo-bankaltimtara.png';

const JENIS_USAHA = [
  'Perdagangan Eceran', 'Perdagangan Grosir', 'Kuliner / F&B', 'Jasa',
  'Pertanian', 'Perkebunan', 'Perikanan', 'Peternakan',
  'Industri / Manufaktur', 'Konstruksi', 'Transportasi', 'Lainnya',
];

const JENIS_AGUNAN = [
  'Tanah & Bangunan (SHM)', 'Tanah & Bangunan (SHGB)', 'Tanah Kosong',
  'Kendaraan (BPKB Mobil)', 'Kendaraan (BPKB Motor)', 'Deposito', 'Tanpa Agunan',
];

const KalkulatorProduktifPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const save = useSaveLoanSimulation();

  // Debitur & Usaha
  const [nomorKtp, setNomorKtp] = useState('');
  const [namaDebitur, setNamaDebitur] = useState('');
  const [namaUsaha, setNamaUsaha] = useState('');
  const [jenisUsaha, setJenisUsaha] = useState('');
  const [alamatUsaha, setAlamatUsaha] = useState('');
  const [lamaUsahaTahun, setLamaUsahaTahun] = useState('');
  const [namaAo, setNamaAo] = useState('');

  // Keuangan Usaha (bulanan)
  const [omzetStr, setOmzetStr] = useState('');
  const [hppStr, setHppStr] = useState('');
  const [biayaOpStr, setBiayaOpStr] = useState('');
  const [biayaPribadiStr, setBiayaPribadiStr] = useState('');

  // Pinjaman (skema dikunci ke MENURUN / efektif — pokok tetap, bunga dari saldo, angsuran turun tiap bulan)
  const [plafonStr, setPlafonStr] = useState('');
  const [tenor, setTenor] = useState('36');
  const [tanggalAkad, setTanggalAkad] = useState(() => new Date().toISOString().slice(0, 10));
  const [bunga, setBunga] = useState('12');

  // Biaya
  const [asuransiStr, setAsuransiStr] = useState('');
  const [provisi, setProvisi] = useState('1');
  const [notarisStr, setNotarisStr] = useState('');
  const [perikatanStr, setPerikatanStr] = useState('');
  const [blokir, setBlokir] = useState('0');

  // Agunan
  const [jenisAgunan, setJenisAgunan] = useState('Tanah & Bangunan (SHM)');
  const [nilaiPasarStr, setNilaiPasarStr] = useState('');
  const [nilaiLikuidasiStr, setNilaiLikuidasiStr] = useState('');

  // Pelunasan dipercepat
  const [adaPelunasan, setAdaPelunasan] = useState(false);
  const [pelunasanBulan, setPelunasanBulan] = useState('12');

  // Parse
  const plafon = parseCurrencyValue(plafonStr);
  const tenorBulan = parseInt(tenor) || 0;
  const bungaPa = parseFloat(bunga) || 0;
  const omzet = parseCurrencyValue(omzetStr);
  const hpp = parseCurrencyValue(hppStr);
  const biayaOp = parseCurrencyValue(biayaOpStr);
  const biayaPribadi = parseCurrencyValue(biayaPribadiStr);
  const labaKotor = omzet - hpp;
  const labaBersihUsaha = labaKotor - biayaOp;
  const labaBersihKeluarga = labaBersihUsaha - biayaPribadi;
  const marginPct = omzet > 0 ? (labaBersihUsaha / omzet) * 100 : 0;
  const nilaiPasar = parseCurrencyValue(nilaiPasarStr);
  const nilaiLikuidasi = parseCurrencyValue(nilaiLikuidasiStr);
  const ltvPasar = nilaiPasar > 0 ? (plafon / nilaiPasar) * 100 : 0;
  const ltvLikuidasi = nilaiLikuidasi > 0 ? (plafon / nilaiLikuidasi) * 100 : 0;

  const result = useMemo(() => {
    if (plafon <= 0 || tenorBulan <= 0) return null;
    // Skema MENURUN (KUR): pokok tetap (P/n), bunga dari saldo sisa, angsuran turun tiap bulan.
    // Sesuai sheet "Sliding" pada template AMORTISASI.
    return calcAmortization({ plafon, tenorBulan, bungaPa, skema: 'efektif', tanggalAkad });
  }, [plafon, tenorBulan, bungaPa, tanggalAkad]);

  const potongan = useMemo(() => {
    if (!result) return null;
    return calcPotongan({
      plafon,
      asuransiNominal: parseCurrencyValue(asuransiStr),
      provisiPct: parseFloat(provisi) || 0,
      biayaNotaris: parseCurrencyValue(notarisStr),
      biayaPerikatan: parseCurrencyValue(perikatanStr),
      blokirAngsuran: parseInt(blokir) || 0,
      angsuranPertama: result.summary.angsuranPertama,
    });
  }, [result, plafon, asuransiStr, provisi, notarisStr, perikatanStr, blokir]);

  const pelunasan = useMemo(() => {
    if (!result || !adaPelunasan) return null;
    return calcPelunasan(result.rows, parseInt(pelunasanBulan) || 0);
  }, [result, adaPelunasan, pelunasanBulan]);

  // RPC / DSCR untuk produktif
  const angsuranPertama = result?.summary.angsuranPertama ?? 0;
  const rpcPct = labaBersihKeluarga > 0 ? (angsuranPertama / labaBersihKeluarga) * 100 : 0;
  const dscr = angsuranPertama > 0 ? labaBersihUsaha / angsuranPertama : 0;

  const rpcStatus =
    rpcPct === 0 ? { label: '—', color: 'bg-muted text-foreground' }
    : rpcPct <= 60 ? { label: 'AMAN', color: 'bg-emerald-600 text-white' }
    : rpcPct <= 75 ? { label: 'WASPADA', color: 'bg-amber-500 text-white' }
    : { label: 'RISIKO', color: 'bg-rose-600 text-white' };

  const dscrStatus =
    dscr === 0 ? { label: '—', color: 'bg-muted text-foreground' }
    : dscr >= 1.5 ? { label: 'KUAT', color: 'bg-emerald-600 text-white' }
    : dscr >= 1.2 ? { label: 'CUKUP', color: 'bg-amber-500 text-white' }
    : { label: 'LEMAH', color: 'bg-rose-600 text-white' };

  const handleSimpan = async () => {
    if (!namaDebitur || !result || !potongan) {
      toast({ title: 'Lengkapi nama debitur & parameter pinjaman', variant: 'destructive' });
      return;
    }
    try {
      await save.mutateAsync({
        nomor_ktp: nomorKtp || null,
        nama_debitur: namaDebitur,
        tanggal_lahir: null,
        jenis_kelamin: null,
        pekerjaan: namaUsaha || null,
        instansi: jenisUsaha || null,
        pilihan_karir: 'Wiraswasta / Produktif',
        product_id: null,
        product_nama: 'Kredit Produktif (Menurun / KUR)',
        skema: 'efektif',
        plafon,
        tenor_bulan: tenorBulan,
        tanggal_akad: tanggalAkad || null,
        gaji: labaBersihKeluarga,
        bunga_pa: bungaPa,
        asuransi_provider: 'manual',
        asuransi_nominal: parseCurrencyValue(asuransiStr),
        asuransi_pct: 0,
        provisi_pct: parseFloat(provisi) || 0,
        biaya_notaris: parseCurrencyValue(notarisStr),
        biaya_perikatan: parseCurrencyValue(perikatanStr),
        blokir_angsuran: parseInt(blokir) || 0,
        ada_pelunasan: adaPelunasan,
        pelunasan_bulan_ke: adaPelunasan ? parseInt(pelunasanBulan) || null : null,
        nama_ao: namaAo || null,
        hasil_ringkasan: {
          ...result.summary,
          ...potongan,
          usaha: { omzet, hpp, biayaOp, biayaPribadi, labaBersihUsaha, labaBersihKeluarga, marginPct, dscr, rpcPct },
          agunan: { jenisAgunan, nilaiPasar, nilaiLikuidasi, ltvPasar, ltvLikuidasi },
        } as any,
        tabel_angsuran: result.rows,
      } as any);
      toast({ title: 'Simulasi produktif tersimpan' });
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    if (!result || !potongan) return;
    const wb = XLSX.utils.book_new();
    const ringkasan: any[][] = [
      ['SIMULASI KREDIT PRODUKTIF (MENURUN / KUR)'],
      [],
      ['— Debitur & Usaha —'],
      ['Nama Debitur', namaDebitur],
      ['Nomor KTP', nomorKtp],
      ['Nama Usaha', namaUsaha],
      ['Jenis Usaha', jenisUsaha],
      ['Alamat Usaha', alamatUsaha],
      ['Lama Usaha (tahun)', lamaUsahaTahun],
      [],
      ['— Keuangan Usaha (per bulan) —'],
      ['Omzet', omzet],
      ['HPP / Biaya Pokok', hpp],
      ['Laba Kotor', labaKotor],
      ['Biaya Operasional', biayaOp],
      ['Laba Bersih Usaha', labaBersihUsaha],
      ['Biaya Pribadi/Keluarga', biayaPribadi],
      ['Laba Bersih Keluarga', labaBersihKeluarga],
      ['Margin (%)', marginPct.toFixed(2) + '%'],
      [],
      ['— Pinjaman —'],
      ['Plafon', plafon],
      ['Tenor (bulan)', tenorBulan],
      ['Bunga p.a.', `${bungaPa}%`],
      ['Tanggal Akad', tanggalAkad],
      ['Skema', 'MENURUN (KUR) — pokok tetap, bunga dari saldo'],
      [],
      ['— Hasil —'],
      ['Angsuran Bulan ke-1 (tertinggi)', result.summary.angsuranPertama],
      ['Angsuran Bulan ke-' + tenorBulan + ' (terendah)', result.summary.angsuranTerakhir],
      ['Total Angsuran', result.summary.totalAngsuran],
      ['Total Bunga', result.summary.totalBunga],
      ['Total Potongan', potongan.total],
      ['Dana Diterima', potongan.danaDiterima],
      ['DSCR', dscr.toFixed(2) + 'x'],
      ['RPC (%)', rpcPct.toFixed(2) + '%'],
      [],
      ['— Agunan —'],
      ['Jenis Agunan', jenisAgunan],
      ['Nilai Pasar', nilaiPasar],
      ['Nilai Likuidasi', nilaiLikuidasi],
      ['LTV Pasar (%)', ltvPasar.toFixed(2) + '%'],
      ['LTV Likuidasi (%)', ltvLikuidasi.toFixed(2) + '%'],
      [],
      ['Nama AO', namaAo],
    ];
    if (pelunasan) {
      ringkasan.push([], [`— Pelunasan Bulan ke-${pelunasan.bulanKe} —`],
        ['Sisa Pokok', pelunasan.sisaPokok],
        ['Bunga Berjalan', pelunasan.bungaBerjalan],
        ['Total Pelunasan', pelunasan.totalPelunasan]);
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');
    const ang = result.rows.map((r) => ({
      No: r.bulan, Tanggal: r.tanggal, Pokok: r.pokok, Bunga: r.bunga,
      Angsuran: r.angsuran, 'Saldo Pokok': r.saldo,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ang), 'Tabel Angsuran');
    XLSX.writeFile(wb, `Simulasi_Produktif_${namaDebitur || 'Loan'}_${Date.now()}.xlsx`);
  };

  const handleExportPdf = async () => {
    if (!result || !potongan) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 14;
    const BRAND_GREEN: [number, number, number] = [21, 128, 61];
    const BRAND_BLUE: [number, number, number] = [0, 63, 127];
    const BRAND_ORANGE: [number, number, number] = [245, 130, 32];
    const TEXT_DARK: [number, number, number] = [30, 41, 59];

    const drawWatermark = () => {
      const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.06 }) : null;
      if (gState) (doc as any).setGState(gState);
      doc.setTextColor(...BRAND_GREEN);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const stepX = 48, stepY = 24;
      for (let row = 0; row * stepY < pageH + stepY; row++) {
        const offset = (row % 2) * (stepX / 2);
        for (let col = -1; col * stepX - offset < pageW + stepX; col++) {
          doc.text('PRODUKTIF · SIMULASI', col * stepX - offset, row * stepY, { angle: 30 });
        }
      }
      const gReset = (doc as any).GState ? new (doc as any).GState({ opacity: 1 }) : null;
      if (gReset) (doc as any).setGState(gReset);
    };
    (doc as any).internal.events.subscribe('addPage', drawWatermark);
    drawWatermark();

    try {
      const logoData = await fetch(logoBpd).then((r) => r.blob()).then(
        (b) => new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(b);
        })
      );
      const props = (doc as any).getImageProperties(logoData);
      const logoH = 14;
      const logoW = (props.width / props.height) * logoH;
      doc.addImage(logoData, 'PNG', M, M + 2, logoW, logoH);
    } catch {}

    const kopX = M + 34;
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PT. BPD Kalimantan Timur & Kalimantan Utara', kopX, M + 5);
    doc.setFontSize(10.5);
    doc.text('Kantor Cabang Pembantu Telihan', kopX, M + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Jl. Letjend S. Parman No. 14-15, Bontang 75383  ·  Telp. 0548-26567', kopX, M + 14.5);
    doc.text('kcp.telihan@bankaltimtara.co.id  ·  bankaltimtara.co.id', kopX, M + 18);
    doc.setFillColor(...BRAND_GREEN);
    doc.rect(M, M + 21, pageW - 2 * M, 1.2, 'F');
    doc.setFillColor(...BRAND_ORANGE);
    doc.rect(M, M + 22.4, pageW - 2 * M, 0.5, 'F');

    let y = M + 30;
    doc.setTextColor(...BRAND_GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SIMULASI KREDIT PRODUKTIF (MENURUN / KUR)', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`,
      pageW / 2, y, { align: 'center' }
    );

    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.2, textColor: TEXT_DARK },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 36 }, 1: { cellWidth: 3 }, 2: { cellWidth: 50 },
        3: { cellWidth: 6 }, 4: { fontStyle: 'bold', cellWidth: 36 }, 5: { cellWidth: 3 }, 6: { cellWidth: 'auto' },
      },
      body: [
        ['Nama Debitur', ':', namaDebitur || '-', '', 'Nama Usaha', ':', namaUsaha || '-'],
        ['Nomor KTP', ':', nomorKtp || '-', '', 'Jenis Usaha', ':', jenisUsaha || '-'],
        ['Nama AO', ':', namaAo || '-', '', 'Lama Usaha', ':', lamaUsahaTahun ? `${lamaUsahaTahun} tahun` : '-'],
        ['Tanggal Akad', ':', new Date(tanggalAkad).toLocaleDateString('id-ID'), '', 'Alamat Usaha', ':', alamatUsaha || '-'],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // Section bars
    const sectionBar = (label: string) => {
      doc.setFillColor(...BRAND_GREEN);
      doc.rect(M, y, pageW - 2 * M, 5.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(label, M + 2, y + 3.8);
      y += 7;
    };

    sectionBar('ANALISA KEUANGAN USAHA (per bulan)');
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: TEXT_DARK },
      headStyles: { fillColor: [240, 253, 244], textColor: TEXT_DARK, fontStyle: 'bold' },
      head: [['Komponen', 'Nominal (Rp)']],
      columnStyles: { 1: { halign: 'right' } },
      body: [
        ['Omzet / Penjualan', fmtNumber(omzet)],
        ['HPP / Biaya Pokok', '(' + fmtNumber(hpp) + ')'],
        [{ content: 'Laba Kotor', styles: { fontStyle: 'bold' } }, { content: fmtNumber(labaKotor), styles: { fontStyle: 'bold', halign: 'right' } }],
        ['Biaya Operasional', '(' + fmtNumber(biayaOp) + ')'],
        [{ content: 'Laba Bersih Usaha', styles: { fontStyle: 'bold' } }, { content: fmtNumber(labaBersihUsaha), styles: { fontStyle: 'bold', halign: 'right' } }],
        ['Biaya Pribadi/Keluarga', '(' + fmtNumber(biayaPribadi) + ')'],
        [{ content: 'Laba Bersih Keluarga', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
         { content: fmtNumber(labaBersihKeluarga), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] } }],
        ['Margin Usaha', marginPct.toFixed(2) + '%'],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    sectionBar('SIMULASI PINJAMAN — SKEMA MENURUN (KUR / Sliding Excel)');
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: TEXT_DARK },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 }, 1: { halign: 'right' } },
      body: [
        ['Plafon', fmtRp(plafon)],
        ['Tenor', `${tenorBulan} bulan`],
        ['Bunga p.a.', `${bungaPa}% (efektif dari saldo)`],
        ['Pokok / Bulan (tetap)', fmtRp(Math.round(plafon / tenorBulan))],
        [{ content: `Angsuran Bulan ke-1 (tertinggi)`, styles: { fillColor: [240, 253, 244], fontStyle: 'bold' } },
         { content: fmtRp(result.summary.angsuranPertama), styles: { fillColor: [240, 253, 244], fontStyle: 'bold', halign: 'right' } }],
        [{ content: `Angsuran Bulan ke-${tenorBulan} (terendah)`, styles: { fillColor: [240, 253, 244], fontStyle: 'bold' } },
         { content: fmtRp(result.summary.angsuranTerakhir), styles: { fillColor: [240, 253, 244], fontStyle: 'bold', halign: 'right' } }],
        ['Total Angsuran', fmtRp(result.summary.totalAngsuran)],
        ['Total Bunga', fmtRp(result.summary.totalBunga)],
      ],
    });
    y = (doc as any).lastAutoTable.finalY + 4;

    // 2 column: Potongan + Kelayakan/Agunan
    const halfW = (pageW - 2 * M - 4) / 2;
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: pageW - M - halfW },
      tableWidth: halfW,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: 'bold' },
      head: [['POTONGAN DI MUKA', '']],
      columnStyles: { 1: { halign: 'right' } },
      body: [
        ['Asuransi', fmtRp(potongan.asuransi)],
        [`Provisi ${parseFloat(provisi) || 0}%`, fmtRp(potongan.provisi)],
        ['Notaris', fmtRp(potongan.notaris)],
        ['Perikatan', fmtRp(potongan.perikatan)],
        ['Blokir Angsuran', fmtRp(potongan.blokir)],
        [{ content: 'Total Potongan', styles: { fontStyle: 'bold' } }, { content: fmtRp(potongan.total), styles: { fontStyle: 'bold', halign: 'right' } }],
        [{ content: 'Dana Diterima', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
         { content: fmtRp(potongan.danaDiterima), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] } }],
      ],
    });
    const yLeft = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
      startY: y,
      margin: { left: M + halfW + 4, right: M },
      tableWidth: halfW,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: 'bold' },
      head: [['KELAYAKAN & AGUNAN', '']],
      columnStyles: { 1: { halign: 'right' } },
      body: [
        ['DSCR (Laba Usaha / Angsuran)', dscr.toFixed(2) + 'x'],
        ['RPC (Angsuran / Laba Keluarga)', rpcPct.toFixed(2) + '%'],
        ['Status Kelayakan', `${rpcStatus.label} / ${dscrStatus.label}`],
        ['Jenis Agunan', jenisAgunan],
        ['Nilai Pasar', fmtRp(nilaiPasar)],
        ['Nilai Likuidasi', fmtRp(nilaiLikuidasi)],
        ['LTV Pasar', ltvPasar.toFixed(2) + '%'],
        ['LTV Likuidasi', ltvLikuidasi.toFixed(2) + '%'],
      ],
    });
    const yRight = (doc as any).lastAutoTable.finalY;
    y = Math.max(yLeft, yRight) + 4;

    if (pelunasan) {
      sectionBar(`SIMULASI PELUNASAN DIPERCEPAT — Bulan ke-${pelunasan.bulanKe}`);
      autoTable(doc, {
        startY: y,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 1.5, textColor: TEXT_DARK },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 52 }, 1: { halign: 'right' } },
        body: [
          ['Sisa Pokok', fmtRp(pelunasan.sisaPokok)],
          ['Bunga Berjalan', fmtRp(pelunasan.bungaBerjalan)],
          [{ content: 'Total Pelunasan', styles: { fontStyle: 'bold', fillColor: [240, 253, 244] } },
           { content: fmtRp(pelunasan.totalPelunasan), styles: { fontStyle: 'bold', halign: 'right', fillColor: [240, 253, 244] } }],
        ],
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    // Tabel angsuran (page baru)
    doc.addPage();
    y = M;
    doc.setTextColor(...BRAND_GREEN);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TABEL ANGSURAN (${result.rows.length} bulan) — Menurun / KUR`, M, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 1.2 },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255 },
      head: [['No', 'Tanggal', 'Pokok', 'Bunga', 'Angsuran', 'Saldo Pokok']],
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 28 },
        2: { halign: 'right' }, 3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' },
      },
      body: result.rows.map((r) => [
        r.bulan,
        new Date(r.tanggal).toLocaleDateString('id-ID'),
        fmtNumber(r.pokok), fmtNumber(r.bunga),
        fmtNumber(r.angsuran), fmtNumber(r.saldo),
      ]),
    });

    // Footer pages
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120);
      doc.text(
        `Halaman ${i} / ${total}  ·  Bluebook Telihan  ·  Dokumen simulasi — bukan persetujuan kredit`,
        pageW / 2, pageH - 6, { align: 'center' }
      );
    }

    doc.save(`Simulasi_Produktif_${namaDebitur || 'Loan'}_${Date.now()}.pdf`);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Kalkulator Kredit Produktif"
        description="Simulasi kredit usaha — skema MENURUN (KUR): pokok tetap, bunga dari saldo sisa, angsuran turun tiap bulan"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/kalkulator')}>
              Kalkulator Konsumtif
            </Button>
            <Button variant="outline" onClick={() => navigate('/kalkulator/riwayat')}>
              <History className="w-4 h-4 mr-2" /> Riwayat
            </Button>
          </div>
        }
      />

      {/* Banner produktif */}
      <div className="mb-6 rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0">
          <Factory className="w-6 h-6" />
        </div>
        <div>
          <div className="font-bold text-emerald-900 dark:text-emerald-100">Skema MENURUN (KUR) — Khusus Kredit Produktif</div>
          <div className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
            Pokok pinjaman tetap tiap bulan (Plafon ÷ Tenor), bunga dihitung dari <strong>saldo sisa</strong>, sehingga angsuran <strong>turun setiap bulan</strong>. Sesuai template AMORTISASI sheet "Sliding". Fokus analisa pada arus kas usaha (DSCR & RPC).
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Data Debitur & Usaha */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" /> Data Debitur & Usaha
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div>
                <Label>Nomor KTP</Label>
                <Input value={nomorKtp} onChange={(e) => setNomorKtp(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="16 digit" />
              </div>
              <div>
                <Label>Nama Calon Debitur *</Label>
                <Input value={namaDebitur} onChange={(e) => setNamaDebitur(e.target.value)} />
              </div>
              <div>
                <Label>Nama Usaha *</Label>
                <Input value={namaUsaha} onChange={(e) => setNamaUsaha(e.target.value)} placeholder="cth: Toko Maju Jaya" />
              </div>
              <div>
                <Label>Jenis Usaha</Label>
                <Select value={jenisUsaha} onValueChange={setJenisUsaha}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis usaha" /></SelectTrigger>
                  <SelectContent>
                    {JENIS_USAHA.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Alamat Usaha</Label>
                <Input value={alamatUsaha} onChange={(e) => setAlamatUsaha(e.target.value)} />
              </div>
              <div>
                <Label>Lama Usaha (tahun)</Label>
                <Input type="number" step="0.5" value={lamaUsahaTahun} onChange={(e) => setLamaUsahaTahun(e.target.value)} placeholder="cth: 3" />
                {lamaUsahaTahun && parseFloat(lamaUsahaTahun) < 2 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Umumnya bank mensyaratkan usaha berjalan ≥ 2 tahun.
                  </p>
                )}
              </div>
              <div>
                <Label>Nama AO</Label>
                <Input value={namaAo} onChange={(e) => setNamaAo(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Keuangan Usaha */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Analisa Keuangan Usaha (per bulan)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MoneyField label="Omzet / Penjualan *" value={omzetStr} onChange={setOmzetStr} />
                <MoneyField label="HPP / Biaya Pokok Penjualan" value={hppStr} onChange={setHppStr} />
                <MoneyField label="Biaya Operasional (sewa, listrik, gaji, dll)" value={biayaOpStr} onChange={setBiayaOpStr} />
                <MoneyField label="Biaya Pribadi / Keluarga" value={biayaPribadiStr} onChange={setBiayaPribadiStr} />
              </div>

              {/* Laporan L/R mini */}
              <div className="rounded-lg border bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/20 p-4 space-y-1.5 text-sm">
                <div className="text-xs uppercase font-semibold text-muted-foreground mb-2">Laba/Rugi Singkat</div>
                <CalcRow label="Omzet" value={omzet} />
                <CalcRow label="− HPP" value={-hpp} />
                <CalcRow label="= Laba Kotor" value={labaKotor} bold />
                <CalcRow label="− Biaya Operasional" value={-biayaOp} />
                <CalcRow label="= Laba Bersih Usaha" value={labaBersihUsaha} bold highlight="emerald" />
                <CalcRow label="− Biaya Pribadi" value={-biayaPribadi} />
                <CalcRow label="= Laba Bersih Keluarga" value={labaBersihKeluarga} bold highlight="emerald" />
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Margin Usaha</span>
                  <strong className={marginPct < 10 ? 'text-rose-600' : marginPct < 20 ? 'text-amber-600' : 'text-emerald-700'}>
                    {marginPct.toFixed(2)}%
                  </strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameter Pinjaman */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" /> Parameter Pinjaman
                <Badge className="bg-emerald-600 text-white ml-2">MENURUN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <MoneyField label="Plafon Pengajuan *" value={plafonStr} onChange={setPlafonStr} />
              <div>
                <Label>Tenor (bulan) *</Label>
                <Input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Kredit produktif umumnya 12–60 bulan</p>
              </div>
              <div>
                <Label>Bunga p.a. (%) *</Label>
                <Input type="number" step="0.01" value={bunga} onChange={(e) => setBunga(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Akad</Label>
                <Input type="date" value={tanggalAkad} onChange={(e) => setTanggalAkad(e.target.value)} />
              </div>
              <div>
                <Label>Provisi (%)</Label>
                <Input type="number" step="0.01" value={provisi} onChange={(e) => setProvisi(e.target.value)} />
              </div>
              <MoneyField label="Asuransi (Rp)" value={asuransiStr} onChange={setAsuransiStr} />
              <MoneyField label="Biaya Notaris" value={notarisStr} onChange={setNotarisStr} />
              <MoneyField label="Biaya Perikatan (APHT/Fidusia)" value={perikatanStr} onChange={setPerikatanStr} />
              <div>
                <Label>Blokir Angsuran</Label>
                <Select value={blokir} onValueChange={setBlokir}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tidak Ada</SelectItem>
                    <SelectItem value="1">1× Angsuran</SelectItem>
                    <SelectItem value="2">2× Angsuran</SelectItem>
                    <SelectItem value="3">3× Angsuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox id="pelunasan" checked={adaPelunasan} onCheckedChange={(c) => setAdaPelunasan(!!c)} />
                <Label htmlFor="pelunasan" className="cursor-pointer">Ada simulasi pelunasan dipercepat</Label>
                {adaPelunasan && (
                  <Input className="w-32 ml-2" type="number" value={pelunasanBulan}
                    onChange={(e) => setPelunasanBulan(e.target.value)} placeholder="Bulan ke-" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agunan */}
          <Card className="border-emerald-200 dark:border-emerald-900/50">
            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600" /> Agunan / Jaminan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="md:col-span-2">
                <Label>Jenis Agunan</Label>
                <Select value={jenisAgunan} onValueChange={setJenisAgunan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS_AGUNAN.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <MoneyField label="Nilai Pasar (Taksasi)" value={nilaiPasarStr} onChange={setNilaiPasarStr} />
              <MoneyField label="Nilai Likuidasi" value={nilaiLikuidasiStr} onChange={setNilaiLikuidasiStr} />
              {(nilaiPasar > 0 || nilaiLikuidasi > 0) && plafon > 0 && (
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">LTV vs Nilai Pasar</div>
                    <div className={`text-2xl font-bold ${ltvPasar > 80 ? 'text-rose-600' : ltvPasar > 70 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {ltvPasar.toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">LTV vs Nilai Likuidasi</div>
                    <div className={`text-2xl font-bold ${ltvLikuidasi > 100 ? 'text-rose-600' : ltvLikuidasi > 80 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {ltvLikuidasi.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <Card className="sticky top-20 border-emerald-300 dark:border-emerald-800">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-t-lg">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Ringkasan Produktif</span>
                <Badge variant="outline" className="bg-white/20 text-white border-white/30">MENURUN</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm pt-4">
              {!result && <p className="text-muted-foreground">Isi plafon & tenor untuk melihat simulasi.</p>}
              {result && potongan && (
                <>
                  <Row label="Plafon" value={fmtRp(plafon)} />
                  <Row label="Tenor" value={`${tenorBulan} bulan`} />
                  <Row label="Bunga p.a." value={`${bungaPa}%`} />
                  <hr className="my-2" />
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 p-3 -mx-1">
                    <div className="text-xs uppercase text-emerald-700 dark:text-emerald-300 font-semibold">Angsuran / Bulan (Tetap)</div>
                    <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                      {fmtRp(result.summary.angsuranPertama)}
                    </div>
                  </div>
                  <Row label="Total Angsuran" value={fmtRp(result.summary.totalAngsuran)} />
                  <Row label="Total Bunga" value={fmtRp(result.summary.totalBunga)} />

                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Kelayakan Usaha</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase">DSCR</div>
                      <div className="text-lg font-bold">{dscr.toFixed(2)}x</div>
                      <Badge className={`${dscrStatus.color} text-[9px] mt-1`}>{dscrStatus.label}</Badge>
                    </div>
                    <div className="rounded-lg border p-2 text-center">
                      <div className="text-[10px] text-muted-foreground uppercase">RPC</div>
                      <div className="text-lg font-bold">{rpcPct.toFixed(1)}%</div>
                      <Badge className={`${rpcStatus.color} text-[9px] mt-1`}>{rpcStatus.label}</Badge>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    DSCR ≥ 1.5 ideal · RPC ≤ 60% aman
                  </p>

                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Potongan di Muka</div>
                  <Row label="Asuransi" value={fmtRp(potongan.asuransi)} />
                  <Row label="Provisi" value={fmtRp(potongan.provisi)} />
                  <Row label="Notaris" value={fmtRp(potongan.notaris)} />
                  <Row label="Perikatan" value={fmtRp(potongan.perikatan)} />
                  <Row label="Blokir Angsuran" value={fmtRp(potongan.blokir)} />
                  <Row label="Total Potongan" value={fmtRp(potongan.total)} strong />
                  <Row label="Dana Diterima" value={fmtRp(potongan.danaDiterima)} strong highlight />

                  {(nilaiPasar > 0 || nilaiLikuidasi > 0) && (
                    <>
                      <hr className="my-2" />
                      <div className="text-xs uppercase text-muted-foreground font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Agunan
                      </div>
                      <Row label="LTV Pasar" value={`${ltvPasar.toFixed(1)}%`} />
                      <Row label="LTV Likuidasi" value={`${ltvLikuidasi.toFixed(1)}%`} />
                    </>
                  )}

                  {pelunasan && (
                    <>
                      <hr className="my-2" />
                      <div className="text-xs uppercase text-muted-foreground font-semibold">
                        Pelunasan Bulan ke-{pelunasan.bulanKe}
                      </div>
                      <Row label="Sisa Pokok" value={fmtRp(pelunasan.sisaPokok)} />
                      <Row label="Bunga Berjalan" value={fmtRp(pelunasan.bungaBerjalan)} />
                      <Row label="Total Pelunasan" value={fmtRp(pelunasan.totalPelunasan)} strong highlight />
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button variant="outline" onClick={handleExportExcel}>
                      <Download className="w-4 h-4 mr-1" /> Excel
                    </Button>
                    <Button variant="outline" onClick={handleExportPdf}>
                      <FileText className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </div>
                  {canEdit && (
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={handleSimpan} disabled={save.isPending}>
                      <Save className="w-4 h-4 mr-2" /> {save.isPending ? 'Menyimpan...' : 'Simpan Simulasi'}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {result && (
        <Card className="mt-6 border-emerald-200">
          <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b">
            <CardTitle className="text-base">Tabel Angsuran ({result.rows.length} bulan) — Menurun / KUR (angsuran turun tiap bulan)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Pokok</TableHead>
                    <TableHead className="text-right">Bunga</TableHead>
                    <TableHead className="text-right">Angsuran</TableHead>
                    <TableHead className="text-right">Saldo Pokok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((r) => (
                    <TableRow key={r.bulan}>
                      <TableCell>{r.bulan}</TableCell>
                      <TableCell>{new Date(r.tanggal).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="text-right">{fmtNumber(r.pokok)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(r.bunga)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtNumber(r.angsuran)}</TableCell>
                      <TableCell className="text-right">{fmtNumber(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
};

const MoneyField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div>
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(formatCurrencyInput(e.target.value))} placeholder="0" />
  </div>
);

const CalcRow: React.FC<{ label: string; value: number; bold?: boolean; highlight?: 'emerald' }> = ({ label, value, bold, highlight }) => (
  <div className={`flex justify-between items-center ${highlight === 'emerald' ? 'text-emerald-800 dark:text-emerald-300' : ''}`}>
    <span className={bold ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
    <span className={bold ? 'font-bold tabular-nums' : 'tabular-nums'}>{fmtRp(Math.abs(value))}</span>
  </div>
);

const Row: React.FC<{ label: string; value: string; strong?: boolean; highlight?: boolean }> = ({ label, value, strong, highlight }) => (
  <div className={`flex justify-between items-center ${highlight ? 'bg-emerald-100/60 dark:bg-emerald-950/40 px-2 py-1 rounded' : ''}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={strong ? 'font-semibold' : ''}>{value}</span>
  </div>
);

export default KalkulatorProduktifPage;
