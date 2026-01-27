import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DebouncedInput } from '@/components/ui/debounced-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PengisianATM, ATMConfig } from '@/types';
import { getPengisianATM, addPengisianATM, updatePengisianATM, deletePengisianATM, getATMConfig, getDayName, angkaTerbilang } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, Calculator, Banknote, CreditCard, Users, Clock, FileText, TrendingUp, TrendingDown, Equal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { ATMStatistics } from '@/components/atm/ATMStatistics';

const DENOMINASI = 100000; // Rp 100.000 per lembar

const DatabasePengisianATM = () => {
  const { toast } = useToast();
  const { userName, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const canEdit = userRole !== 'demo';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<PengisianATM[]>([]);
  const [configOptions, setConfigOptions] = useState<ATMConfig[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<PengisianATM | null>(null);

  const getDefaultForm = () => ({
    tanggal: new Date(),
    jam: '09:00',
    sisaCartridge1: '',
    sisaCartridge2: '',
    sisaCartridge3: '',
    sisaCartridge4: '',
    tambahCartridge1: '',
    tambahCartridge2: '',
    tambahCartridge3: '',
    tambahCartridge4: '',
    saldoBukuBesar: '',
    kartuTertelan: '0',
    yangMenyerahkan: '',
    namaTeller: '',
    tellerSelisih: '',
  });

  const [formData, setFormData] = useState(getDefaultForm());

  // ============= AUTO CALCULATIONS =============
  const calculations = useMemo(() => {
    const saldoBukuBesar = parseCurrencyValue(formData.saldoBukuBesar);
    const sisaFisik = 
      (parseInt(formData.sisaCartridge1) || 0) +
      (parseInt(formData.sisaCartridge2) || 0) +
      (parseInt(formData.sisaCartridge3) || 0) +
      (parseInt(formData.sisaCartridge4) || 0);
    
    const lembarATM = Math.floor(saldoBukuBesar / DENOMINASI);
    const lembarFisik = sisaFisik;
    const uangFisik = sisaFisik * DENOMINASI;
    
    // Selisih = Uang Fisik - Saldo Buku Besar
    const selisihNominal = uangFisik - saldoBukuBesar;
    const selisihAbs = Math.abs(selisihNominal);
    const keteranganSelisih = selisihNominal > 0 ? 'LEBIH' : selisihNominal < 0 ? 'KURANG' : '-';
    
    // Jumlah disetor ke Teller = Saldo Buku Besar
    const jumlahDisetor = saldoBukuBesar;
    
    // Setor ke Rek Titipan = Selisih Lebih (jika ada)
    const setorKeRekTitipan = selisihNominal > 0 ? selisihNominal : 0;
    
    // Retracts = lembar yang disetor ke teller + lembar ke rek titipan
    const retracts = Math.floor(jumlahDisetor / DENOMINASI) + Math.floor(setorKeRekTitipan / DENOMINASI);
    
    // Notes format: ATM=XXX FISIK=XXX
    const notes = `ATM=${lembarATM} FISIK=${lembarFisik}`;
    
    return {
      lembarATM,
      lembarFisik,
      uangFisik,
      selisihNominal,
      selisihAbs,
      keteranganSelisih,
      jumlahDisetor,
      setorKeRekTitipan,
      retracts,
      notes
    };
  }, [formData.saldoBukuBesar, formData.sisaCartridge1, formData.sisaCartridge2, formData.sisaCartridge3, formData.sisaCartridge4]);

  useEffect(() => {
    loadData();
    loadConfig();
  }, []);

  const loadData = async () => {
    try {
      const result = await getPengisianATM();
      setData(result);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
    }
  };

  const loadConfig = async () => {
    try {
      const result = await getATMConfig();
      setConfigOptions(result.filter(c => c.isActive));
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const resetForm = () => setFormData(getDefaultForm());

  const getPetugasOptions = () => configOptions.filter(c => c.jabatan === 'PETUGAS ATM');
  const getTellerOptions = () => configOptions.filter(c => c.jabatan === 'TELLER');

  const handleAdd = async () => {
    if (isSubmitting) return;
    if (!formData.saldoBukuBesar) {
      toast({ title: 'Validasi Error', description: 'Harap isi Saldo Buku Besar.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tanggal = formData.tanggal;
      const kartuTertelan = parseInt(formData.kartuTertelan) || 0;
      
      const newItem = await addPengisianATM({
        hari: getDayName(tanggal),
        tanggal,
        jam: formData.jam,
        sisaCartridge1: parseInt(formData.sisaCartridge1) || 0,
        sisaCartridge2: parseInt(formData.sisaCartridge2) || 0,
        sisaCartridge3: parseInt(formData.sisaCartridge3) || 0,
        sisaCartridge4: parseInt(formData.sisaCartridge4) || 0,
        tambahCartridge1: parseInt(formData.tambahCartridge1) || 0,
        tambahCartridge2: parseInt(formData.tambahCartridge2) || 0,
        tambahCartridge3: parseInt(formData.tambahCartridge3) || 0,
        tambahCartridge4: parseInt(formData.tambahCartridge4) || 0,
        saldoBukuBesar: parseCurrencyValue(formData.saldoBukuBesar),
        kartuTertelan,
        terbilang: angkaTerbilang(kartuTertelan),
        notes: calculations.notes,
        jumlahSelisih: calculations.selisihAbs,
        keteranganSelisih: calculations.keteranganSelisih,
        namaTeller: formData.namaTeller,
        jumlahDisetor: calculations.jumlahDisetor,
        setorKeRekTitipan: calculations.setorKeRekTitipan,
        yangMenyerahkan: formData.yangMenyerahkan,
        tellerSelisih: formData.tellerSelisih,
        retracts: calculations.retracts,
        userInput: userName || 'System',
      });

      setSuccessMessage(`Data Pengisian ATM No. ${newItem.nomor} berhasil disimpan!`);
      setIsAddOpen(false);
      setIsSuccessOpen(true);
      resetForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (isSubmitting || !selectedItem) return;

    setIsSubmitting(true);
    try {
      const tanggal = formData.tanggal;
      const kartuTertelan = parseInt(formData.kartuTertelan) || 0;

      await updatePengisianATM(selectedItem.id, {
        hari: getDayName(tanggal),
        tanggal,
        jam: formData.jam,
        sisaCartridge1: parseInt(formData.sisaCartridge1) || 0,
        sisaCartridge2: parseInt(formData.sisaCartridge2) || 0,
        sisaCartridge3: parseInt(formData.sisaCartridge3) || 0,
        sisaCartridge4: parseInt(formData.sisaCartridge4) || 0,
        tambahCartridge1: parseInt(formData.tambahCartridge1) || 0,
        tambahCartridge2: parseInt(formData.tambahCartridge2) || 0,
        tambahCartridge3: parseInt(formData.tambahCartridge3) || 0,
        tambahCartridge4: parseInt(formData.tambahCartridge4) || 0,
        saldoBukuBesar: parseCurrencyValue(formData.saldoBukuBesar),
        kartuTertelan,
        terbilang: angkaTerbilang(kartuTertelan),
        notes: calculations.notes,
        jumlahSelisih: calculations.selisihAbs,
        keteranganSelisih: calculations.keteranganSelisih,
        namaTeller: formData.namaTeller,
        jumlahDisetor: calculations.jumlahDisetor,
        setorKeRekTitipan: calculations.setorKeRekTitipan,
        yangMenyerahkan: formData.yangMenyerahkan,
        tellerSelisih: formData.tellerSelisih,
        retracts: calculations.retracts,
      });

      toast({ title: 'Sukses', description: 'Data berhasil diperbarui' });
      setIsEditOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memperbarui data', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deletePengisianATM(selectedItem.id);
      toast({ title: 'Sukses', description: 'Data berhasil dihapus' });
      setIsDeleteOpen(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      'Hari': item.hari,
      'Tanggal': format(item.tanggal, 'dd MMMM yyyy', { locale: id }),
      'Jam': item.jam,
      'Sisa Cartridge I': item.sisaCartridge1,
      'Sisa Cartridge II': item.sisaCartridge2,
      'Sisa Cartridge III': item.sisaCartridge3,
      'Sisa Cartridge IV': item.sisaCartridge4,
      'Tambah Cartridge I': item.tambahCartridge1,
      'Tambah Cartridge II': item.tambahCartridge2,
      'Tambah Cartridge III': item.tambahCartridge3,
      'Tambah Cartridge IV': item.tambahCartridge4,
      'Saldo Buku Besar': item.saldoBukuBesar,
      'Kartu Tertelan': item.kartuTertelan,
      'Terbilang': item.terbilang,
      'Notes': item.notes,
      'Jumlah Selisih': item.jumlahSelisih,
      'Keterangan Selisih': item.keteranganSelisih,
      'Nama Teller': item.namaTeller,
      'Jumlah Disetor': item.jumlahDisetor,
      'Setor ke Rek Titipan': item.setorKeRekTitipan,
      'Yang Menyerahkan': item.yangMenyerahkan,
      'Teller Selisih': item.tellerSelisih,
      'Retracts': item.retracts,
    }));
    exportToExcel(exportData, 'Database_Pengisian_ATM');
  };

  const columns: Column<PengisianATM>[] = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'hari', header: 'Hari' },
    { key: 'tanggal', header: 'Tanggal', render: (item) => format(item.tanggal, 'dd/MM/yyyy') },
    { key: 'jam', header: 'Jam' },
    { key: 'saldoBukuBesar', header: 'Saldo Buku Besar', render: (item) => formatCurrencyDisplay(item.saldoBukuBesar) },
    { key: 'kartuTertelan', header: 'Kartu Tertelan', render: (item) => item.kartuTertelan.toString() },
    { 
      key: 'jumlahSelisih', 
      header: 'Selisih', 
      render: (item) => item.jumlahSelisih > 0 ? (
        <Badge variant={item.keteranganSelisih === 'LEBIH' ? 'default' : 'destructive'}>
          {formatCurrencyDisplay(item.jumlahSelisih)} ({item.keteranganSelisih})
        </Badge>
      ) : <span className="text-muted-foreground">-</span>
    },
    { key: 'yangMenyerahkan', header: 'Petugas' },
  ];

  const DatePickerField = ({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "EEEE, dd MMMM yyyy", { locale: id }) : <span>Pilih tanggal</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(date) => date && onChange(date)} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );

  const FormFields = () => (
    <div className="space-y-6">
      {/* Section 1: Waktu & Tanggal */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Waktu Pengisian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <DatePickerField 
            value={formData.tanggal} 
            onChange={(date) => setFormData({...formData, tanggal: date})} 
            label="Tanggal" 
          />
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Jam
            </Label>
            <Input 
              type="time" 
              value={formData.jam} 
              onChange={(e) => setFormData({...formData, jam: e.target.value})} 
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Sisa & Tambah Cartridge */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Data Cartridge (Lembar)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Sisa Cartridge
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <div key={`sisa-${num}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">#{num}</Label>
                  <DebouncedInput 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0" 
                    value={formData[`sisaCartridge${num}` as keyof typeof formData] as string} 
                    onValueChange={(v) => setFormData(prev => ({...prev, [`sisaCartridge${num}`]: v}))}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Tambah Cartridge
            </Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <div key={`tambah-${num}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">#{num}</Label>
                  <DebouncedInput 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0" 
                    value={formData[`tambahCartridge${num}` as keyof typeof formData] as string} 
                    onValueChange={(v) => setFormData(prev => ({...prev, [`tambahCartridge${num}`]: v}))}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Saldo & Kartu Tertelan */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Saldo & Kartu
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Saldo Buku Besar <span className="text-destructive">*</span>
            </Label>
            <DebouncedInput 
              inputMode="numeric"
              value={formData.saldoBukuBesar} 
              onValueChange={(v) => setFormData(prev => ({...prev, saldoBukuBesar: formatCurrencyInput(v)}))} 
              placeholder="1.000.000" 
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Kartu Tertelan</Label>
            <DebouncedInput 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.kartuTertelan} 
              onValueChange={(v) => setFormData(prev => ({...prev, kartuTertelan: v}))} 
              placeholder="0" 
              className="text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Auto-Calculated Summary */}
      <Card className="border-accent bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4 text-accent-foreground" />
            Perhitungan Otomatis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notes Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Lembar ATM (Buku Besar)</div>
              <div className="text-xl font-bold text-primary">{calculations.lembarATM.toLocaleString('id-ID')}</div>
              <div className="text-xs text-muted-foreground">= {formatCurrencyDisplay(parseCurrencyValue(formData.saldoBukuBesar))} / 100.000</div>
            </div>
            <div className="p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Lembar Fisik (Cartridge)</div>
              <div className="text-xl font-bold text-primary">{calculations.lembarFisik.toLocaleString('id-ID')}</div>
              <div className="text-xs text-muted-foreground">= {formatCurrencyDisplay(calculations.uangFisik)}</div>
            </div>
          </div>
          
          {/* Selisih Display */}
          <div className={cn(
            "p-3 rounded-lg border-2 flex items-center justify-between",
            calculations.selisihNominal > 0 ? "border-success bg-success/10" : 
            calculations.selisihNominal < 0 ? "border-destructive bg-destructive/10" : 
            "border-muted bg-muted/20"
          )}>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Selisih (Fisik - Buku Besar)</div>
              <div className="text-xl font-bold flex items-center gap-2">
                {calculations.selisihNominal > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-success" />
                    <span className="text-success">+{formatCurrencyDisplay(calculations.selisihAbs)}</span>
                  </>
                ) : calculations.selisihNominal < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <span className="text-destructive">-{formatCurrencyDisplay(calculations.selisihAbs)}</span>
                  </>
                ) : (
                  <>
                    <Equal className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Nihil</span>
                  </>
                )}
              </div>
            </div>
            <Badge variant={calculations.selisihNominal > 0 ? 'default' : calculations.selisihNominal < 0 ? 'destructive' : 'secondary'}>
              {calculations.keteranganSelisih}
            </Badge>
          </div>
          
          {/* Setoran Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Disetor ke Teller</div>
              <div className="font-semibold text-sm">{formatCurrencyDisplay(calculations.jumlahDisetor)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Setor Rek Titipan</div>
              <div className="font-semibold text-sm">{formatCurrencyDisplay(calculations.setorKeRekTitipan)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Retracts</div>
              <div className="font-semibold text-sm">{calculations.retracts.toLocaleString('id-ID')} lembar</div>
            </div>
          </div>
          
          {/* Notes */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Notes (Otomatis)
            </div>
            <div className="font-mono text-sm">{calculations.notes}</div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Petugas */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Petugas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Yang Menyerahkan (Petugas ATM)</Label>
            <Select value={formData.yangMenyerahkan} onValueChange={(v) => setFormData({...formData, yangMenyerahkan: v})}>
              <SelectTrigger><SelectValue placeholder="Pilih petugas" /></SelectTrigger>
              <SelectContent>
                {getPetugasOptions().map(p => (
                  <SelectItem key={p.id} value={p.nama}>{p.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Teller Penerima</Label>
            <Select value={formData.namaTeller} onValueChange={(v) => setFormData({...formData, namaTeller: v})}>
              <SelectTrigger><SelectValue placeholder="Pilih teller" /></SelectTrigger>
              <SelectContent>
                {getTellerOptions().map(t => (
                  <SelectItem key={t.id} value={t.nama}>{t.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Teller Selisih (jika ada)</Label>
            <Input 
              value={formData.tellerSelisih} 
              onChange={(e) => setFormData({...formData, tellerSelisih: e.target.value})} 
              placeholder="Nama/Kode Teller yang menangani selisih" 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Database Pengisian ATM"
          description="Kelola data pengisian ATM Telihan"
        />

        {/* Statistics Section */}
        <ATMStatistics data={data} />

        <DataTable
          data={data}
          columns={columns}
          onAdd={() => setIsAddOpen(true)}
          onExport={handleExport}
          onView={(item) => { setSelectedItem(item); setIsViewOpen(true); }}
          onEdit={(item) => {
            setSelectedItem(item);
            setFormData({
              tanggal: new Date(item.tanggal),
              jam: item.jam,
              sisaCartridge1: item.sisaCartridge1.toString(),
              sisaCartridge2: item.sisaCartridge2.toString(),
              sisaCartridge3: item.sisaCartridge3.toString(),
              sisaCartridge4: item.sisaCartridge4.toString(),
              tambahCartridge1: item.tambahCartridge1.toString(),
              tambahCartridge2: item.tambahCartridge2.toString(),
              tambahCartridge3: item.tambahCartridge3.toString(),
              tambahCartridge4: item.tambahCartridge4.toString(),
              saldoBukuBesar: formatCurrencyInput(item.saldoBukuBesar.toString()),
              kartuTertelan: item.kartuTertelan.toString(),
              yangMenyerahkan: item.yangMenyerahkan,
              namaTeller: item.namaTeller,
              tellerSelisih: item.tellerSelisih,
            });
            setIsEditOpen(true);
          }}
          onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
          canDelete={isAdmin}
          canEdit={canEdit}
          searchPlaceholder="Cari pengisian ATM..."
          addLabel="Tambah Data"
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Data Pengisian ATM</DialogTitle>
            <DialogDescription>Masukkan data pengisian ATM baru. Perhitungan selisih dan setoran otomatis dihitung.</DialogDescription>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Data Pengisian ATM</DialogTitle>
            <DialogDescription>Perbarui data pengisian ATM. Perhitungan otomatis akan diperbarui.</DialogDescription>
          </DialogHeader>
          <FormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Pengisian ATM #{selectedItem?.nomor}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Hari:</span> <strong>{selectedItem.hari}</strong></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <strong>{format(selectedItem.tanggal, 'dd MMMM yyyy', { locale: id })}</strong></div>
                <div><span className="text-muted-foreground">Jam:</span> <strong>{selectedItem.jam}</strong></div>
                <div><span className="text-muted-foreground">Saldo Buku Besar:</span> <strong>{formatCurrencyDisplay(selectedItem.saldoBukuBesar)}</strong></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Sisa Cartridge</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>I: {selectedItem.sisaCartridge1}</div>
                  <div>II: {selectedItem.sisaCartridge2}</div>
                  <div>III: {selectedItem.sisaCartridge3}</div>
                  <div>IV: {selectedItem.sisaCartridge4}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Tambah Cartridge</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>I: {selectedItem.tambahCartridge1}</div>
                  <div>II: {selectedItem.tambahCartridge2}</div>
                  <div>III: {selectedItem.tambahCartridge3}</div>
                  <div>IV: {selectedItem.tambahCartridge4}</div>
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Kartu Tertelan:</span> <strong>{selectedItem.kartuTertelan} ({selectedItem.terbilang})</strong></div>
                <div><span className="text-muted-foreground">Retracts:</span> <strong>{selectedItem.retracts}</strong></div>
                <div><span className="text-muted-foreground">Selisih:</span> <strong>{selectedItem.jumlahSelisih > 0 ? `${formatCurrencyDisplay(selectedItem.jumlahSelisih)} (${selectedItem.keteranganSelisih})` : '-'}</strong></div>
                <div><span className="text-muted-foreground">Petugas:</span> <strong>{selectedItem.yangMenyerahkan}</strong></div>
                <div><span className="text-muted-foreground">Disetor ke Teller:</span> <strong>{formatCurrencyDisplay(selectedItem.jumlahDisetor)}</strong></div>
                <div><span className="text-muted-foreground">Setor Rek Titipan:</span> <strong>{formatCurrencyDisplay(selectedItem.setorKeRekTitipan)}</strong></div>
              </div>
              {selectedItem.notes && (
                <div className="border-t pt-4">
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="mt-1 font-mono">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pengisian ATM?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data pengisian ATM No. {selectedItem?.nomor}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-medium text-foreground">{successMessage}</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setIsSuccessOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DatabasePengisianATM;
