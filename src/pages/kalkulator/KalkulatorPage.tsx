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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import { Save, Download, FileText, Calculator, AlertTriangle, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '@/contexts/AuthContext';

const KalkulatorPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: products = [] } = useLoanProducts(true);
  const { data: pensionRules = [] } = usePensionRules();
  const save = useSaveLoanSimulation();

  // Debitur
  const [nomorKtp, setNomorKtp] = useState('');
  const [namaDebitur, setNamaDebitur] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
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
  const [asuransi, setAsuransi] = useState('0');
  const [asuransiMode, setAsuransiMode] = useState<'preset' | 'manual'>('preset');
  const [provisi, setProvisi] = useState('0');
  const [provisiMode, setProvisiMode] = useState<'preset' | 'manual'>('preset');
  const [notarisStr, setNotarisStr] = useState('');
  const [perikatanStr, setPerikatanStr] = useState('');
  const [blokir, setBlokir] = useState('0');
  const [adaPelunasan, setAdaPelunasan] = useState(false);
  const [pelunasanBulan, setPelunasanBulan] = useState('12');
  const [dsrTarget, setDsrTarget] = useState('40');

  const selectedProduct = products.find((p) => p.id === productId);

  // Auto-apply defaults when product changes
  useEffect(() => {
    if (!selectedProduct) return;
    setBungaMode('preset');
    setAsuransiMode('preset');
    setProvisiMode('preset');
    setBunga(selectedProduct.bunga_options[0]?.value?.toString() ?? '');
    setAsuransi(selectedProduct.asuransi_options[0]?.value?.toString() ?? '0');
    setProvisi(selectedProduct.provisi_options[0]?.value?.toString() ?? '0');
    setNotarisStr(selectedProduct.biaya_notaris ? formatCurrencyInput(String(selectedProduct.biaya_notaris)) : '');
    setPerikatanStr(selectedProduct.biaya_perikatan ? formatCurrencyInput(String(selectedProduct.biaya_perikatan)) : '');
    setBlokir(String(selectedProduct.blokir_angsuran ?? 0));
  }, [productId]); // eslint-disable-line

  const plafon = parseCurrencyValue(plafonStr);
  const gaji = parseCurrencyValue(gajiStr);
  const notaris = parseCurrencyValue(notarisStr);
  const perikatan = parseCurrencyValue(perikatanStr);
  const tenorBulan = parseInt(tenor) || 0;
  const bungaPa = parseFloat(bunga) || 0;
  const asuransiPct = parseFloat(asuransi) || 0;
  const provisiPct = parseFloat(provisi) || 0;
  const blokirN = parseInt(blokir) || 0;
  const skema: LoanSkema = selectedProduct?.skema ?? 'anuitas';

  // Pensiun
  const pensionRule = pensionRules.find((r) => r.pilihan_karir === pilihanKarir);
  const pensiunInfo = useMemo(() => {
    if (!tanggalLahir || !pensionRule) return null;
    return calcPensiun(tanggalLahir, pensionRule.usia_pensiun);
  }, [tanggalLahir, pensionRule]);

  const tenorMelebihiPensiun = pensiunInfo && tenorBulan > pensiunInfo.sisaBulanTotal;

  // Calculation
  const result = useMemo(() => {
    if (plafon <= 0 || tenorBulan <= 0) return null;
    return calcAmortization({ plafon, tenorBulan, bungaPa, skema, tanggalAkad });
  }, [plafon, tenorBulan, bungaPa, skema, tanggalAkad]);

  const potongan = useMemo(() => {
    if (!result) return null;
    return calcPotongan({
      plafon,
      tenorBulan,
      asuransiPct,
      provisiPct,
      biayaNotaris: notaris,
      biayaPerikatan: perikatan,
      blokirAngsuran: blokirN,
      angsuranPertama: result.summary.angsuranPertama,
    });
  }, [result, plafon, tenorBulan, asuransiPct, provisiPct, notaris, perikatan, blokirN]);

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
        asuransi_pct: asuransiPct,
        provisi_pct: provisiPct,
        biaya_notaris: notaris,
        biaya_perikatan: perikatan,
        blokir_angsuran: blokirN,
        ada_pelunasan: adaPelunasan,
        pelunasan_bulan_ke: adaPelunasan ? parseInt(pelunasanBulan) || null : null,
        nama_ao: namaAo || null,
        hasil_ringkasan: { ...result.summary, ...potongan },
        tabel_angsuran: result.rows,
      });
      toast({ title: 'Simulasi tersimpan' });
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    if (!result) return;
    const wb = XLSX.utils.book_new();
    const ringkasan = [
      ['Nama Debitur', namaDebitur],
      ['Nomor KTP', nomorKtp],
      ['Tanggal Lahir', tanggalLahir],
      ['Pekerjaan / Instansi', `${pekerjaan} / ${instansi}`],
      ['Pilihan Karir', pilihanKarir],
      ['Tanggal Pensiun', pensiunInfo?.tanggalPensiun || '-'],
      ['Sisa Masa Kerja', pensiunInfo ? `${pensiunInfo.sisaTahun} thn ${pensiunInfo.sisaBulan} bln` : '-'],
      [],
      ['Produk', selectedProduct?.nama || ''],
      ['Skema', skema],
      ['Plafon', plafon],
      ['Tenor (bulan)', tenorBulan],
      ['Bunga p.a.', `${bungaPa}%`],
      ['Asuransi', `${asuransiPct}% × ${tenorBulan / 12} thn`],
      ['Provisi', `${provisiPct}%`],
      ['Notaris', notaris],
      ['Perikatan', perikatan],
      ['Blokir Angsuran', blokirN],
      [],
      ['Angsuran Pertama', result.summary.angsuranPertama],
      ['Angsuran Terakhir', result.summary.angsuranTerakhir],
      ['Total Angsuran', result.summary.totalAngsuran],
      ['Total Bunga', result.summary.totalBunga],
      ['Total Potongan di Muka', potongan?.total ?? 0],
      ['Dana Diterima', potongan?.danaDiterima ?? 0],
      ['Nama AO', namaAo],
    ];
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

  const handleExportPdf = () => {
    if (!result || !potongan) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(14);
    doc.text('SIMULASI ANGSURAN KREDIT', 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`, 105, 21, { align: 'center' });

    autoTable(doc, {
      startY: 28,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1 },
      body: [
        ['Nama Debitur', ':', namaDebitur, 'Produk', ':', selectedProduct?.nama || ''],
        ['Nomor KTP', ':', nomorKtp, 'Skema', ':', skema.toUpperCase()],
        ['Pekerjaan', ':', pekerjaan, 'Plafon', ':', fmtRp(plafon)],
        ['Instansi', ':', instansi, 'Tenor', ':', `${tenorBulan} bulan`],
        ['Pilihan Karir', ':', pilihanKarir, 'Bunga p.a.', ':', `${bungaPa}%`],
        [
          'Tanggal Pensiun',
          ':',
          pensiunInfo?.tanggalPensiun || '-',
          'Asuransi / Provisi',
          ':',
          `${asuransiPct}% / ${provisiPct}%`,
        ],
        ['Nama AO', ':', namaAo, 'Dana Diterima', ':', fmtRp(potongan.danaDiterima)],
      ],
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      head: [['Ringkasan', 'Nilai']],
      body: [
        ['Angsuran Pertama', fmtRp(result.summary.angsuranPertama)],
        ['Angsuran Terakhir', fmtRp(result.summary.angsuranTerakhir)],
        ['Total Angsuran', fmtRp(result.summary.totalAngsuran)],
        ['Total Bunga', fmtRp(result.summary.totalBunga)],
        ['Total Potongan di Muka', fmtRp(potongan.total)],
        ['Dana Diterima', fmtRp(potongan.danaDiterima)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 4,
      head: [['No', 'Tanggal', 'Pokok', 'Bunga', 'Angsuran', 'Saldo Pokok']],
      body: result.rows.map((r) => [
        r.bulan,
        r.tanggal,
        fmtNumber(r.pokok),
        fmtNumber(r.bunga),
        fmtNumber(r.angsuran),
        fmtNumber(r.saldo),
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`Simulasi_${namaDebitur || 'Loan'}_${Date.now()}.pdf`);
  };

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

              {/* Rate selectors */}
              <div>
                <Label>Bunga p.a. (%)</Label>
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
                <Label>Asuransi / tahun (%)</Label>
                <div className="flex gap-2">
                  {asuransiMode === 'preset' && selectedProduct ? (
                    <Select value={asuransi} onValueChange={setAsuransi}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        {selectedProduct.asuransi_options.map((o) => (
                          <SelectItem key={o.label} value={String(o.value)}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input type="number" step="0.01" value={asuransi} onChange={(e) => setAsuransi(e.target.value)} />
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAsuransiMode(asuransiMode === 'preset' ? 'manual' : 'preset')}
                  >
                    {asuransiMode === 'preset' ? 'Manual' : 'Preset'}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Provisi (%)</Label>
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
                  <Row label="Plafon" value={fmtRp(plafon)} />
                  <Row label="Tenor" value={`${tenorBulan} bulan`} />
                  <Row label="Bunga p.a." value={`${bungaPa}%`} />
                  <hr className="my-2" />
                  <Row label="Angsuran Pertama" value={fmtRp(result.summary.angsuranPertama)} strong />
                  {skema !== 'anuitas' && (
                    <Row label="Angsuran Terakhir" value={fmtRp(result.summary.angsuranTerakhir)} />
                  )}
                  <Row label="Total Angsuran" value={fmtRp(result.summary.totalAngsuran)} />
                  <Row label="Total Bunga" value={fmtRp(result.summary.totalBunga)} />
                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Potongan di Muka</div>
                  <Row label="Asuransi" value={fmtRp(potongan.asuransi)} />
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
