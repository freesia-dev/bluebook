import React, { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  useLoanProducts,
  usePensionRules,
  useSaveLoanSimulation,
  PILIHAN_KARIR_DEFAULT,
} from '@/hooks/use-loan-calc';
import {
  calcAmortization,
  calcPotongan,
  calcPelunasan,
  calcPensiun,
  calcMaxPlafonByDSR,
  fmtRp,
  fmtNumber,
  type LoanSkema,
} from '@/lib/loan-calc';
import { calcAlamin, calcUmur, cekUnderwriting, type AlaminResult, type UWResult } from '@/lib/alamin-calc';
import { useAlaminConfig, useAlaminTarif, useAlaminUWRules } from '@/hooks/use-alamin';
import { useCerdasConfig } from '@/hooks/use-cerdas';
import {
  applyCerdas,
  isCerdasActive,
  getCerdasTier,
  getCerdasBunga,
  CERDAS_SKEMA_LABEL,
  type CerdasSkema,
  type CerdasApplyResult,
} from '@/lib/cerdas-calc';
import { Switch } from '@/components/ui/switch';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import { Save, Download, FileText, Calculator, AlertTriangle, History, ShieldCheck, ShieldAlert, ShieldQuestion, Sparkles, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/contexts/AuthContext';
import logoBpd from '@/assets/logo-bankaltimtara.png';

type AsuransiProvider = 'manual' | 'alamin';

const KalkulatorPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: products = [] } = useLoanProducts(true);
  const { data: pensionRules = [] } = usePensionRules();
  const { data: alaminTarif } = useAlaminTarif();
  const { data: alaminRules = [] } = useAlaminUWRules();
  const { data: alaminConfig } = useAlaminConfig();
  const { data: cerdasConfig } = useCerdasConfig();
  const save = useSaveLoanSimulation();

  // Debitur
  const [nomorKtp, setNomorKtp] = useState('');
  const [namaDebitur, setNamaDebitur] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [instansi, setInstansi] = useState('');
  const [pilihanKarir, setPilihanKarir] = useState('');
  const [namaAo, setNamaAo] = useState('');

  // Loan
  const [productId, setProductId] = useState('');
  const [plafonStr, setPlafonStr] = useState('');
  const [tenor, setTenor] = useState('60');
  const [tanggalAkad, setTanggalAkad] = useState(() => new Date().toISOString().slice(0, 10));
  const [gajiStr, setGajiStr] = useState('');
  const [bunga, setBunga] = useState('');
  const [bungaMode, setBungaMode] = useState<'preset' | 'manual'>('preset');

  // Asuransi
  const [asuransiProvider, setAsuransiProvider] = useState<AsuransiProvider>('manual');
  const [asuransiNominalStr, setAsuransiNominalStr] = useState('');

  const [provisi, setProvisi] = useState('0');
  const [provisiMode, setProvisiMode] = useState<'preset' | 'manual'>('preset');
  const [notarisStr, setNotarisStr] = useState('');
  const [perikatanStr, setPerikatanStr] = useState('');
  const [blokir, setBlokir] = useState('0');
  const [adaPelunasan, setAdaPelunasan] = useState(false);
  const [pelunasanBulan, setPelunasanBulan] = useState('12');
  const [dsrTarget, setDsrTarget] = useState('40');

  // CERDAS promo
  const [cerdasOn, setCerdasOn] = useState(false);
  const [cerdasSkema, setCerdasSkema] = useState<CerdasSkema>('debitur_baru');

  const selectedProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    if (!selectedProduct) return;
    setBungaMode('preset');
    setProvisiMode('preset');
    setBunga(selectedProduct.bunga_options[0]?.value?.toString() ?? '');
    setProvisi(selectedProduct.provisi_options[0]?.value?.toString() ?? '0');
    setNotarisStr(selectedProduct.biaya_notaris ? formatCurrencyInput(String(selectedProduct.biaya_notaris)) : '');
    setPerikatanStr(selectedProduct.biaya_perikatan ? formatCurrencyInput(String(selectedProduct.biaya_perikatan)) : '');
    setBlokir(String(selectedProduct.blokir_angsuran ?? 0));
    if (selectedProduct.asuransi_provider_default === 'alamin') {
      setAsuransiProvider('alamin');
    }
  }, [productId]); // eslint-disable-line

  const plafon = parseCurrencyValue(plafonStr);
  const gaji = parseCurrencyValue(gajiStr);
  const notaris = parseCurrencyValue(notarisStr);
  const perikatan = parseCurrencyValue(perikatanStr);
  const tenorBulan = parseInt(tenor) || 0;
  const bungaInput = parseFloat(bunga) || 0;
  const provisiInput = parseFloat(provisi) || 0;
  const blokirN = parseInt(blokir) || 0;
  const skema: LoanSkema = selectedProduct?.skema ?? 'anuitas';

  // Pensiun
  const pensionRule = pensionRules.find((r) => r.pilihan_karir === pilihanKarir);
  const pensiunInfo = useMemo(() => {
    if (!tanggalLahir || !pensionRule) return null;
    return calcPensiun(tanggalLahir, pensionRule.usia_pensiun);
  }, [tanggalLahir, pensionRule]);

  const tenorMelebihiPensiun = pensiunInfo && tenorBulan > pensiunInfo.sisaBulanTotal;

  // Al-Amin computation
  const umur = useMemo(
    () => (tanggalLahir && tanggalAkad ? calcUmur(tanggalLahir, tanggalAkad) : 0),
    [tanggalLahir, tanggalAkad]
  );

  const alamin: AlaminResult | null = useMemo(() => {
    if (asuransiProvider !== 'alamin') return null;
    if (!alaminTarif || !alaminConfig || plafon <= 0 || tenorBulan <= 0 || umur <= 0) return null;
    return calcAlamin({ plafon, umur, tenorBulan, tarif: alaminTarif, config: alaminConfig });
  }, [asuransiProvider, alaminTarif, alaminConfig, plafon, tenorBulan, umur]);

  const underwriting: UWResult | null = useMemo(() => {
    if (asuransiProvider !== 'alamin' || !alaminRules.length || umur <= 0 || plafon <= 0) return null;
    return cekUnderwriting(umur, plafon, tenorBulan, alaminRules, alaminConfig?.x_plus_n_default);
  }, [asuransiProvider, alaminRules, umur, plafon, tenorBulan, alaminConfig]);

  const premiAktual =
    asuransiProvider === 'alamin'
      ? alamin?.premiGross ?? 0
      : parseCurrencyValue(asuransiNominalStr);

  // CERDAS apply (override bunga + provisi + asuransi nominal)
  const cerdasResult: CerdasApplyResult | null = useMemo(() => {
    if (!cerdasOn || !cerdasConfig) return null;
    return applyCerdas({
      skema: cerdasSkema,
      plafon,
      premiAsuransiAktual: premiAktual,
      provisiPctAsli: provisiInput,
      cfg: cerdasConfig,
    });
  }, [cerdasOn, cerdasConfig, cerdasSkema, plafon, premiAktual, provisiInput]);

  const bungaPa = cerdasResult ? cerdasResult.bungaFinal : bungaInput;
  const provisiPct = cerdasResult ? cerdasResult.provisiFinalPct : provisiInput;
  // Nominal asuransi yang masuk potongan: jika CERDAS subsidi AJK aktif, hanya selisih yang dibayar debitur
  const asuransiNominal = cerdasResult
    ? (cerdasResult.skema === 'top_up' ? premiAktual : cerdasResult.selisihDebitur)
    : premiAktual;

  // Calculation
  const result = useMemo(() => {
    if (plafon <= 0 || tenorBulan <= 0) return null;
    return calcAmortization({ plafon, tenorBulan, bungaPa, skema, tanggalAkad });
  }, [plafon, tenorBulan, bungaPa, skema, tanggalAkad]);

  const potongan = useMemo(() => {
    if (!result) return null;
    return calcPotongan({
      plafon,
      asuransiNominal,
      provisiPct,
      biayaNotaris: notaris,
      biayaPerikatan: perikatan,
      blokirAngsuran: blokirN,
      angsuranPertama: result.summary.angsuranPertama,
    });
  }, [result, plafon, asuransiNominal, provisiPct, notaris, perikatan, blokirN]);

  const pelunasan = useMemo(() => {
    if (!result || !adaPelunasan) return null;
    return calcPelunasan(result.rows, parseInt(pelunasanBulan) || 0);
  }, [result, adaPelunasan, pelunasanBulan]);

  const dsrPct = result && gaji > 0 ? (result.summary.angsuranPertama / gaji) * 100 : 0;
  const dsrColor =
    dsrPct === 0 ? 'bg-muted' : dsrPct <= 40 ? 'bg-emerald-600' : dsrPct <= 50 ? 'bg-amber-500' : 'bg-rose-600';

  const handleHitungMaxPlafon = () => {
    if (gaji <= 0 || tenorBulan <= 0 || bungaPa <= 0) {
      toast({ title: 'Lengkapi gaji, tenor, bunga dulu', variant: 'destructive' });
      return;
    }
    const max = calcMaxPlafonByDSR({
      gaji,
      dsrPct: parseFloat(dsrTarget) || 40,
      tenorBulan,
      bungaPa,
      skema,
    });
    setPlafonStr(formatCurrencyInput(String(max)));
    toast({ title: 'Max plafon dihitung', description: fmtRp(max) });
  };

  const handleSimpan = async () => {
    if (!namaDebitur || !result || !potongan) {
      toast({ title: 'Lengkapi nama debitur & parameter pinjaman', variant: 'destructive' });
      return;
    }
    try {
      await save.mutateAsync({
        nomor_ktp: nomorKtp || null,
        nama_debitur: namaDebitur,
        tanggal_lahir: tanggalLahir || null,
        jenis_kelamin: jenisKelamin || null,
        pekerjaan: pekerjaan || null,
        instansi: instansi || null,
        pilihan_karir: pilihanKarir || null,
        product_id: productId || null,
        product_nama: selectedProduct?.nama || null,
        skema,
        plafon,
        tenor_bulan: tenorBulan,
        tanggal_akad: tanggalAkad || null,
        gaji,
        bunga_pa: bungaPa,
        asuransi_provider: asuransiProvider,
        asuransi_nominal: asuransiNominal,
        asuransi_pct: 0,
        provisi_pct: provisiPct,
        biaya_notaris: notaris,
        biaya_perikatan: perikatan,
        blokir_angsuran: blokirN,
        ada_pelunasan: adaPelunasan,
        pelunasan_bulan_ke: adaPelunasan ? parseInt(pelunasanBulan) || null : null,
        nama_ao: namaAo || null,
        hasil_ringkasan: { ...result.summary, ...potongan, cerdas: cerdasResult ?? null },
        tabel_angsuran: result.rows,
        ...(cerdasResult
          ? {
              cerdas_skema: cerdasResult.skema,
              cerdas_cap_subsidi: cerdasResult.capSubsidi,
              cerdas_subsidi_bank: cerdasResult.subsidiBank,
              cerdas_selisih_debitur: cerdasResult.selisihDebitur,
            }
          : {}),
      } as any);
      toast({ title: 'Simulasi tersimpan' });
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    if (!result || !potongan) return;
    const wb = XLSX.utils.book_new();
    const ringkasan: any[][] = [
      ['Nama Debitur', namaDebitur],
      ['Nomor KTP', nomorKtp],
      ['Jenis Kelamin', jenisKelamin === 'L' ? 'Laki-laki' : jenisKelamin === 'P' ? 'Perempuan' : '-'],
      ['Tanggal Lahir', tanggalLahir],
      ['Umur', umur ? `${umur} tahun` : '-'],
      ['Pekerjaan / Instansi', `${pekerjaan} / ${instansi}`],
      ['Pilihan Karir', pilihanKarir],
      ['Tanggal Pensiun', pensiunInfo?.tanggalPensiun || '-'],
      ['Sisa Masa Kerja', pensiunInfo ? `${pensiunInfo.sisaTahun} thn ${pensiunInfo.sisaBulan} bln` : '-'],
      [],
      ['Produk', selectedProduct?.nama || ''],
      ['Skema', skema],
      ['Plafon', plafon],
      ['Tenor (bulan)', tenorBulan],
      ['Tanggal Akad', tanggalAkad],
      ['Bunga p.a.', `${bungaPa}%`],
      ['Provider Asuransi', asuransiProvider === 'alamin' ? "Al-Amin (AT TA'MIN UM)" : 'Manual (input nominal)'],
      ['Asuransi (Rp)', potongan.asuransi],
      ['Provisi', `${provisiPct}%`],
      ['Notaris', notaris],
      ['Perikatan', perikatan],
      ['Blokir Angsuran', `${blokirN}× angsuran pertama`],
      [],
      ['Angsuran Pertama', result.summary.angsuranPertama],
      ['Angsuran Terakhir', result.summary.angsuranTerakhir],
      ['Total Angsuran', result.summary.totalAngsuran],
      ['Total Bunga', result.summary.totalBunga],
      ['Total Potongan di Muka', potongan.total],
      ['Dana Diterima', potongan.danaDiterima],
      ['Nama AO', namaAo],
    ];
    if (alamin) {
      ringkasan.push(
        [],
        ['— Al-Amin Detail —'],
        [`Tarif per Rp 1.000 UP (umur ${umur}, tenor ${tenorBulan} bln)`, alamin.rate],
        ['Premi Gross', alamin.premiGross],
        ['Ujroh Gross', alamin.ujrohGross],
        ['Pajak Ujroh', alamin.pajak],
        ['Ujroh Net (feebase bank)', alamin.ujrohNet],
        ['Premi Net (bank → Al-Amin)', alamin.premiNet],
      );
      if (underwriting) {
        ringkasan.push(['Underwriting', `${underwriting.kode} — ${underwriting.keterangan}`]);
      }
    }
    if (pelunasan) {
      ringkasan.push(
        [],
        [`— Pelunasan Bulan ke-${pelunasan.bulanKe} —`],
        ['Sisa Pokok', pelunasan.sisaPokok],
        ['Bunga Berjalan', pelunasan.bungaBerjalan],
        ['Total Pelunasan', pelunasan.totalPelunasan],
      );
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');

    const ang = result.rows.map((r) => ({
      No: r.bulan,
      Tanggal: r.tanggal,
      Pokok: r.pokok,
      Bunga: r.bunga,
      Angsuran: r.angsuran,
      'Saldo Pokok': r.saldo,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ang), 'Tabel Angsuran');
    XLSX.writeFile(wb, `Simulasi_${namaDebitur || 'Loan'}_${Date.now()}.xlsx`);
  };

  // =========================
  // PDF EXPORT — redesigned
  // =========================
  const handleExportPdf = async () => {
    if (!result || !potongan) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 14;
    const BRAND_BLUE: [number, number, number] = [0, 63, 127];
    const BRAND_ORANGE: [number, number, number] = [245, 130, 32];
    const ZEBRA: [number, number, number] = [241, 245, 249];
    const TEXT_DARK: [number, number, number] = [30, 41, 59];

    // ---------- KOP SURAT ----------
    try {
      // load logo as data URL
      const logoData = await fetch(logoBpd).then((r) => r.blob()).then(
        (b) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(b);
          })
      );
      doc.addImage(logoData, 'PNG', M, M, 18, 18);
    } catch {}

    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('PT. BPD Kalimantan Timur & Kalimantan Utara', M + 22, M + 5);
    doc.setFontSize(10.5);
    doc.text('Kantor Cabang Pembantu Telihan', M + 22, M + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Jl. Letjend S. Parman No. 14-15, Bontang 75383  ·  Telp. 0548-26567',
      M + 22,
      M + 14.5
    );
    doc.text('kcp.telihan@bankaltimtara.co.id  ·  bankaltimtara.co.id', M + 22, M + 18);

    // brand accent lines
    doc.setFillColor(...BRAND_BLUE);
    doc.rect(M, M + 21, pageW - 2 * M, 1.2, 'F');
    doc.setFillColor(...BRAND_ORANGE);
    doc.rect(M, M + 22.4, pageW - 2 * M, 0.5, 'F');

    // ---------- TITLE ----------
    let y = M + 30;
    doc.setTextColor(...BRAND_BLUE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SIMULASI ANGSURAN KREDIT', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Dicetak: ${new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`,
      pageW / 2,
      y,
      { align: 'center' }
    );

    // ---------- SECTION 1: Data Debitur + Parameter Pinjaman (2 col side by side) ----------
    y += 4;
    autoTable(doc, {
      startY: y,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.2, textColor: TEXT_DARK },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 3 },
        2: { cellWidth: 50 },
        3: { fontStyle: 'bold', cellWidth: 32 },
        4: { cellWidth: 3 },
        5: { cellWidth: 50 },
      },
      head: [
        [
          { content: 'DATA CALON DEBITUR', colSpan: 3, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 } },
          { content: 'PARAMETER PINJAMAN', colSpan: 3, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 } },
        ],
      ],
      body: [
        ['Nama', ':', namaDebitur || '-', 'Produk', ':', selectedProduct?.nama || '-'],
        ['Nomor KTP', ':', nomorKtp || '-', 'Skema', ':', skema.toUpperCase()],
        [
          'Jenis Kelamin',
          ':',
          jenisKelamin === 'L' ? 'Laki-laki' : jenisKelamin === 'P' ? 'Perempuan' : '-',
          'Plafon',
          ':',
          fmtRp(plafon),
        ],
        [
          'Tanggal Lahir',
          ':',
          tanggalLahir ? new Date(tanggalLahir).toLocaleDateString('id-ID') : '-',
          'Tenor',
          ':',
          `${tenorBulan} bulan`,
        ],
        [
          'Umur',
          ':',
          umur ? `${umur} tahun` : '-',
          'Tanggal Akad',
          ':',
          tanggalAkad ? new Date(tanggalAkad).toLocaleDateString('id-ID') : '-',
        ],
        ['Pekerjaan', ':', pekerjaan || '-', 'Bunga p.a.', ':', `${bungaPa}%`],
        ['Instansi', ':', instansi || '-', 'Gaji Bersih', ':', fmtRp(gaji)],
        [
          'Pilihan Karir',
          ':',
          pilihanKarir || '-',
          'DSR',
          ':',
          gaji > 0 ? `${dsrPct.toFixed(1)}%` : '-',
        ],
        [
          'Tanggal Pensiun',
          ':',
          pensiunInfo ? new Date(pensiunInfo.tanggalPensiun).toLocaleDateString('id-ID') : '-',
          'Provider Asuransi',
          ':',
          asuransiProvider === 'alamin' ? "Al-Amin (AT TA'MIN UM)" : 'Manual',
        ],
        [
          'Sisa Masa Kerja',
          ':',
          pensiunInfo ? `${pensiunInfo.sisaTahun} thn ${pensiunInfo.sisaBulan} bln` : '-',
          'Nama AO',
          ':',
          namaAo || '-',
        ],
      ],
      margin: { left: M, right: M },
    });

    // ---------- SECTION 2: Rincian Biaya / Potongan ----------
    let yy = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: yy,
      head: [['Komponen Potongan di Muka', 'Dasar Perhitungan', 'Nilai (Rp)']],
      body: [
        [
          'Asuransi',
          asuransiProvider === 'alamin' && alamin
            ? `Al-Amin: Tarif ${alamin.rate.toFixed(2)}/1.000 × Plafon (umur ${umur}, ${tenorBulan} bln)`
            : 'Manual (input nominal premi)',
          fmtNumber(potongan.asuransi),
        ],
        ['Provisi', `${provisiPct}% × Plafon`, fmtNumber(potongan.provisi)],
        ['Biaya Notaris', '—', fmtNumber(potongan.notaris)],
        ['Biaya Perikatan', '—', fmtNumber(potongan.perikatan)],
        [
          'Blokir Angsuran',
          blokirN > 0 ? `${blokirN} × Angsuran Pertama` : '—',
          fmtNumber(potongan.blokir),
        ],
        [
          { content: 'TOTAL POTONGAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: ZEBRA } },
          { content: fmtNumber(potongan.total), styles: { fontStyle: 'bold', fillColor: ZEBRA } },
        ],
        [
          { content: 'DANA DITERIMA DEBITUR', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: BRAND_ORANGE, textColor: 255 } },
          { content: fmtNumber(potongan.danaDiterima), styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255 } },
        ],
      ],
      styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 38, halign: 'right' },
      },
      margin: { left: M, right: M },
    });

    // ---------- SECTION 3: Detail Al-Amin (only if alamin) ----------
    if (alamin) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      const uwColor: [number, number, number] =
        underwriting?.status === 'aman'
          ? [22, 163, 74]
          : underwriting?.status === 'medis'
          ? [217, 119, 6]
          : [220, 38, 38];
      autoTable(doc, {
        startY: yy,
        head: [[{ content: "DETAIL PREMI AL-AMIN (AT TA'MIN UM)", colSpan: 2, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' } }]],
        body: [
          ['Premi Gross (yang masuk potongan)', fmtRp(alamin.premiGross)],
          ['Ujroh Gross (10% × Premi Gross)', fmtRp(alamin.ujrohGross)],
          ['Pajak Ujroh (2% × Ujroh Gross)', fmtRp(alamin.pajak)],
          ['Ujroh Net (feebase bank)', fmtRp(alamin.ujrohNet)],
          ['Premi Net (bank → Al-Amin)', fmtRp(alamin.premiNet)],
          [
            { content: `Underwriting: ${underwriting?.kode ?? '-'}`, styles: { fontStyle: 'bold' } },
            { content: underwriting?.keterangan ?? '-', styles: { textColor: uwColor, fontStyle: 'bold' } },
          ],
        ],
        styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: M, right: M },
      });
    }

    // ---------- SECTION 3b: Program CERDAS ----------
    if (cerdasResult) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      const statusColor: [number, number, number] =
        cerdasResult.status === 'gratis'
          ? [22, 163, 74]
          : cerdasResult.status === 'selisih'
          ? [217, 119, 6]
          : [100, 116, 139];
      const cerdasBody: any[][] = [
        ['Skema Promo', cerdasResult.skemaLabel],
        ['Bunga Promo', `${cerdasResult.bungaFinal}% p.a. fixed`],
      ];
      if (cerdasResult.skema === 'top_up') {
        cerdasBody.push(['Diskon Provisi', `${cerdasResult.diskonProvisiPct}% (${(parseFloat(provisi) || 0).toFixed(2)}% → ${cerdasResult.provisiFinalPct.toFixed(2)}%)`]);
      } else if (cerdasResult.tier) {
        cerdasBody.push(
          ['Tier Plafon', cerdasResult.tier.label],
          ['Cap Subsidi AJK', fmtRp(cerdasResult.capSubsidi)],
          ['Premi AJK Aktual', fmtRp(cerdasResult.premiAsuransiAktual)],
          [{ content: 'Subsidi Bank', styles: { fontStyle: 'bold' } }, { content: `− ${fmtRp(cerdasResult.subsidiBank)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74], halign: 'right' } }],
          [
            { content: 'Beban Debitur (AJK)', styles: { fontStyle: 'bold' } },
            { content: cerdasResult.selisihDebitur === 0 ? '✓ GRATIS' : fmtRp(cerdasResult.selisihDebitur), styles: { fontStyle: 'bold', textColor: statusColor, halign: 'right' } },
          ],
        );
      }
      cerdasBody.push([{ content: cerdasResult.pesan, colSpan: 2, styles: { fontStyle: 'italic', textColor: statusColor, fillColor: [254, 252, 232] } }]);
      autoTable(doc, {
        startY: yy,
        head: [[{ content: 'PROGRAM CERDAS — Cicilan Extra Ringan & Diskon Asuransi', colSpan: 2, styles: { fillColor: [245, 130, 32], textColor: 255, fontStyle: 'bold' } }]],
        body: cerdasBody,
        styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: M, right: M },
      });
    }

    // ---------- SECTION 4: Ringkasan Angsuran ----------
    yy = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: yy,
      head: [['Ringkasan Angsuran', 'Nilai']],
      body: [
        ['Angsuran Pertama', fmtRp(result.summary.angsuranPertama)],
        ['Angsuran Terakhir', fmtRp(result.summary.angsuranTerakhir)],
        ['Total Angsuran (selama tenor)', fmtRp(result.summary.totalAngsuran)],
        ['Total Bunga', fmtRp(result.summary.totalBunga)],
      ],
      styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: M, right: M },
    });

    // ---------- SECTION 5: Pelunasan dipercepat ----------
    if (pelunasan) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      const sisaAngsuranNormal = result.rows
        .slice(pelunasan.bulanKe - 1)
        .reduce((s, r) => s + r.angsuran, 0);
      const penghematan = Math.max(0, sisaAngsuranNormal - pelunasan.totalPelunasan);
      autoTable(doc, {
        startY: yy,
        head: [[{ content: `SKENARIO PELUNASAN DIPERCEPAT — Bulan ke-${pelunasan.bulanKe}`, colSpan: 2, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' } }]],
        body: [
          ['Sisa Pokok', fmtRp(pelunasan.sisaPokok)],
          ['Bunga Berjalan', fmtRp(pelunasan.bungaBerjalan)],
          [
            { content: 'TOTAL PELUNASAN', styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255 } },
            { content: fmtRp(pelunasan.totalPelunasan), styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255, halign: 'right' } },
          ],
          ['Sisa Angsuran (jika tidak dilunasi)', fmtRp(sisaAngsuranNormal)],
          [
            { content: 'Penghematan vs jalan normal', styles: { fontStyle: 'bold' } },
            { content: fmtRp(penghematan), styles: { fontStyle: 'bold', halign: 'right', textColor: [22, 163, 74] } },
          ],
        ],
        styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: M, right: M },
      });
    }

    // ---------- SECTION 6: Tabel Angsuran ----------
    yy = (doc as any).lastAutoTable.finalY + 6;
    autoTable(doc, {
      startY: yy,
      head: [['No', 'Tanggal', 'Pokok', 'Bunga', 'Angsuran', 'Saldo Pokok']],
      body: result.rows.map((r) => [
        r.bulan,
        new Date(r.tanggal).toLocaleDateString('id-ID'),
        fmtNumber(r.pokok),
        fmtNumber(r.bunga),
        fmtNumber(r.angsuran),
        fmtNumber(r.saldo),
      ]),
      styles: { fontSize: 7, cellPadding: 1.2, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right' },
      },
      margin: { left: M, right: M },
    });

    // ---------- WATERMARK + FOOTER per page ----------
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // watermark
      doc.setTextColor(230);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(60);
      doc.text('SIMULASI', pageW / 2, pageH / 2, { align: 'center', angle: 30 });
      // footer
      doc.setTextColor(120);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(
        'Dokumen simulasi — bukan dokumen perjanjian kredit. Nilai dapat berubah sewaktu-waktu.',
        M,
        pageH - 6
      );
      doc.text(`Hal ${i} / ${totalPages}  ·  AO: ${namaAo || '-'}`, pageW - M, pageH - 6, {
        align: 'right',
      });
    }

    doc.save(`Simulasi_${namaDebitur || 'Loan'}_${Date.now()}.pdf`);
  };

  const uwBadgeVariant = underwriting?.status === 'aman'
    ? 'success'
    : underwriting?.status === 'medis'
    ? 'warning'
    : 'destructive';
  const UwIcon =
    underwriting?.status === 'aman'
      ? ShieldCheck
      : underwriting?.status === 'medis'
      ? ShieldQuestion
      : ShieldAlert;

  return (
    <MainLayout>
      <PageHeader
        title="Kalkulator Loan"
        description="Hitung simulasi angsuran kredit dengan berbagai skema bunga"
        actions={
          <Button variant="outline" onClick={() => navigate('/kalkulator/riwayat')}>
            <History className="w-4 h-4 mr-2" /> Riwayat
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* FORM */}
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Calon Debitur</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nomor KTP</Label>
                <Input
                  value={nomorKtp}
                  onChange={(e) => setNomorKtp(e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="16 digit"
                />
              </div>
              <div>
                <Label>Nama Calon Debitur *</Label>
                <Input value={namaDebitur} onChange={(e) => setNamaDebitur(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Lahir</Label>
                <Input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
              </div>
              <div>
                <Label>Jenis Kelamin</Label>
                <RadioGroup
                  value={jenisKelamin}
                  onValueChange={(v) => setJenisKelamin(v as 'L' | 'P')}
                  className="flex gap-4 pt-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="L" id="jk-l" />
                    <Label htmlFor="jk-l" className="cursor-pointer font-normal">Laki-laki</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="P" id="jk-p" />
                    <Label htmlFor="jk-p" className="cursor-pointer font-normal">Perempuan</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label>Pilihan Karir</Label>
                <Select value={pilihanKarir} onValueChange={setPilihanKarir}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih karir" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pensionRules.length ? pensionRules.map((r) => r.pilihan_karir) : PILIHAN_KARIR_DEFAULT).map(
                      (k) => (
                        <SelectItem key={k} value={k}>
                          {k}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pekerjaan</Label>
                <Input value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} />
              </div>
              <div>
                <Label>Instansi</Label>
                <Input value={instansi} onChange={(e) => setInstansi(e.target.value)} />
              </div>
              {pensiunInfo && (
                <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span>
                      Umur: <strong>{pensiunInfo.umurTahun} thn {pensiunInfo.umurBulan} bln</strong>
                    </span>
                    <span>
                      Pensiun: <strong>{new Date(pensiunInfo.tanggalPensiun).toLocaleDateString('id-ID')}</strong>
                    </span>
                    <span>
                      Sisa masa kerja:{' '}
                      <strong>
                        {pensiunInfo.sisaTahun} thn {pensiunInfo.sisaBulan} bln ({pensiunInfo.sisaBulanTotal} bulan)
                      </strong>
                    </span>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                <Label>Nama AO</Label>
                <Input value={namaAo} onChange={(e) => setNamaAo(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Pinjaman</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Produk Kredit</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nama} <span className="text-muted-foreground">— {p.skema}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plafon Pengajuan</Label>
                <Input
                  value={plafonStr}
                  onChange={(e) => setPlafonStr(formatCurrencyInput(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Jangka Waktu (bulan)</Label>
                <Input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} />
                {tenorMelebihiPensiun && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Tenor melebihi sisa masa kerja sampai pensiun (
                    {pensiunInfo!.sisaBulanTotal} bulan)
                  </p>
                )}
              </div>
              <div>
                <Label>Tanggal Akad</Label>
                <Input type="date" value={tanggalAkad} onChange={(e) => setTanggalAkad(e.target.value)} />
              </div>
              <div>
                <Label>Gaji Bersih / Bulan</Label>
                <Input
                  value={gajiStr}
                  onChange={(e) => setGajiStr(formatCurrencyInput(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  <span>Bunga p.a. (%)</span>
                  {cerdasResult && (
                    <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> CERDAS: {cerdasResult.bungaFinal}%
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  {bungaMode === 'preset' && selectedProduct ? (
                    <Select value={bunga} onValueChange={setBunga}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct.bunga_options.map((o) => (
                          <SelectItem key={o.label} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input type="number" step="0.01" value={bunga} onChange={(e) => setBunga(e.target.value)} />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBungaMode(bungaMode === 'preset' ? 'manual' : 'preset')}
                  >
                    {bungaMode === 'preset' ? 'Manual' : 'Preset'}
                  </Button>
                </div>
              </div>

              <div>
                <Label className="flex items-center justify-between">
                  <span>Provisi (%)</span>
                  {cerdasResult?.skema === 'top_up' && (
                    <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> CERDAS: {cerdasResult.provisiFinalPct.toFixed(2)}%
                    </span>
                  )}
                </Label>
                <div className="flex gap-2">
                  {provisiMode === 'preset' && selectedProduct ? (
                    <Select value={provisi} onValueChange={setProvisi}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        {selectedProduct.provisi_options.map((o) => (
                          <SelectItem key={o.label} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input type="number" step="0.01" value={provisi} onChange={(e) => setProvisi(e.target.value)} />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProvisiMode(provisiMode === 'preset' ? 'manual' : 'preset')}
                  >
                    {provisiMode === 'preset' ? 'Manual' : 'Preset'}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Biaya Notaris</Label>
                <Input
                  value={notarisStr}
                  onChange={(e) => setNotarisStr(formatCurrencyInput(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Biaya Perikatan</Label>
                <Input
                  value={perikatanStr}
                  onChange={(e) => setPerikatanStr(formatCurrencyInput(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Blokir Angsuran</Label>
                <Select value={blokir} onValueChange={setBlokir}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Tidak Ada</SelectItem>
                    <SelectItem value="1">1× Angsuran</SelectItem>
                    <SelectItem value="2">2× Angsuran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <Checkbox
                  id="pelunasan"
                  checked={adaPelunasan}
                  onCheckedChange={(c) => setAdaPelunasan(!!c)}
                />
                <Label htmlFor="pelunasan" className="cursor-pointer">
                  Ada simulasi pelunasan dipercepat
                </Label>
                {adaPelunasan && (
                  <Input
                    className="w-32 ml-2"
                    type="number"
                    value={pelunasanBulan}
                    onChange={(e) => setPelunasanBulan(e.target.value)}
                    placeholder="Bulan ke-"
                  />
                )}
              </div>

              <div className="md:col-span-2 rounded-lg border border-dashed p-3 flex items-end gap-2 bg-muted/20">
                <div className="flex-1">
                  <Label>DSR Target (%)</Label>
                  <Input
                    type="number"
                    value={dsrTarget}
                    onChange={(e) => setDsrTarget(e.target.value)}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={handleHitungMaxPlafon}>
                  <Calculator className="w-4 h-4 mr-2" /> Hitung Max Plafon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* PROGRAM CERDAS */}
          {cerdasConfig && (
            <Card className={cerdasOn ? 'border-amber-400 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10' : ''}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Program CERDAS
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {new Date(cerdasConfig.periode_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} — {new Date(cerdasConfig.periode_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Badge>
                  </span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cerdas-switch" className="text-sm font-normal cursor-pointer">
                      Ikut Promo
                    </Label>
                    <Switch
                      id="cerdas-switch"
                      checked={cerdasOn}
                      onCheckedChange={(v) => setCerdasOn(v && isCerdasActive(cerdasConfig, tanggalAkad))}
                      disabled={!isCerdasActive(cerdasConfig, tanggalAkad)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isCerdasActive(cerdasConfig, tanggalAkad) && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Tanggal akad di luar periode promo CERDAS.
                  </p>
                )}
                {cerdasOn && (
                  <>
                    <RadioGroup
                      value={cerdasSkema}
                      onValueChange={(v) => setCerdasSkema(v as CerdasSkema)}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3"
                    >
                      {(['debitur_baru', 'take_over', 'top_up'] as CerdasSkema[]).map((sk) => {
                        const bunga = getCerdasBunga(sk, cerdasConfig);
                        const active = cerdasSkema === sk;
                        const isTopUp = sk === 'top_up';
                        return (
                          <label
                            key={sk}
                            htmlFor={`cerdas-${sk}`}
                            className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                              active
                                ? isTopUp
                                  ? 'border-amber-500 bg-amber-100/60 dark:bg-amber-900/30'
                                  : 'border-primary bg-primary/5'
                                : 'border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <RadioGroupItem value={sk} id={`cerdas-${sk}`} className="mt-1" />
                              <div className="flex-1">
                                <div className="text-xs uppercase font-bold tracking-wide text-muted-foreground">
                                  {CERDAS_SKEMA_LABEL[sk]}
                                </div>
                                <div className={`text-2xl font-bold mt-1 ${isTopUp ? 'text-amber-700 dark:text-amber-400' : 'text-primary'}`}>
                                  {isTopUp ? `${cerdasConfig.diskon_provisi_top_up_pct}%` : `${bunga.toFixed(2).replace('.', ',')}%`}
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                  {isTopUp
                                    ? `Diskon provisi · Bunga ${bunga}% p.a.`
                                    : 'p.a. fixed · Gratis AJK'}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </RadioGroup>

                    {cerdasResult && (
                      <div
                        className={`rounded-lg p-3 text-sm border ${
                          cerdasResult.status === 'gratis'
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : cerdasResult.status === 'selisih'
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                            : 'bg-muted/40 border-border'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {cerdasResult.status === 'gratis' ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : cerdasResult.status === 'selisih' ? (
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <Sparkles className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{cerdasResult.pesan}</div>
                            {cerdasResult.tier && (
                              <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                                <span>{cerdasResult.tier.label}</span>
                                <span className="text-right">Cap: <strong>{fmtRp(cerdasResult.capSubsidi)}</strong></span>
                                <span>Premi aktual</span>
                                <span className="text-right">{fmtRp(cerdasResult.premiAsuransiAktual)}</span>
                                <span>Subsidi bank</span>
                                <span className="text-right text-emerald-700 dark:text-emerald-400 font-medium">
                                  − {fmtRp(cerdasResult.subsidiBank)}
                                </span>
                                <span className="font-semibold">Beban debitur</span>
                                <span className={`text-right font-bold ${cerdasResult.selisihDebitur === 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                  {cerdasResult.selisihDebitur === 0 ? 'GRATIS' : fmtRp(cerdasResult.selisihDebitur)}
                                </span>
                              </div>
                            )}
                            {cerdasResult.skema === 'top_up' && (
                              <div className="text-xs text-muted-foreground pt-1">
                                Provisi awal {provisiInput}% → <strong>{cerdasResult.provisiFinalPct.toFixed(2)}%</strong> setelah diskon {cerdasResult.diskonProvisiPct}%.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground italic">
                      Catatan: pelunasan dipercepat/top up ≤ 1 tahun wajib mengganti premi AJK yang telah disubsidi bank.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ASURANSI */}
          <Card>

            <CardHeader>
              <CardTitle className="text-base">Asuransi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Provider Asuransi</Label>
                <Select value={asuransiProvider} onValueChange={(v) => setAsuransiProvider(v as AsuransiProvider)}>
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (input nominal premi)</SelectItem>
                    <SelectItem value="alamin">Al-Amin (AT TA'MIN UM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {asuransiProvider === 'manual' && (
                <div>
                  <Label>Nominal Premi Asuransi (Rp)</Label>
                  <Input
                    value={asuransiNominalStr}
                    onChange={(e) => setAsuransiNominalStr(formatCurrencyInput(e.target.value))}
                    placeholder="0"
                    className="md:w-80"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Diambil dari quotation web pihak ketiga (input nominal langsung, bukan persen).
                  </p>
                </div>
              )}

              {asuransiProvider === 'alamin' && (
                <div className="space-y-3">
                  {(!tanggalLahir || plafon <= 0 || tenorBulan <= 0) && (
                    <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Isi tanggal lahir, plafon, dan tenor untuk menghitung premi Al-Amin.
                    </p>
                  )}
                  {alamin ? (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Premi Gross (yang masuk potongan)</span>
                        <span className="font-bold text-lg">{fmtRp(alamin.premiGross)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pt-2 border-t">
                        <span>Tarif per Rp 1.000 UP</span><span className="text-right text-foreground">{alamin.rate.toFixed(4)}</span>
                        <span>Umur saat akad</span><span className="text-right text-foreground">{umur} tahun</span>
                        <span>Ujroh Gross (10%)</span><span className="text-right">{fmtRp(alamin.ujrohGross)}</span>
                        <span>Pajak Ujroh (2%)</span><span className="text-right">{fmtRp(alamin.pajak)}</span>
                        <span>Ujroh Net (feebase bank)</span><span className="text-right text-emerald-600 font-medium">{fmtRp(alamin.ujrohNet)}</span>
                        <span>Premi Net (bank → Al-Amin)</span><span className="text-right">{fmtRp(alamin.premiNet)}</span>
                      </div>
                      {alamin.cappedToMin && (
                        <p className="text-xs text-amber-600">Premi di-cap minimum Rp {fmtNumber(alaminConfig?.premi_min ?? 5000)}.</p>
                      )}
                    </div>
                  ) : (
                    tanggalLahir && plafon > 0 && tenorBulan > 0 && (
                      <p className="text-sm text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Tarif tidak ditemukan untuk umur {umur} & tenor {tenorBulan} bulan.
                      </p>
                    )
                  )}
                  {underwriting && (
                    <div className="flex items-start gap-2">
                      <Badge variant={uwBadgeVariant as any} className="gap-1">
                        <UwIcon className="w-3 h-3" />
                        {underwriting.kode}
                      </Badge>
                      <div className="text-sm">
                        <div className="font-medium">{underwriting.keterangan}</div>
                        <div className="text-xs text-muted-foreground">
                          x+n = {underwriting.xPlusN} (batas {underwriting.xPlusNMax})
                          {!underwriting.xPlusNOk && ' — melebihi batas!'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RESULT */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Ringkasan
                {result && gaji > 0 && (
                  <Badge className={`${dsrColor} text-white`}>DSR {dsrPct.toFixed(1)}%</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!result && <p className="text-muted-foreground">Isi plafon & tenor untuk melihat simulasi.</p>}
              {result && potongan && (
                <>
                  <Row label="Skema" value={skema.toUpperCase()} />
                  {cerdasResult && (
                    <div className="flex justify-between items-center -mt-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> CERDAS
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {cerdasResult.skemaLabel}
                      </Badge>
                    </div>
                  )}
                  <Row label="Plafon" value={fmtRp(plafon)} />
                  <Row label="Tenor" value={`${tenorBulan} bulan`} />
                  <Row label="Bunga p.a." value={`${bungaPa}%${cerdasResult ? ' (promo)' : ''}`} />
                  <hr className="my-2" />
                  <Row label="Angsuran Pertama" value={fmtRp(result.summary.angsuranPertama)} strong />
                  {skema !== 'anuitas' && (
                    <Row label="Angsuran Terakhir" value={fmtRp(result.summary.angsuranTerakhir)} />
                  )}
                  <Row label="Total Angsuran" value={fmtRp(result.summary.totalAngsuran)} />
                  <Row label="Total Bunga" value={fmtRp(result.summary.totalBunga)} />
                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Potongan di Muka</div>
                  <Row
                    label={`Asuransi${asuransiProvider === 'alamin' ? ' (Al-Amin)' : ''}${
                      cerdasResult && cerdasResult.skema !== 'top_up'
                        ? cerdasResult.selisihDebitur === 0
                          ? ' — GRATIS'
                          : ' — selisih'
                        : ''
                    }`}
                    value={fmtRp(potongan.asuransi)}
                  />
                  {cerdasResult && cerdasResult.skema !== 'top_up' && (
                    <div className="text-xs pl-3 -mt-1 space-y-0.5">
                      <div className="text-muted-foreground">Premi aktual: {fmtRp(cerdasResult.premiAsuransiAktual)}</div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Subsidi bank: − {fmtRp(cerdasResult.subsidiBank)} (cap {fmtRp(cerdasResult.capSubsidi)})
                      </div>
                    </div>
                  )}
                  {alamin && !cerdasResult && (
                    <div className="text-xs text-muted-foreground pl-3 -mt-1">
                      ujroh net {fmtRp(alamin.ujrohNet)} · premi net {fmtRp(alamin.premiNet)}
                    </div>
                  )}
                  <Row label="Provisi" value={fmtRp(potongan.provisi)} />
                  <Row label="Notaris" value={fmtRp(potongan.notaris)} />
                  <Row label="Perikatan" value={fmtRp(potongan.perikatan)} />
                  <Row label="Blokir Angsuran" value={fmtRp(potongan.blokir)} />
                  <Row label="Total Potongan" value={fmtRp(potongan.total)} strong />
                  <Row label="Dana Diterima" value={fmtRp(potongan.danaDiterima)} strong highlight />
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
                    <Button className="w-full" onClick={handleSimpan} disabled={save.isPending}>
                      <Save className="w-4 h-4 mr-2" /> {save.isPending ? 'Menyimpan...' : 'Simpan Simulasi'}
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AMORT TABLE */}
      {result && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Tabel Angsuran ({result.rows.length} bulan)</CardTitle>
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

const Row: React.FC<{ label: string; value: string; strong?: boolean; highlight?: boolean }> = ({
  label,
  value,
  strong,
  highlight,
}) => (
  <div
    className={`flex justify-between items-center ${
      highlight ? 'bg-primary/10 px-2 py-1 rounded' : ''
    }`}
  >
    <span className="text-muted-foreground">{label}</span>
    <span className={strong ? 'font-semibold' : ''}>{value}</span>
  </div>
);

export default KalkulatorPage;
