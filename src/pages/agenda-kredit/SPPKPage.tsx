import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SPPK, JenisKredit } from '@/types';
import { getSPPK, addSPPK, updateSPPK, deleteSPPK, getJenisKredit } from '@/lib/supabase-store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { CheckCircle2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SPPKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

const SPPKPage: React.FC<SPPKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<SPPK[]>([]);
  const [jenisKreditOptions, setJenisKreditOptions] = useState<JenisKredit[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<SPPK | null>(null);
  
  const [formData, setFormData] = useState({
    namaDebitur: '',
    jenisKredit: '',
    plafon: '',
    jangkaWaktu: '',
    marketing: type === 'telihan' ? 'BAP' : '',
    tanggal: new Date(),
  });

  useEffect(() => {
    loadData();
    loadOptions();
  }, [type]);

  const loadData = async () => {
    const allData = await getSPPK();
    setData(allData.filter(s => s.type === type));
  };

  const loadOptions = async () => {
    const jk = await getJenisKredit();
    setJenisKreditOptions(jk);
  };

  const resetForm = () => {
    setFormData({
      namaDebitur: '',
      jenisKredit: '',
      plafon: '',
      jangkaWaktu: '',
      marketing: type === 'telihan' ? 'BAP' : '',
      tanggal: new Date(),
    });
  };

  const handlePlafonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setFormData({...formData, plafon: formatted});
  };

  const handleAdd = async () => {
    if (isSubmitting) return;
    if (!formData.namaDebitur || !formData.jenisKredit || !formData.plafon) {
      toast({
        title: 'Validasi Error',
        description: 'Harap isi semua field yang wajib.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const newItem = await addSPPK({
        namaDebitur: formData.namaDebitur,
        jenisKredit: formData.jenisKredit,
        plafon: parseCurrencyValue(formData.plafon),
        jangkaWaktu: formData.jangkaWaktu,
        marketing: formData.marketing,
        type,
        tanggal: formData.tanggal,
      });

      setSuccessMessage(`SPPK Berhasil diinput dengan Nomor: ${newItem.nomorSPPK}`);
      setIsAddOpen(false);
      setIsSuccessOpen(true);
      resetForm();
      loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    
    await updateSPPK(selectedItem.id, {
      namaDebitur: formData.namaDebitur,
      jenisKredit: formData.jenisKredit,
      plafon: parseCurrencyValue(formData.plafon),
      jangkaWaktu: formData.jangkaWaktu,
      marketing: formData.marketing,
      tanggal: formData.tanggal,
    });

    toast({
      title: 'Berhasil',
      description: 'Data SPPK berhasil diperbarui.',
    });
    setIsEditOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    await deleteSPPK(selectedItem.id);
    toast({
      title: 'Berhasil',
      description: 'Data SPPK berhasil dihapus.',
    });
    setIsDeleteOpen(false);
    setSelectedItem(null);
    loadData();
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      'Nomor SPPK': item.nomorSPPK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': item.jenisKredit,
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Marketing': item.marketing,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    exportToExcel(exportData, `SPPK_${type.charAt(0).toUpperCase() + type.slice(1)}`, 'SPPK');
    toast({
      title: 'Export Berhasil',
      description: 'Data SPPK berhasil diekspor.',
    });
  };

  const getJenisKreditLabel = (id: string) => {
    const jk = jenisKreditOptions.find(j => j.id === id);
    return jk ? `${jk.nama} - ${jk.produkKredit}` : id;
  };

  const DatePickerField = ({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'dd MMMM yyyy', { locale: id }) : <span>Pilih tanggal</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(date) => date && onChange(date)} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorSPPK', header: 'Nomor SPPK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit', render: (item: SPPK) => getJenisKreditLabel(item.jenisKredit) },
    { 
      key: 'plafon', 
      header: 'Plafon',
      render: (item: SPPK) => formatCurrencyDisplay(item.plafon)
    },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
    { 
      key: 'tanggal', 
      header: 'Tanggal',
      render: (item: SPPK) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-'
    },
    { key: 'marketing', header: 'Marketing' },
  ];

  return (
    <MainLayout>
      <PageHeader 
        title={title}
        description={`Kelola data ${title}`}
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
            namaDebitur: item.namaDebitur,
            jenisKredit: item.jenisKredit,
            plafon: formatCurrencyInput(item.plafon.toString()),
            jangkaWaktu: item.jangkaWaktu,
            marketing: item.marketing,
            tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        canDelete={isAdmin}
        canEdit={canEdit}
        searchPlaceholder="Cari SPPK..."
        addLabel="Tambah SPPK"
      />

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah {title}</DialogTitle>
            <DialogDescription>Masukkan data SPPK baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2">
              <Label>Nama Debitur <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Nama debitur"
                value={formData.namaDebitur}
                onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Jenis Kredit <span className="text-destructive">*</span></Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis kredit" />
                </SelectTrigger>
                <SelectContent>
                  {jenisKreditOptions.map((jk) => (
                    <SelectItem key={jk.id} value={jk.id}>{jk.nama} - {jk.produkKredit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plafon <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="1,000,000.00"
                value={formData.plafon}
                onChange={handlePlafonChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Jangka Waktu</Label>
              <Input 
                placeholder="Contoh: 12 Bulan"
                value={formData.jangkaWaktu}
                onChange={(e) => setFormData({...formData, jangkaWaktu: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Marketing</Label>
              {type === 'telihan' ? (
                <Select value={formData.marketing} onValueChange={(v) => setFormData({...formData, marketing: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih marketing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAP">BAP</SelectItem>
                    <SelectItem value="NON BAP">NON BAP</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  placeholder="Nama marketing"
                  value={formData.marketing}
                  onChange={(e) => setFormData({...formData, marketing: e.target.value})}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail SPPK</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nomor SPPK</p>
                  <p className="font-medium">{selectedItem.nomorSPPK}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Debitur</p>
                  <p className="font-medium">{selectedItem.namaDebitur}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jenis Kredit</p>
                  <p className="font-medium">{getJenisKreditLabel(selectedItem.jenisKredit)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plafon</p>
                  <p className="font-medium">{formatCurrencyDisplay(selectedItem.plafon)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jangka Waktu</p>
                  <p className="font-medium">{selectedItem.jangkaWaktu}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Marketing</p>
                  <p className="font-medium">{selectedItem.marketing}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal</p>
                  <p className="font-medium">{selectedItem.tanggal ? format(new Date(selectedItem.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Input</p>
                  <p className="font-medium">{new Date(selectedItem.createdAt).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit SPPK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2">
              <Label>Nama Debitur</Label>
              <Input 
                value={formData.namaDebitur}
                onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Jenis Kredit</Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jenisKreditOptions.map((jk) => (
                    <SelectItem key={jk.id} value={jk.id}>{jk.nama} - {jk.produkKredit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plafon</Label>
              <Input 
                value={formData.plafon}
                onChange={handlePlafonChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Jangka Waktu</Label>
              <Input 
                value={formData.jangkaWaktu}
                onChange={(e) => setFormData({...formData, jangkaWaktu: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Marketing</Label>
              {type === 'telihan' ? (
                <Select value={formData.marketing} onValueChange={(v) => setFormData({...formData, marketing: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAP">BAP</SelectItem>
                    <SelectItem value="NON BAP">NON BAP</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={formData.marketing}
                  onChange={(e) => setFormData({...formData, marketing: e.target.value})}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SPPK?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus SPPK "{selectedItem?.nomorSPPK}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
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

export default SPPKPage;
