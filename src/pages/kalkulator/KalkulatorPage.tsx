import React, { useMemo, useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useLoanProducts,
  usePensionRules,
  useSaveLoanSimulation,
  useLoanSimulation,
  useUpdateLoanSimulation,
  useLoanAOs,
  DSR_RULES_DEFAULT,
  PILIHAN_KARIR_DEFAULT,
} from '@/hooks/use-loan-calc';
import {
  calcAmortization,
  calcPotongan,
  calcPensiun,
  calcPPPK,
  calcDsr,
  detectPPPK,
  calcMaxPlafonByDSR,
  fmtRp,
  fmtNumber,
  type LoanSkema,
  type BiayaItem,
  type DsrBasis,
} from '@/lib/loan-calc';
import { calcAlamin, calcUmur, cekUnderwriting, type AlaminResult, type UWResult } from '@/lib/alamin-calc';
import { useAlaminConfig, useAlaminTarif, useAlaminUWRules } from '@/hooks/use-alamin';
import { usePromoPrograms, type PromoProgram } from '@/hooks/use-promo-program';
import {
  applyCerdas,
  isCerdasActive,
  getCerdasBunga,
  CERDAS_SKEMA_LABEL,
  type CerdasSkema,
  type CerdasApplyResult,
} from '@/lib/cerdas-calc';
import { Switch } from '@/components/ui/switch';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import {
  Save, Download, FileText, Calculator, AlertTriangle, History, ShieldCheck, ShieldAlert,
  ShieldQuestion, Sparkles, CheckCircle2, Image as ImageIcon, Plus, X, User, Wallet, Receipt, Percent,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { SimulasiCard } from '@/components/kalkulator/SimulasiCard';
import { useAuth } from '@/contexts/AuthContext';
import logoBpd from '@/assets/logo-bankaltimtara.png';

// 'manual' = Pialang Asuransi (nominal diinput manual); 'alamin' = perhitungan Al-Amin otomatis.
type AsuransiProvider = 'manual' | 'alamin';

interface BiayaRow extends BiayaItem {
  nominalStr: string;
}

const KalkulatorPage: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit') || undefined;
  const { canEdit } = useAuth();
  const { data: products = [] } = useLoanProducts(true);
  const { data: pensionRules = [] } = usePensionRules();
  const { data: aoList = [] } = useLoanAOs(true);
  const { data: alaminTarif } = useAlaminTarif();
  const { data: alaminRules = [] } = useAlaminUWRules();
  const { data: alaminConfig } = useAlaminConfig();
  const { data: promoPrograms = [] } = usePromoPrograms(true);
  const save = useSaveLoanSimulation();
  const update = useUpdateLoanSimulation();
  const { data: editRow } = useLoanSimulation(editId);

  // Debitur
  const [nomorKtp, setNomorKtp] = useState('');
  const [namaDebitur, setNamaDebitur] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [instansi, setInstansi] = useState('');
  const [pilihanKarir, setPilihanKarir] = useState('');
  const [tanggalSk, setTanggalSk] = useState('');
  const [namaAo, setNamaAo] = useState('');

  // Loan
  const [productId, setProductId] = useState('');
  const [plafonStr, setPlafonStr] = useState('');
  const [tenor, setTenor] = useState('60');
  const [tanggalAkad, setTanggalAkad] = useState(() => new Date().toISOString().slice(0, 10));
  const [gajiPokokStr, setGajiPokokStr] = useState('');
  const [ttpStr, setTtpStr] = useState('');
  const [bunga, setBunga] = useState('');
  const [bungaMode, setBungaMode] = useState<'preset' | 'manual'>('preset');

  // Angsuran existing
  const [adaAngsuranGaji, setAdaAngsuranGaji] = useState(false);
  const [angsuranGajiStr, setAngsuranGajiStr] = useState('');
  const [adaAngsuranPraja, setAdaAngsuranPraja] = useState(false);
  const [angsuranPrajaStr, setAngsuranPrajaStr] = useState('');

  // Asuransi — dipisah 2: Kredit (kerugian, tanpa subsidi promo) & Jiwa (AJK, kena subsidi promo)
  const [asuransiProvider, setAsuransiProvider] = useState<AsuransiProvider>('manual');
  const [asuransiJiwaStr, setAsuransiJiwaStr] = useState('');
  const [asuransiKreditStr, setAsuransiKreditStr] = useState('');

  const [provisi, setProvisi] = useState('0');
  const [provisiMode, setProvisiMode] = useState<'preset' | 'manual'>('preset');
  const [biayaRows, setBiayaRows] = useState<BiayaRow[]>([]);
  const [blokir, setBlokir] = useState('0');
  const [adaPelunasan, setAdaPelunasan] = useState(false);
  const [outstandingPokok, setOutstandingPokok] = useState('');
  const [outstandingBunga, setOutstandingBunga] = useState('');
  const [dsrBasis, setDsrBasis] = useState<DsrBasis>('gaji');

  // Promo program
  const [promoOn, setPromoOn] = useState(false);
  const [promoId, setPromoId] = useState('');
  const [cerdasSkema, setCerdasSkema] = useState<CerdasSkema>('debitur_baru');

  const selectedProduct = products.find((p) => p.id === productId);
  const dsrRules = selectedProduct?.dsr_rules?.length ? selectedProduct.dsr_rules : DSR_RULES_DEFAULT;
  const dsrRule = dsrRules.find((r) => r.kode === dsrBasis) ?? dsrRules[0];

  const skipProductResetRef = useRef(false);
  useEffect(() => {
    if (!selectedProduct) return;
    if (skipProductResetRef.current) {
      skipProductResetRef.current = false;
      return;
    }
    setBungaMode('preset');
    setProvisiMode('preset');
    setBunga(selectedProduct.bunga_options[0]?.value?.toString() ?? '');
    setProvisi(selectedProduct.provisi_options[0]?.value?.toString() ?? '0');
    const items = selectedProduct.biaya_items?.length
      ? selectedProduct.biaya_items
      : [
          ...(selectedProduct.biaya_notaris ? [{ label: 'Biaya Notaris', nominal: selectedProduct.biaya_notaris }] : []),
          ...(selectedProduct.biaya_perikatan ? [{ label: 'Biaya Perikatan', nominal: selectedProduct.biaya_perikatan }] : []),
        ];
    setBiayaRows(items.map((b) => ({ ...b, nominalStr: b.nominal ? formatCurrencyInput(String(b.nominal)) : '' })));
    setBlokir(String(selectedProduct.blokir_angsuran ?? 0));
    const firstRule = selectedProduct.dsr_rules?.[0]?.kode;
    if (firstRule) setDsrBasis(firstRule);
    if (selectedProduct.asuransi_provider_default === 'alamin') {
      setAsuransiProvider('alamin');
    }
  }, [productId]); // eslint-disable-line

  // Program promo aktif untuk tanggal akad
  const promoCfg: PromoProgram | null =
    promoPrograms.find((p) => p.id === promoId) ?? null;
  useEffect(() => {
    if (promoId || !promoPrograms.length) return;
    const aktif = promoPrograms.find((p) => isCerdasActive(p, tanggalAkad)) ?? promoPrograms[0];
    if (aktif) setPromoId(aktif.id);
  }, [promoPrograms, tanggalAkad, promoId]);

  // Prefill state saat mode edit riwayat
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!editRow || hydratedRef.current) return;
    hydratedRef.current = true;
    skipProductResetRef.current = true;
    setNomorKtp(editRow.nomor_ktp || '');
    setNamaDebitur(editRow.nama_debitur || '');
    setTanggalLahir(editRow.tanggal_lahir || '');
    setJenisKelamin((editRow.jenis_kelamin as 'L' | 'P' | '') || '');
    setPekerjaan(editRow.pekerjaan || '');
    setInstansi(editRow.instansi || '');
    setPilihanKarir(editRow.pilihan_karir || '');
    setTanggalSk(((editRow.hasil_ringkasan as any)?.tanggalSk as string) || '');
    const savedBasis = (editRow.dsr_basis ?? (editRow.hasil_ringkasan as any)?.dsrBasis) as DsrBasis | undefined;
    if (savedBasis === 'gaji' || savedBasis === 'ttp') setDsrBasis(savedBasis);
    setNamaAo(editRow.nama_ao || '');
    setProductId(editRow.product_id || '');
    setPlafonStr(editRow.plafon ? formatCurrencyInput(String(editRow.plafon)) : '');
    setTenor(String(editRow.tenor_bulan || 0));
    setTanggalAkad(editRow.tanggal_akad || new Date().toISOString().slice(0, 10));
    const gp = editRow.gaji_pokok ?? editRow.gaji ?? 0;
    const tt = editRow.ttp ?? 0;
    setGajiPokokStr(gp ? formatCurrencyInput(String(gp)) : '');
    setTtpStr(tt ? formatCurrencyInput(String(tt)) : '');
    if (editRow.angsuran_gaji) {
      setAdaAngsuranGaji(true);
      setAngsuranGajiStr(formatCurrencyInput(String(editRow.angsuran_gaji)));
    }
    if (editRow.angsuran_praja) {
      setAdaAngsuranPraja(true);
      setAngsuranPrajaStr(formatCurrencyInput(String(editRow.angsuran_praja)));
    }
    setBunga(String(editRow.bunga_pa ?? ''));
    setBungaMode('manual');
    const savedCerdas = (editRow.hasil_ringkasan as any)?.cerdas;
    const savedCerdasSkema = (savedCerdas?.skema ?? editRow.cerdas_skema) as CerdasSkema | null;
    const savedDiskonProvisi = Number(savedCerdas?.diskonProvisiPct ?? 0);
    const provisiAwal = savedCerdasSkema === 'top_up' && savedDiskonProvisi > 0
      ? Number(savedCerdas?.provisiPctAsli ?? ((editRow.provisi_pct ?? 0) / (1 - savedDiskonProvisi / 100)))
      : Number(editRow.provisi_pct ?? 0);
    setProvisi(String(Number.isFinite(provisiAwal) ? provisiAwal : editRow.provisi_pct ?? 0));
    setProvisiMode('manual');
    setAsuransiProvider((editRow.asuransi_provider as any) || 'manual');
    const savedSubsidiJiwa = savedCerdasSkema && savedCerdasSkema !== 'top_up'
      ? Number(savedCerdas?.subsidiBank ?? editRow.cerdas_subsidi_bank ?? 0)
      : 0;
    const savedPremiJiwaAktual = Number(
      savedCerdas?.premiAsuransiAktual ??
      ((editRow.asuransi_jiwa_beban ?? Math.max((editRow.asuransi_nominal ?? 0) - (editRow.premi_kredit ?? 0), 0)) + savedSubsidiJiwa)
    );
    setAsuransiJiwaStr(savedPremiJiwaAktual ? formatCurrencyInput(String(savedPremiJiwaAktual)) : '');
    setAsuransiKreditStr(editRow.premi_kredit ? formatCurrencyInput(String(editRow.premi_kredit)) : '');
    const savedBiaya: BiayaItem[] = Array.isArray(editRow.biaya_items) && editRow.biaya_items.length
      ? (editRow.biaya_items as BiayaItem[])
      : [
          ...(editRow.biaya_notaris ? [{ label: 'Biaya Notaris', nominal: editRow.biaya_notaris }] : []),
          ...(editRow.biaya_perikatan ? [{ label: 'Biaya Perikatan', nominal: editRow.biaya_perikatan }] : []),
        ];
    setBiayaRows(savedBiaya.map((b) => ({ ...b, nominalStr: b.nominal ? formatCurrencyInput(String(b.nominal)) : '' })));
    setBlokir(String(editRow.blokir_angsuran ?? 0));
    setAdaPelunasan(!!editRow.ada_pelunasan);
    if (editRow.outstanding_pokok != null) setOutstandingPokok(String(editRow.outstanding_pokok));
    if (editRow.outstanding_bunga != null) setOutstandingBunga(String(editRow.outstanding_bunga));
    if (editRow.cerdas_skema) {
      setPromoOn(true);
      setCerdasSkema(editRow.cerdas_skema as CerdasSkema);
    }
  }, [editRow]);

  const plafon = parseCurrencyValue(plafonStr);
  const gajiPokok = parseCurrencyValue(gajiPokokStr);
  const ttp = parseCurrencyValue(ttpStr);
  const gaji = gajiPokok + ttp;
  const angsuranGaji = adaAngsuranGaji ? parseCurrencyValue(angsuranGajiStr) : 0;
  const angsuranPraja = adaAngsuranPraja ? parseCurrencyValue(angsuranPrajaStr) : 0;
  const biayaItems: BiayaItem[] = biayaRows
    .map((b) => ({ label: b.label, nominal: parseCurrencyValue(b.nominalStr) }))
    .filter((b) => b.label || b.nominal);
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

  // PPPK: masa kontrak dihitung dari tanggal SK
  const jenisPPPK = detectPPPK(pilihanKarir);
  const pppkInfo = useMemo(
    () => (jenisPPPK && tanggalSk ? calcPPPK(tanggalSk, jenisPPPK, tanggalAkad || undefined) : null),
    [jenisPPPK, tanggalSk, tanggalAkad],
  );

  const maxTenorBulan = pppkInfo ? pppkInfo.maxTenor : pensiunInfo ? pensiunInfo.sisaBulanTotal : null;
  const tenorMelebihiPensiun = maxTenorBulan != null && tenorBulan > maxTenorBulan;

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

  // Premi Asuransi Jiwa (AJK) — sumbernya Al-Amin atau input Pialang. INI YANG kena subsidi promo.
  const premiJiwaAktual =
    asuransiProvider === 'alamin'
      ? alamin?.premiGross ?? 0
      : parseCurrencyValue(asuransiJiwaStr);
  const premiKredit = parseCurrencyValue(asuransiKreditStr);

  // Program promo apply (subsidi khusus Asuransi Jiwa)
  const cerdasResult: CerdasApplyResult | null = useMemo(() => {
    if (!promoOn || !promoCfg) return null;
    const savedCerdas = (editRow?.hasil_ringkasan as any)?.cerdas;
    if (editRow && savedCerdas) {
      const savedSkema = (savedCerdas.skema ?? editRow.cerdas_skema) as CerdasSkema | null;
      const savedPremiAktual = Number(savedCerdas.premiAsuransiAktual ?? 0);
      const savedProvisiAwal = Number(savedCerdas.provisiPctAsli ?? provisiInput);
      const sameSavedInput =
        savedSkema === cerdasSkema &&
        plafon === editRow.plafon &&
        Math.abs(premiJiwaAktual - savedPremiAktual) < 1 &&
        Math.abs(provisiInput - savedProvisiAwal) < 0.0001;
      if (sameSavedInput) return savedCerdas as CerdasApplyResult;
    }
    return applyCerdas({
      skema: cerdasSkema,
      plafon,
      premiAsuransiAktual: premiJiwaAktual,
      provisiPctAsli: provisiInput,
      cfg: promoCfg,
    });
  }, [promoOn, promoCfg, cerdasSkema, plafon, premiJiwaAktual, provisiInput, editRow]);

  const promoNama = promoCfg?.nama_program || 'Program Promo';

  const bungaPa = cerdasResult ? cerdasResult.bungaFinal : bungaInput;
  const provisiPct = cerdasResult ? cerdasResult.provisiFinalPct : provisiInput;
  const asuransiJiwaBeban = cerdasResult
    ? (cerdasResult.skema === 'top_up' ? premiJiwaAktual : cerdasResult.selisihDebitur)
    : premiJiwaAktual;
  const asuransiNominal = asuransiJiwaBeban + premiKredit;

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
      biayaItems,
      blokirAngsuran: blokirN,
      angsuranPertama: result.summary.angsuranPertama,
    });
  }, [result, plafon, asuransiNominal, provisiPct, JSON.stringify(biayaItems), blokirN]); // eslint-disable-line

  const pelunasan = useMemo(() => {
    if (!adaPelunasan) return null;
    const pokok = parseInt(outstandingPokok) || 0;
    const bunga = parseInt(outstandingBunga) || 0;
    if (pokok <= 0 && bunga <= 0) return null;
    return { sisaPokok: pokok, bungaBerjalan: bunga, totalPelunasan: pokok + bunga };
  }, [adaPelunasan, outstandingPokok, outstandingBunga]);

  const danaBersih = useMemo(() => {
    if (!potongan) return 0;
    return potongan.danaDiterima - (pelunasan?.totalPelunasan ?? 0);
  }, [potongan, pelunasan]);

  // ==== DSR ====
  const angsuranPertama = result?.summary.angsuranPertama ?? 0;
  const dsr = useMemo(
    () =>
      calcDsr({
        basis: dsrBasis,
        gajiPokok,
        ttp,
        maxPct: dsrRule?.max_pct ?? (dsrBasis === 'ttp' ? 30 : 100),
        angsuranGaji,
        angsuranPraja,
        angsuranPertama,
      }),
    [dsrBasis, gajiPokok, ttp, dsrRule, angsuranGaji, angsuranPraja, angsuranPertama],
  );
  const dsrColor = dsr.aman === null ? 'bg-muted' : dsr.aman ? 'bg-emerald-600' : 'bg-rose-600';

  const handleHitungMaxPlafon = () => {
    if (dsr.maxAngsuran <= 0 || tenorBulan <= 0 || bungaPa <= 0) {
      toast({ title: 'Lengkapi gaji/TTP, tenor, bunga dulu', variant: 'destructive' });
      return;
    }
    const max = calcMaxPlafonByDSR({
      gaji: dsr.maxAngsuran,
      dsrPct: 100,
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
    const payload = {
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
      gaji_pokok: gajiPokok,
      ttp,
      angsuran_gaji: angsuranGaji,
      angsuran_praja: angsuranPraja,
      dsr_basis: dsrBasis,
      dsr_max_pct: dsr.maxPct,
      bunga_pa: bungaPa,
      asuransi_provider: asuransiProvider,
      asuransi_nominal: asuransiNominal,
      asuransi_pct: 0,
      asuransi_jiwa_beban: asuransiJiwaBeban,
      premi_kredit: premiKredit,
      provisi_pct: provisiPct,
      biaya_items: potongan.biaya,
      biaya_notaris: potongan.notaris,
      biaya_perikatan: potongan.perikatan,
      blokir_angsuran: blokirN,
      ada_pelunasan: adaPelunasan,
      pelunasan_bulan_ke: null,
      outstanding_pokok: adaPelunasan ? (parseInt(outstandingPokok) || 0) : null,
      outstanding_bunga: adaPelunasan ? (parseInt(outstandingBunga) || 0) : null,
      nama_ao: namaAo || null,
      hasil_ringkasan: {
        ...result.summary,
        ...potongan,
        danaDiterima: danaBersih,
        dsrBasis,
        dsrPct: dsr.dsrPct,
        dsrMaxAngsuran: dsr.maxAngsuran,
        dsrMaxPct: dsr.maxPct,
        selisihAG: dsr.selisihAG,
        angsuranPraja,
        tanggalSk: tanggalSk || null,
        pppkMaxTenor: pppkInfo?.maxTenor ?? null,
        promoNama: cerdasResult ? promoNama : null,
        cerdas: cerdasResult ? { ...cerdasResult, programNama: promoNama, provisiPctAsli: provisiInput, bungaPctAsli: bungaInput } : null,
      },
      tabel_angsuran: result.rows,
      cerdas_skema: cerdasResult ? cerdasResult.skema : null,
      cerdas_cap_subsidi: cerdasResult ? cerdasResult.capSubsidi : null,
      cerdas_subsidi_bank: cerdasResult ? cerdasResult.subsidiBank : null,
      cerdas_selisih_debitur: cerdasResult ? cerdasResult.selisihDebitur : null,
    } as any;
    try {
      if (editId) {
        await update.mutateAsync({ id: editId, patch: payload });
        toast({ title: 'Simulasi diperbarui' });
        navigate('/kalkulator/riwayat');
      } else {
        await save.mutateAsync(payload);
        toast({ title: 'Simulasi tersimpan' });
      }
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
      ['Sumber Asuransi Jiwa', asuransiProvider === 'alamin' ? "Al-Amin (AT TA'MIN UM)" : 'Pialang Asuransi'],
      ['Asuransi Jiwa — Premi Aktual (Rp)', premiJiwaAktual],
      [`Asuransi Jiwa — Subsidi Bank (${promoNama})`, cerdasResult && cerdasResult.skema !== 'top_up' ? cerdasResult.subsidiBank : 0],
      ['Asuransi Jiwa — Beban Debitur (Rp)', asuransiJiwaBeban],
      ['Asuransi Kredit — Pialang (Rp)', premiKredit],
      ['Total Asuransi masuk potongan (Rp)', potongan.asuransi],
      ['Provisi', `${provisiPct}%`],
      ...potongan.biaya.map((b) => [b.label, b.nominal]),
      ['Blokir Angsuran', `${blokirN}× angsuran pertama`],
      [],
      ['Kategori DSR', dsr.label],
      ['Basis Penghasilan', dsr.basisNilai],
      ['Angsuran Gaji', angsuranGaji],
      ['Selisih AG', dsr.selisihAG],
      ['Angsuran Praja (AP)', angsuranPraja],
      ['Angsuran Maksimal (DSR)', dsr.maxAngsuran],
      [],
      ['Angsuran Pertama', result.summary.angsuranPertama],
      ['Total Angsuran', result.summary.totalAngsuran],
      ['Total Bunga', result.summary.totalBunga],
      ['Total Potongan di Muka', potongan.total],
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
        ['Premi Net (bank -> Al-Amin)', alamin.premiNet],
      );
      if (underwriting) {
        ringkasan.push(['Underwriting', `${underwriting.kode} — ${underwriting.keterangan}`]);
      }
    }
    if (pelunasan) {
      ringkasan.push(
        [],
        ['— Top Up / Pelunasan (sudah dipotong dari Dana Diterima) —'],
        ['Sisa Pokok', pelunasan.sisaPokok],
        ['Bunga Berjalan', pelunasan.bungaBerjalan],
        ['Total Pelunasan', pelunasan.totalPelunasan],
      );
    }
    ringkasan.push([], ['Dana Diterima', danaBersih]);
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
  // PDF EXPORT
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

    const drawWatermark = () => {
      const gState = (doc as any).GState ? new (doc as any).GState({ opacity: 0.06 }) : null;
      if (gState) (doc as any).setGState(gState);
      doc.setTextColor(0, 63, 127);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const stepX = 42;
      const stepY = 24;
      for (let row = 0; row * stepY < pageH + stepY; row++) {
        const offset = (row % 2) * (stepX / 2);
        for (let col = -1; col * stepX - offset < pageW + stepX; col++) {
          doc.text('SIMULASI', col * stepX - offset, row * stepY, { angle: 30 });
        }
      }
      const gReset = (doc as any).GState ? new (doc as any).GState({ opacity: 1 }) : null;
      if (gReset) (doc as any).setGState(gReset);
    };
    (doc as any).internal.events.subscribe('addPage', drawWatermark);
    drawWatermark();

    try {
      const logoData = await fetch(logoBpd).then((r) => r.blob()).then(
        (b) =>
          new Promise<string>((res) => {
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

    doc.setFillColor(...BRAND_BLUE);
    doc.rect(M, M + 21, pageW - 2 * M, 1.2, 'F');
    doc.setFillColor(...BRAND_ORANGE);
    doc.rect(M, M + 22.4, pageW - 2 * M, 0.5, 'F');

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
          'Jenis Kelamin', ':',
          jenisKelamin === 'L' ? 'Laki-laki' : jenisKelamin === 'P' ? 'Perempuan' : '-',
          'Plafon', ':', fmtRp(plafon),
        ],
        [
          'Tanggal Lahir', ':',
          tanggalLahir ? new Date(tanggalLahir).toLocaleDateString('id-ID') : '-',
          'Tenor', ':', `${tenorBulan} bulan`,
        ],
        [
          'Umur', ':', umur ? `${umur} tahun` : '-',
          'Tanggal Akad', ':', tanggalAkad ? new Date(tanggalAkad).toLocaleDateString('id-ID') : '-',
        ],
        ['Pekerjaan', ':', pekerjaan || '-', 'Bunga p.a.', ':', `${bungaPa}%`],
        ['Instansi', ':', instansi || '-', 'Penghasilan', ':', fmtRp(gaji)],
        [
          'Pilihan Karir', ':', pilihanKarir || '-',
          `DSR ${dsr.basis.toUpperCase()}`, ':',
          dsr.basisNilai > 0 ? `${dsr.dsrPct.toFixed(1)}% (maks ${fmtRp(dsr.maxAngsuran)})` : '-',
        ],
        [
          'Tanggal Pensiun', ':',
          pensiunInfo ? new Date(pensiunInfo.tanggalPensiun).toLocaleDateString('id-ID') : '-',
          'Provider Asuransi', ':',
          asuransiProvider === 'alamin' ? "Al-Amin (AT TA'MIN UM)" : 'Pialang Asuransi',
        ],
        [
          'Sisa Masa Kerja', ':',
          pensiunInfo ? `${pensiunInfo.sisaTahun} thn ${pensiunInfo.sisaBulan} bln` : '-',
          'Nama AO', ':', namaAo || '-',
        ],
      ],
      margin: { left: M, right: M },
    });

    let yy = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: yy,
      head: [['Komponen Potongan di Muka', 'Dasar Perhitungan', 'Nilai (Rp)']],
      body: [
        [
          'Asuransi',
          asuransiProvider === 'alamin' && alamin
            ? `Al-Amin: Tarif ${alamin.rate.toFixed(2)}/1.000 × Plafon (umur ${umur}, ${tenorBulan} bln)`
            : 'Pialang (input nominal premi)',
          fmtNumber(potongan.asuransi),
        ],
        ['Provisi', `${provisiPct}% × Plafon`, fmtNumber(potongan.provisi)],
        ...potongan.biaya.map((b) => [b.label, '—', fmtNumber(b.nominal)]),
        ['Blokir Angsuran', blokirN > 0 ? `${blokirN} × Angsuran Pertama` : '—', fmtNumber(potongan.blokir)],
        [
          { content: 'TOTAL POTONGAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: ZEBRA } },
          { content: fmtNumber(potongan.total), styles: { fontStyle: 'bold', fillColor: ZEBRA } },
        ],
      ],
      styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 38, halign: 'right' } },
      margin: { left: M, right: M },
    });

    if (alamin) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      const uwColor: [number, number, number] =
        underwriting?.status === 'aman' ? [22, 163, 74] : underwriting?.status === 'medis' ? [217, 119, 6] : [220, 38, 38];
      autoTable(doc, {
        startY: yy,
        head: [[{ content: "DETAIL PREMI AL-AMIN (AT TA'MIN UM)", colSpan: 2, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' } }]],
        body: [
          ['Premi Gross (yang masuk potongan)', fmtRp(alamin.premiGross)],
          ['Ujroh Gross (10% × Premi Gross)', fmtRp(alamin.ujrohGross)],
          ['Pajak Ujroh (2% × Ujroh Gross)', fmtRp(alamin.pajak)],
          ['Ujroh Net (feebase bank)', fmtRp(alamin.ujrohNet)],
          ['Premi Net (bank -> Al-Amin)', fmtRp(alamin.premiNet)],
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

    if (cerdasResult) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      const statusColor: [number, number, number] =
        cerdasResult.status === 'gratis' ? [22, 163, 74] : cerdasResult.status === 'selisih' ? [217, 119, 6] : [100, 116, 139];
      const cerdasBody: any[][] = [
        ['Skema Promo', cerdasResult.skemaLabel],
        ['Bunga Promo', `${cerdasResult.bungaFinal}% p.a. fixed`],
      ];
      if (cerdasResult.skema === 'top_up') {
        cerdasBody.push(['Diskon Provisi', `${cerdasResult.diskonProvisiPct}% (${(parseFloat(provisi) || 0).toFixed(2)}% -> ${cerdasResult.provisiFinalPct.toFixed(2)}%)`]);
      } else if (cerdasResult.tier) {
        cerdasBody.push(
          ['Tier Plafon', cerdasResult.tier.label],
          ['Cap Subsidi AJK', fmtRp(cerdasResult.capSubsidi)],
          ['Premi AJK Aktual', fmtRp(cerdasResult.premiAsuransiAktual)],
          [{ content: 'Subsidi Bank', styles: { fontStyle: 'bold' } }, { content: `- ${fmtRp(cerdasResult.subsidiBank)}`, styles: { fontStyle: 'bold', textColor: [22, 163, 74], halign: 'right' } }],
          [
            { content: 'Beban Debitur (AJK)', styles: { fontStyle: 'bold' } },
            { content: cerdasResult.selisihDebitur === 0 ? 'GRATIS' : fmtRp(cerdasResult.selisihDebitur), styles: { fontStyle: 'bold', textColor: statusColor, halign: 'right' } },
          ],
        );
      }
      cerdasBody.push([{ content: cerdasResult.pesan, colSpan: 2, styles: { fontStyle: 'italic', textColor: statusColor, fillColor: [254, 252, 232] } }]);
      autoTable(doc, {
        startY: yy,
        head: [[{ content: `PROGRAM PROMO — ${promoNama.toUpperCase()}`, colSpan: 2, styles: { fillColor: [245, 130, 32], textColor: 255, fontStyle: 'bold' } }]],
        body: cerdasBody,
        styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
        columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: M, right: M },
      });
    }

    if (pelunasan) {
      yy = (doc as any).lastAutoTable.finalY + 4;
      autoTable(doc, {
        startY: yy,
        head: [[{ content: 'TOP UP / PELUNASAN — Outstanding (sudah dipotong dari Dana Diterima)', colSpan: 2, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold' } }]],
        body: [
          ['Outstanding Pokok', fmtRp(pelunasan.sisaPokok)],
          ['Outstanding Bunga', fmtRp(pelunasan.bungaBerjalan)],
          ['Total Pelunasan', fmtRp(pelunasan.totalPelunasan)],
        ],
        styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
        columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { halign: 'right' } },
        margin: { left: M, right: M },
      });
    }

    yy = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: yy,
      body: [
        [
          { content: 'DANA DITERIMA DEBITUR (NILAI BERSIH)', styles: { fontStyle: 'bold', halign: 'right', fillColor: BRAND_ORANGE, textColor: 255 } },
          { content: fmtNumber(danaBersih), styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255, halign: 'right' } },
        ],
      ],
      styles: { fontSize: 9, cellPadding: 2.5, textColor: TEXT_DARK },
      columnStyles: { 0: { cellWidth: 80, fontStyle: 'bold' }, 1: { halign: 'right' } },
      margin: { left: M, right: M },
    });

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

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setTextColor(120);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Dokumen simulasi — bukan dokumen perjanjian kredit. Nilai dapat berubah sewaktu-waktu.', M, pageH - 6);
      doc.text(`Hal ${i} / ${totalPages}  ·  AO: ${namaAo || '-'}`, pageW - M, pageH - 6, { align: 'right' });
    }

    doc.save(`Simulasi_${namaDebitur || 'Loan'}_${Date.now()}.pdf`);
  };

  // ---- Export JPG ----
  const jpgCardRef = useRef<HTMLDivElement>(null);
  const handleExportJpg = async () => {
    if (!jpgCardRef.current) return;
    try {
      const canvas = await html2canvas(jpgCardRef.current, {
        scale: 4,
        backgroundColor: '#ffffff',
        useCORS: true,
        imageTimeout: 0,
        logging: false,
      });
      const url = canvas.toDataURL('image/jpeg', 1.0);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Simulasi_${namaDebitur || 'Loan'}_${Date.now()}.jpg`;
      a.click();
      toast({ title: 'Gambar simulasi diunduh' });
    } catch (e: any) {
      toast({ title: 'Gagal membuat gambar', description: e.message, variant: 'destructive' });
    }
  };

  const uwBadgeVariant = underwriting?.status === 'aman'
    ? 'success'
    : underwriting?.status === 'medis'
    ? 'warning'
    : 'destructive';
  const UwIcon =
    underwriting?.status === 'aman' ? ShieldCheck : underwriting?.status === 'medis' ? ShieldQuestion : ShieldAlert;

  const updateBiaya = (i: number, patch: Partial<BiayaRow>) =>
    setBiayaRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <MainLayout>
      <PageHeader
        title={editId ? 'Edit Simulasi Loan' : 'Kalkulator Konsumtif'}
        description={editId ? 'Menyunting simulasi tersimpan — perubahan akan menimpa data lama.' : 'Input bertahap per tab, hasil hitungan tampil berdampingan tanpa perlu scroll.'}
        actions={
          <div className="flex gap-2">
            {editId && (
              <Button variant="ghost" onClick={() => { setSearchParams({}); navigate('/kalkulator/riwayat'); }}>
                Batal Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/kalkulator/riwayat')}>
              <History className="w-4 h-4 mr-2" /> Riwayat
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* FORM — TABBED */}
        <div className="xl:col-span-2">
          <Tabs defaultValue="debitur" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="debitur"><User className="w-4 h-4 mr-1.5" /> Debitur</TabsTrigger>
              <TabsTrigger value="kredit"><Calculator className="w-4 h-4 mr-1.5" /> Kredit</TabsTrigger>
              <TabsTrigger value="penghasilan"><Wallet className="w-4 h-4 mr-1.5" /> Penghasilan</TabsTrigger>
              <TabsTrigger value="biaya"><Receipt className="w-4 h-4 mr-1.5" /> Biaya</TabsTrigger>
            </TabsList>

            {/* ================= TAB 1: DEBITUR ================= */}
            <TabsContent value="debitur" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Data Calon Debitur</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Nomor KTP</Label>
                    <Input value={nomorKtp} onChange={(e) => setNomorKtp(e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="16 digit" />
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
                    <RadioGroup value={jenisKelamin} onValueChange={(v) => setJenisKelamin(v as 'L' | 'P')} className="flex gap-4 pt-2">
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
                      <SelectTrigger><SelectValue placeholder="Pilih karir" /></SelectTrigger>
                      <SelectContent>
                        {(pensionRules.length ? pensionRules.map((r) => r.pilihan_karir) : PILIHAN_KARIR_DEFAULT).map((k) => (
                          <SelectItem key={k} value={k}>{k}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {jenisPPPK && (
                    <div>
                      <Label>Tanggal SK Diterbitkan</Label>
                      <Input type="date" value={tanggalSk} onChange={(e) => setTanggalSk(e.target.value)} />
                      <p className="text-xs text-muted-foreground mt-1">
                        PPPK {jenisPPPK === 'penuh' ? 'Penuh Waktu (kontrak 5 tahun, tenor maks 59 bln)' : 'Paruh Waktu (kontrak 12 bulan, tenor maks 10 bln)'}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label>Pekerjaan</Label>
                    <Input value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} />
                  </div>
                  <div>
                    <Label>Instansi</Label>
                    <Input value={instansi} onChange={(e) => setInstansi(e.target.value)} />
                  </div>
                  {pppkInfo && (
                    <div className="md:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>Masa kontrak berakhir: <strong>{new Date(pppkInfo.tanggalBerakhir).toLocaleDateString('id-ID')}</strong></span>
                        <span>Sisa jangka waktu: <strong>{pppkInfo.sisaTahun} thn {pppkInfo.sisaBulan} bln ({pppkInfo.sisaBulanTotal} bulan)</strong></span>
                        <span>Tenor maksimal: <strong>{pppkInfo.maxTenor} bulan</strong></span>
                      </div>
                      {pppkInfo.sudahBerakhir && (
                        <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Masa kontrak PPPK sudah berakhir.
                        </p>
                      )}
                    </div>
                  )}
                  {pensiunInfo && !pppkInfo && (
                    <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>Umur: <strong>{pensiunInfo.umurTahun} thn {pensiunInfo.umurBulan} bln</strong></span>
                        <span>Pensiun: <strong>{new Date(pensiunInfo.tanggalPensiun).toLocaleDateString('id-ID')}</strong></span>
                        <span>Sisa masa kerja: <strong>{pensiunInfo.sisaTahun} thn {pensiunInfo.sisaBulan} bln ({pensiunInfo.sisaBulanTotal} bulan)</strong></span>
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <Label>Nama AO</Label>
                    {aoList.length ? (
                      <Select value={namaAo} onValueChange={setNamaAo}>
                        <SelectTrigger><SelectValue placeholder="Pilih AO" /></SelectTrigger>
                        <SelectContent>
                          {aoList.map((a) => (
                            <SelectItem key={a.id} value={a.nama}>
                              {a.nama}{a.jabatan ? ` — ${a.jabatan}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={namaAo} onChange={(e) => setNamaAo(e.target.value)} placeholder="Daftar AO belum diatur di konfigurasi" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= TAB 2: KREDIT ================= */}
            <TabsContent value="kredit" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Data Pinjaman</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label>Produk Kredit</Label>
                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger><SelectValue placeholder="Pilih produk" /></SelectTrigger>
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
                    <Input value={plafonStr} onChange={(e) => setPlafonStr(formatCurrencyInput(e.target.value))} placeholder="0" />
                  </div>
                  <div>
                    <Label>Jangka Waktu (bulan)</Label>
                    <Input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} />
                    {tenorMelebihiPensiun && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{' '}
                        {pppkInfo
                          ? `Tenor melebihi batas masa kontrak PPPK (maks ${pppkInfo.maxTenor} bulan)`
                          : `Tenor melebihi sisa masa kerja sampai pensiun (${maxTenorBulan} bulan)`}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Tanggal Akad</Label>
                    <Input type="date" value={tanggalAkad} onChange={(e) => setTanggalAkad(e.target.value)} />
                  </div>
                  <div>
                    <Label className="flex items-center justify-between">
                      <span>Bunga p.a. (%)</span>
                      {cerdasResult && (
                        <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Promo: {cerdasResult.bungaFinal}%
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      {bungaMode === 'preset' && selectedProduct ? (
                        <Select value={bunga} onValueChange={setBunga}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {selectedProduct.bunga_options.map((o) => (
                              <SelectItem key={o.label} value={String(o.value)}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type="number" step="0.01" value={bunga} onChange={(e) => setBunga(e.target.value)} />
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => setBungaMode(bungaMode === 'preset' ? 'manual' : 'preset')}>
                        {bungaMode === 'preset' ? 'Manual' : 'Preset'}
                      </Button>
                    </div>
                  </div>
                  <div className="md:col-span-2 pt-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="pelunasan" checked={adaPelunasan} onCheckedChange={(c) => setAdaPelunasan(!!c)} />
                      <Label htmlFor="pelunasan" className="cursor-pointer">Top Up? Ada Pelunasan?</Label>
                    </div>
                    {adaPelunasan && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border border-dashed p-3 bg-muted/20">
                        <div>
                          <Label>Outstanding Pokok (Rp)</Label>
                          <Input type="number" inputMode="numeric" value={outstandingPokok} onChange={(e) => setOutstandingPokok(e.target.value)} placeholder="Lihat di core" />
                        </div>
                        <div>
                          <Label>Outstanding Bunga (Rp)</Label>
                          <Input type="number" inputMode="numeric" value={outstandingBunga} onChange={(e) => setOutstandingBunga(e.target.value)} placeholder="Lihat di core" />
                        </div>
                        <p className="md:col-span-2 text-xs text-muted-foreground">Diisi manual sesuai data outstanding di core banking.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* PROGRAM PROMO */}
              {promoPrograms.length > 0 && (
                <Card className={promoOn ? 'border-amber-400 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10' : ''}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between gap-3 flex-wrap">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Program Promo
                        {promoCfg && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {new Date(promoCfg.periode_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} — {new Date(promoCfg.periode_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Badge>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="promo-switch" className="text-sm font-normal cursor-pointer">Ikut Promo</Label>
                        <Switch
                          id="promo-switch"
                          checked={promoOn}
                          onCheckedChange={(v) => setPromoOn(v && isCerdasActive(promoCfg, tanggalAkad))}
                          disabled={!isCerdasActive(promoCfg, tanggalAkad)}
                        />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Pilih Program</Label>
                      <Select value={promoId} onValueChange={(v) => { setPromoId(v); setPromoOn(false); }}>
                        <SelectTrigger><SelectValue placeholder="Pilih program promo" /></SelectTrigger>
                        <SelectContent>
                          {promoPrograms.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.nama_program}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {promoCfg?.deskripsi && <p className="text-xs text-muted-foreground mt-1">{promoCfg.deskripsi}</p>}
                    </div>
                    {!isCerdasActive(promoCfg, tanggalAkad) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Tanggal akad di luar periode program ini.
                      </p>
                    )}
                    {promoOn && promoCfg && (
                      <>
                        <RadioGroup value={cerdasSkema} onValueChange={(v) => setCerdasSkema(v as CerdasSkema)} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {(['debitur_baru', 'take_over', 'top_up'] as CerdasSkema[]).map((sk) => {
                            const bungaSk = getCerdasBunga(sk, promoCfg);
                            const active = cerdasSkema === sk;
                            const isTopUp = sk === 'top_up';
                            return (
                              <label
                                key={sk}
                                htmlFor={`promo-${sk}`}
                                className={`cursor-pointer rounded-lg border-2 p-3 transition-all ${
                                  active
                                    ? isTopUp ? 'border-amber-500 bg-amber-100/60 dark:bg-amber-900/30' : 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/30'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <RadioGroupItem value={sk} id={`promo-${sk}`} className="mt-1" />
                                  <div className="flex-1">
                                    <div className="text-xs uppercase font-bold tracking-wide text-muted-foreground">{CERDAS_SKEMA_LABEL[sk]}</div>
                                    <div className={`text-2xl font-bold mt-1 ${isTopUp ? 'text-amber-700 dark:text-amber-400' : 'text-primary'}`}>
                                      {isTopUp ? `${promoCfg.diskon_provisi_top_up_pct}%` : `${bungaSk.toFixed(2).replace('.', ',')}%`}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {isTopUp ? `Diskon provisi · Bunga ${bungaSk}% p.a.` : 'p.a. fixed · Subsidi AJK'}
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
                                    <span className="text-right text-emerald-700 dark:text-emerald-400 font-medium">− {fmtRp(cerdasResult.subsidiBank)}</span>
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
            </TabsContent>

            {/* ================= TAB 3: PENGHASILAN & DSR ================= */}
            <TabsContent value="penghasilan" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Penghasilan & DSR</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Gaji Pokok / Bulan</Label>
                    <Input value={gajiPokokStr} onChange={(e) => setGajiPokokStr(formatCurrencyInput(e.target.value))} placeholder="0" />
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox id="ag" checked={adaAngsuranGaji} onCheckedChange={(c) => setAdaAngsuranGaji(!!c)} />
                      <Label htmlFor="ag" className="cursor-pointer font-normal text-sm">Angsuran Gaji (jika ada)</Label>
                    </div>
                    {adaAngsuranGaji && (
                      <>
                        <Input
                          className="mt-2"
                          value={angsuranGajiStr}
                          onChange={(e) => setAngsuranGajiStr(formatCurrencyInput(e.target.value))}
                          placeholder="0"
                        />
                        {dsr.selisihAG > 0 ? (
                          <p className="text-xs text-rose-600 mt-1">
                            Selisih AG: <b>{fmtRp(dsr.selisihAG)}</b> (angsuran gaji melebihi gaji pokok) — mengurangi DSR TTP.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Angsuran gaji masih dalam batas gaji pokok (Selisih AG = Rp 0).</p>
                        )}
                      </>
                    )}
                  </div>
                  <div>
                    <Label>Pendapatan Lainnya (TTP)</Label>
                    <Input value={ttpStr} onChange={(e) => setTtpStr(formatCurrencyInput(e.target.value))} placeholder="0" />
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox id="ap" checked={adaAngsuranPraja} onCheckedChange={(c) => setAdaAngsuranPraja(!!c)} />
                      <Label htmlFor="ap" className="cursor-pointer font-normal text-sm">Angsuran Praja (jika ada)</Label>
                    </div>
                    {adaAngsuranPraja && (
                      <Input
                        className="mt-2"
                        value={angsuranPrajaStr}
                        onChange={(e) => setAngsuranPrajaStr(formatCurrencyInput(e.target.value))}
                        placeholder="0"
                      />
                    )}
                    {gaji > 0 && <p className="text-xs text-muted-foreground mt-2">Total penghasilan: <b>{fmtRp(gaji)}</b></p>}
                  </div>

                  <div className="md:col-span-2 rounded-lg border border-dashed p-3 space-y-3 bg-muted/20">
                    <div>
                      <Label>Kategori DSR (sesuai konfigurasi produk)</Label>
                      <RadioGroup value={dsrBasis} onValueChange={(v) => setDsrBasis(v as DsrBasis)} className="flex flex-wrap gap-4 pt-2">
                        {dsrRules.map((r) => (
                          <div key={r.kode} className="flex items-center gap-2">
                            <RadioGroupItem value={r.kode} id={`dsr-${r.kode}`} />
                            <Label htmlFor={`dsr-${r.kode}`} className="cursor-pointer font-normal">
                              {r.label} — maks {r.max_pct}% {r.kode === 'ttp' ? 'dari TTP' : 'dari Gaji Pokok'}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      <p className="text-xs text-muted-foreground mt-2">
                        {dsrBasis === 'ttp'
                          ? `Angsuran maksimal = ${dsr.maxPct}% × TTP − Selisih AG − AP.`
                          : `Angsuran maksimal = ${dsr.maxPct}% dari Gaji Pokok (TTP hanya menambah basis penghasilan).`}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <MiniStat label="Basis Penghasilan" value={fmtRp(dsr.basisNilai)} />
                      <MiniStat label="Selisih AG" value={fmtRp(dsr.selisihAG)} />
                      <MiniStat label="Angsuran Praja" value={fmtRp(dsr.angsuranPraja)} />
                      <MiniStat label="Angsuran Maksimal" value={fmtRp(dsr.maxAngsuran)} />
                    </div>
                    {dsr.aman === false && (
                      <p className="text-xs text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Angsuran {fmtRp(angsuranPertama)} melebihi batas {fmtRp(dsr.maxAngsuran)}.
                      </p>
                    )}
                    <Button type="button" variant="secondary" onClick={handleHitungMaxPlafon} className="w-full">
                      <Calculator className="w-4 h-4 mr-2" /> Hitung Max Plafon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= TAB 4: BIAYA & ASURANSI ================= */}
            <TabsContent value="biaya" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Provisi & Biaya</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center justify-between">
                      <span>Provisi (%)</span>
                      {cerdasResult?.skema === 'top_up' && (
                        <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Promo: {cerdasResult.provisiFinalPct.toFixed(2)}%
                        </span>
                      )}
                    </Label>
                    <div className="flex gap-2">
                      {provisiMode === 'preset' && selectedProduct ? (
                        <Select value={provisi} onValueChange={setProvisi}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            {selectedProduct.provisi_options.map((o) => (
                              <SelectItem key={o.label} value={String(o.value)}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input type="number" step="0.01" value={provisi} onChange={(e) => setProvisi(e.target.value)} />
                      )}
                      <Button type="button" variant="outline" size="sm" onClick={() => setProvisiMode(provisiMode === 'preset' ? 'manual' : 'preset')}>
                        {provisiMode === 'preset' ? 'Manual' : 'Preset'}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Blokir Angsuran</Label>
                    <Select value={blokir} onValueChange={setBlokir}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Tidak Ada</SelectItem>
                        <SelectItem value="1">1× Angsuran</SelectItem>
                        <SelectItem value="2">2× Angsuran</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Biaya Lain (dapat ditambah / dihapus)</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setBiayaRows([...biayaRows, { label: '', nominal: 0, nominalStr: '' }])}>
                        <Plus className="w-4 h-4 mr-1" /> Tambah Biaya
                      </Button>
                    </div>
                    {biayaRows.length === 0 && (
                      <p className="text-xs text-muted-foreground">Belum ada biaya. Preset biaya dapat diatur di Konfigurasi Kalkulator → Produk.</p>
                    )}
                    {biayaRows.map((b, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          className="flex-1"
                          placeholder="Nama biaya (mis. Biaya Notaris)"
                          value={b.label}
                          onChange={(e) => updateBiaya(i, { label: e.target.value })}
                        />
                        <Input
                          className="w-48"
                          placeholder="0"
                          value={b.nominalStr}
                          onChange={(e) => updateBiaya(i, { nominalStr: formatCurrencyInput(e.target.value) })}
                        />
                        <Button type="button" size="icon" variant="ghost" onClick={() => setBiayaRows(biayaRows.filter((_, idx) => idx !== i))}>
                          <X className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ASURANSI */}
              <Card>
                <CardHeader><CardTitle className="text-base">Asuransi</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold">Asuransi Jiwa (AJK)</div>
                        <div className="text-[11px] text-muted-foreground">Kena subsidi Program Promo bila aktif.</div>
                      </div>
                      <Select value={asuransiProvider} onValueChange={(v) => setAsuransiProvider(v as AsuransiProvider)}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Pialang Asuransi</SelectItem>
                          <SelectItem value="alamin">Al-Amin (AT TA'MIN UM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {asuransiProvider === 'manual' && (
                      <div>
                        <Label>Premi Asuransi Jiwa (Rp) — Pialang</Label>
                        <Input value={asuransiJiwaStr} onChange={(e) => setAsuransiJiwaStr(formatCurrencyInput(e.target.value))} placeholder="0" />
                        <p className="text-xs text-muted-foreground mt-1">Nominal premi jiwa dari quotation Pialang Asuransi.</p>
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
                          <div className="rounded-lg border bg-background p-4 space-y-2 text-sm">
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
                              <span>{'Premi Net (bank -> Al-Amin)'}</span><span className="text-right">{fmtRp(alamin.premiNet)}</span>
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
                  </div>

                  <div className="rounded-lg border p-4 space-y-3 bg-muted/10">
                    <div>
                      <div className="text-sm font-semibold">Asuransi Kredit — Pialang Asuransi</div>
                      <div className="text-[11px] text-muted-foreground">
                        Nominal diisi manual. <strong>Tidak</strong> mendapatkan subsidi Program Promo.
                      </div>
                    </div>
                    <div>
                      <Label>Premi Asuransi Kredit (Rp)</Label>
                      <Input value={asuransiKreditStr} onChange={(e) => setAsuransiKreditStr(formatCurrencyInput(e.target.value))} placeholder="0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* RESULT */}
        <div className="space-y-4">
          <Card className="xl:sticky xl:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
                Ringkasan
                {result && dsr.basisNilai > 0 && (
                  <Badge className={`${dsrColor} text-white`}>DSR {dsr.dsrPct.toFixed(1)}% · {dsrBasis.toUpperCase()}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm max-h-[calc(100vh-12rem)] overflow-auto">
              {!result && <p className="text-muted-foreground">Isi plafon & tenor untuk melihat simulasi.</p>}
              {result && potongan && (
                <>
                  <Row label="Skema" value={skema.toUpperCase()} />
                  {cerdasResult && (
                    <div className="flex justify-between items-center -mt-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> {promoNama}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{cerdasResult.skemaLabel}</Badge>
                    </div>
                  )}
                  <Row label="Plafon" value={fmtRp(plafon)} />
                  <Row label="Tenor" value={`${tenorBulan} bulan`} />
                  <Row label="Bunga p.a." value={`${bungaPa}%${cerdasResult ? ' (promo)' : ''}`} />
                  <hr className="my-2" />
                  <Row label="Angsuran Pertama" value={fmtRp(result.summary.angsuranPertama)} strong />
                  {skema !== 'anuitas' && <Row label="Angsuran Terakhir" value={fmtRp(result.summary.angsuranTerakhir)} />}
                  <Row label="Total Angsuran" value={fmtRp(result.summary.totalAngsuran)} />
                  <Row label="Total Bunga" value={fmtRp(result.summary.totalBunga)} />
                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Kapasitas Angsuran (DSR)</div>
                  <Row label={dsr.label} value={fmtRp(dsr.maxAngsuran)} />
                  {dsr.selisihAG > 0 && <Row label="Selisih AG (pengurang)" value={`− ${fmtRp(dsr.selisihAG)}`} />}
                  {dsr.angsuranPraja > 0 && <Row label="Angsuran Praja (pengurang)" value={`− ${fmtRp(dsr.angsuranPraja)}`} />}
                  <hr className="my-2" />
                  <div className="text-xs uppercase text-muted-foreground font-semibold">Potongan di Muka</div>
                  <Row
                    label={`Asuransi Jiwa${asuransiProvider === 'alamin' ? ' (Al-Amin)' : ' (Pialang)'}${
                      cerdasResult && cerdasResult.skema !== 'top_up'
                        ? cerdasResult.selisihDebitur === 0 ? ' — GRATIS' : ' — selisih'
                        : ''
                    }`}
                    value={fmtRp(asuransiJiwaBeban)}
                  />
                  {cerdasResult && cerdasResult.skema !== 'top_up' && (
                    <div className="text-xs pl-3 -mt-1 space-y-0.5">
                      <div className="text-muted-foreground">Premi jiwa aktual: {fmtRp(cerdasResult.premiAsuransiAktual)}</div>
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
                  <Row label="Asuransi Kredit (Pialang)" value={fmtRp(premiKredit)} />
                  <Row label="Total Asuransi" value={fmtRp(potongan.asuransi)} />
                  <Row label="Provisi" value={fmtRp(potongan.provisi)} />
                  {potongan.biaya.map((b, i) => (
                    <Row key={i} label={b.label} value={fmtRp(b.nominal)} />
                  ))}
                  <Row label="Blokir Angsuran" value={fmtRp(potongan.blokir)} />
                  <Row label="Total Potongan" value={fmtRp(potongan.total)} strong />
                  {pelunasan && (
                    <>
                      <hr className="my-2" />
                      <div className="text-xs uppercase text-muted-foreground font-semibold">
                        Top Up / Pelunasan (sudah dipotong dari Dana Diterima)
                      </div>
                      <Row label="Outstanding Pokok" value={fmtRp(pelunasan.sisaPokok)} />
                      <Row label="Outstanding Bunga" value={fmtRp(pelunasan.bungaBerjalan)} />
                    </>
                  )}
                  <Row label="Dana Diterima" value={fmtRp(danaBersih)} strong highlight />

                  <div className="grid grid-cols-3 gap-2 pt-3">
                    <Button variant="outline" size="sm" onClick={handleExportExcel}>
                      <Download className="w-4 h-4 mr-1" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportPdf}>
                      <FileText className="w-4 h-4 mr-1" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJpg}>
                      <ImageIcon className="w-4 h-4 mr-1" /> JPG
                    </Button>
                  </div>
                  {canEdit && (
                    <Button className="w-full" onClick={handleSimpan} disabled={save.isPending || update.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      {editId
                        ? (update.isPending ? 'Memperbarui...' : 'Update Simulasi')
                        : (save.isPending ? 'Menyimpan...' : 'Simpan Simulasi')}
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
          <CardHeader><CardTitle className="text-base">Tabel Angsuran ({result.rows.length} bulan)</CardTitle></CardHeader>
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

      {/* HIDDEN HD SUMMARY CARD — dipakai untuk export JPG */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
        {result && potongan && (
          <SimulasiCard
            ref={jpgCardRef}
            data={{
              namaDebitur: namaDebitur || '—',
              produk: selectedProduct?.nama || 'Produk Kredit',
              skema,
              plafon,
              tenorBulan,
              bungaPa,
              promoNama: cerdasResult ? promoNama : null,
              promoLabel: cerdasResult ? cerdasResult.skemaLabel : null,
              gajiPokok,
              ttp,
              dsrPct: dsr.basisNilai > 0 ? dsr.dsrPct : null,
              angsuranPertama: result.summary.angsuranPertama,
              angsuranTerakhir: skema !== 'anuitas' ? result.summary.angsuranTerakhir : undefined,
              totalAngsuran: result.summary.totalAngsuran,
              totalBunga: result.summary.totalBunga,
              asuransiJiwa: asuransiJiwaBeban,
              asuransiJiwaProvider: asuransiProvider === 'alamin' ? "Al-Amin" : 'Pialang Asuransi',
              premiJiwaAktual: cerdasResult?.premiAsuransiAktual,
              subsidiJiwa: cerdasResult && cerdasResult.skema !== 'top_up' ? cerdasResult.subsidiBank : 0,
              asuransiKredit: premiKredit,
              provisi: potongan.provisi,
              biaya: potongan.biaya.map((b) => ({ label: b.label, nominal: b.nominal })),
              blokir: potongan.blokir,
              totalPotongan: potongan.total,
              pelunasan: pelunasan
                ? { pokok: pelunasan.sisaPokok, bunga: pelunasan.bungaBerjalan, total: pelunasan.totalPelunasan }
                : null,
              danaDiterima: danaBersih,
              namaAo,
              tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
            }}
          />
        )}
      </div>

    </MainLayout>
  );
};

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-md border bg-background p-2">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-semibold">{value}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string; strong?: boolean; highlight?: boolean }> = ({
  label,
  value,
  strong,
  highlight,
}) => (
  <div className={`flex justify-between items-center gap-3 ${highlight ? 'bg-primary/10 px-2 py-1 rounded' : ''}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className={strong ? 'font-semibold' : ''}>{value}</span>
  </div>
);

// ==== Helper components untuk kartu JPG (inline styles supaya kompatibel html2canvas) ====
const JRow: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
    <span style={{ fontSize: 14, fontWeight: 700, color: accent ?? '#0f172a' }}>{value}</span>
  </div>
);

const JTr: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
    <td style={{ padding: '8px 0', color: bold ? '#0f172a' : '#475569', fontWeight: bold ? 700 : 400 }}>{label}</td>
    <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: bold ? 700 : 500, color: '#0f172a' }}>{value}</td>
  </tr>
);

const JTrSub: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
  <tr>
    <td style={{ padding: '2px 0 6px 16px', fontSize: 12, color: '#64748b' }}>{label}</td>
    <td style={{ padding: '2px 0 6px 0', fontSize: 12, textAlign: 'right', color: accent ?? '#64748b', fontWeight: accent ? 600 : 400 }}>{value}</td>
  </tr>
);

export default KalkulatorPage;
