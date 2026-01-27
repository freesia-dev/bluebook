import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PengisianATM, ATMConfig } from '@/types';
import { getPengisianATM, addPengisianATM, updatePengisianATM, deletePengisianATM, getATMConfig, getDayName, angkaTerbilang } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToExcel } from '@/lib/export';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';

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
    notes: '',
    jumlahSelisih: '',
    keteranganSelisih: '',
    namaTeller: '',
    jumlahDisetor: '',
    setorKeRekTitipan: '',
    yangMenyerahkan: '',
    tellerSelisih: '',
    retracts: '0',
  });

  const [formData, setFormData] = useState(getDefaultForm());

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
        notes: formData.notes,
        jumlahSelisih: parseCurrencyValue(formData.jumlahSelisih),
        keteranganSelisih: formData.keteranganSelisih,
        namaTeller: formData.namaTeller,
        jumlahDisetor: parseCurrencyValue(formData.jumlahDisetor),
        setorKeRekTitipan: parseCurrencyValue(formData.setorKeRekTitipan),
        yangMenyerahkan: formData.yangMenyerahkan,
        tellerSelisih: formData.tellerSelisih,
        retracts: parseInt(formData.retracts) || 0,
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
        notes: formData.notes,
        jumlahSelisih: parseCurrencyValue(formData.jumlahSelisih),
        keteranganSelisih: formData.keteranganSelisih,
        namaTeller: formData.namaTeller,
        jumlahDisetor: parseCurrencyValue(formData.jumlahDisetor),
        setorKeRekTitipan: parseCurrencyValue(formData.setorKeRekTitipan),
        yangMenyerahkan: formData.yangMenyerahkan,
        tellerSelisih: formData.tellerSelisih,
        retracts: parseInt(formData.retracts) || 0,
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
    { key: 'jumlahSelisih', header: 'Selisih', render: (item) => item.jumlahSelisih > 0 ? formatCurrencyDisplay(item.jumlahSelisih) : '-' },
    { key: 'yangMenyerahkan', header: 'Petugas' },
  ];

  const DatePickerField = ({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
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
      {/* Tanggal dan Jam */}
      <div className="grid grid-cols-2 gap-4">
        <DatePickerField 
          value={formData.tanggal} 
          onChange={(date) => setFormData({...formData, tanggal: date})} 
          label="Tanggal" 
        />
        <div className="space-y-2">
          <Label>Jam</Label>
          <Input 
            type="time" 
            value={formData.jam} 
            onChange={(e) => setFormData({...formData, jam: e.target.value})} 
          />
        </div>
      </div>

      {/* Sisa Cartridge */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sisa Cartridge (Lembar)</Label>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 1</Label>
            <Input type="number" placeholder="0" value={formData.sisaCartridge1} onChange={(e) => setFormData({...formData, sisaCartridge1: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 2</Label>
            <Input type="number" placeholder="0" value={formData.sisaCartridge2} onChange={(e) => setFormData({...formData, sisaCartridge2: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 3</Label>
            <Input type="number" placeholder="0" value={formData.sisaCartridge3} onChange={(e) => setFormData({...formData, sisaCartridge3: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 4</Label>
            <Input type="number" placeholder="0" value={formData.sisaCartridge4} onChange={(e) => setFormData({...formData, sisaCartridge4: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Tambah Cartridge */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tambah Cartridge (Lembar)</Label>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 1</Label>
            <Input type="number" placeholder="0" value={formData.tambahCartridge1} onChange={(e) => setFormData({...formData, tambahCartridge1: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 2</Label>
            <Input type="number" placeholder="0" value={formData.tambahCartridge2} onChange={(e) => setFormData({...formData, tambahCartridge2: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 3</Label>
            <Input type="number" placeholder="0" value={formData.tambahCartridge3} onChange={(e) => setFormData({...formData, tambahCartridge3: e.target.value})} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cartridge 4</Label>
            <Input type="number" placeholder="0" value={formData.tambahCartridge4} onChange={(e) => setFormData({...formData, tambahCartridge4: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Saldo dan Kartu */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Saldo Buku Besar <span className="text-destructive">*</span></Label>
          <Input 
            value={formData.saldoBukuBesar} 
            onChange={(e) => setFormData({...formData, saldoBukuBesar: formatCurrencyInput(e.target.value)})} 
            placeholder="1.000.000" 
          />
        </div>
        <div className="space-y-2">
          <Label>Kartu Tertelan</Label>
          <Input 
            type="number" 
            value={formData.kartuTertelan} 
            onChange={(e) => setFormData({...formData, kartuTertelan: e.target.value})} 
            placeholder="0" 
          />
        </div>
      </div>

      {/* Retracts */}
      <div className="space-y-2">
        <Label>Retracts</Label>
        <Input 
          type="number" 
          value={formData.retracts} 
          onChange={(e) => setFormData({...formData, retracts: e.target.value})} 
          placeholder="0" 
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes / Keterangan</Label>
        <Textarea 
          value={formData.notes} 
          onChange={(e) => setFormData({...formData, notes: e.target.value})} 
          placeholder="ATM=FISIK=..." 
          rows={2}
        />
      </div>

      {/* Selisih */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jumlah Selisih</Label>
          <Input 
            value={formData.jumlahSelisih} 
            onChange={(e) => setFormData({...formData, jumlahSelisih: formatCurrencyInput(e.target.value)})} 
            placeholder="0" 
          />
        </div>
        <div className="space-y-2">
          <Label>Keterangan Selisih</Label>
          <Select value={formData.keteranganSelisih} onValueChange={(v) => setFormData({...formData, keteranganSelisih: v})}>
            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="-">-</SelectItem>
              <SelectItem value="LEBIH">LEBIH</SelectItem>
              <SelectItem value="KURANG">KURANG</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Setoran */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jumlah Disetor ke Teller</Label>
          <Input 
            value={formData.jumlahDisetor} 
            onChange={(e) => setFormData({...formData, jumlahDisetor: formatCurrencyInput(e.target.value)})} 
            placeholder="0" 
          />
        </div>
        <div className="space-y-2">
          <Label>Setor ke Rek Titipan ATM</Label>
          <Input 
            value={formData.setorKeRekTitipan} 
            onChange={(e) => setFormData({...formData, setorKeRekTitipan: formatCurrencyInput(e.target.value)})} 
            placeholder="0" 
          />
        </div>
      </div>

      {/* Petugas */}
      <div className="grid grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label>Teller Selisih</Label>
        <Input 
          value={formData.tellerSelisih} 
          onChange={(e) => setFormData({...formData, tellerSelisih: e.target.value})} 
          placeholder="Nama/Kode Teller" 
        />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Database Pengisian ATM"
          description="Kelola data pengisian ATM Telihan"
        />

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
              notes: item.notes,
              jumlahSelisih: item.jumlahSelisih > 0 ? formatCurrencyInput(item.jumlahSelisih.toString()) : '',
              keteranganSelisih: item.keteranganSelisih || '-',
              namaTeller: item.namaTeller,
              jumlahDisetor: item.jumlahDisetor > 0 ? formatCurrencyInput(item.jumlahDisetor.toString()) : '',
              setorKeRekTitipan: item.setorKeRekTitipan > 0 ? formatCurrencyInput(item.setorKeRekTitipan.toString()) : '',
              yangMenyerahkan: item.yangMenyerahkan,
              tellerSelisih: item.tellerSelisih,
              retracts: item.retracts.toString(),
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
            <DialogDescription>Masukkan data pengisian ATM baru</DialogDescription>
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
            <DialogDescription>Perbarui data pengisian ATM</DialogDescription>
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
              </div>
              {selectedItem.notes && (
                <div className="border-t pt-4">
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="mt-1">{selectedItem.notes}</p>
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
