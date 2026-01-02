import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { SuratKeluar, KODE_SURAT_LIST } from '@/types';
import { 
  getSuratKeluar, 
  addSuratKeluar, 
  updateSuratKeluar, 
  deleteSuratKeluar 
} from '@/lib/supabase-store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SuratKeluarPage: React.FC = () => {
  const { toast } = useToast();
  const { userName, isAdmin } = useAuth();
  const [data, setData] = useState<SuratKeluar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<SuratKeluar | null>(null);
  
  const [formData, setFormData] = useState({
    kodeSurat: '',
    namaPenerima: '',
    perihal: '',
    tujuanSurat: '',
    keterangan: '',
    tanggal: new Date(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await getSuratKeluar();
      setData(items);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Gagal memuat data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ kodeSurat: '', namaPenerima: '', perihal: '', tujuanSurat: '', keterangan: '', tanggal: new Date() });
  };

  const handleAdd = async () => {
    if (!formData.kodeSurat || !formData.namaPenerima || !formData.perihal) {
      toast({ title: 'Validasi Error', description: 'Harap isi semua field yang wajib.', variant: 'destructive' });
      return;
    }

    try {
      const newItem = await addSuratKeluar({
        kodeSurat: formData.kodeSurat,
        namaPenerima: formData.namaPenerima,
        perihal: formData.perihal,
        tujuanSurat: formData.tujuanSurat,
        status: 'Belum Dikirim',
        keterangan: formData.keterangan || '-',
        userInput: userName || 'Unknown',
        tanggal: formData.tanggal,
      });

      setSuccessMessage(`Surat Berhasil Disimpan dengan nomor Agenda: ${newItem.nomorAgenda}`);
      setIsAddOpen(false);
      setIsSuccessOpen(true);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menyimpan data.', variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    
    try {
      await updateSuratKeluar(selectedItem.id, {
        ...formData,
        tanggal: formData.tanggal,
      });
      toast({ title: 'Berhasil', description: 'Data surat keluar berhasil diperbarui.' });
      setIsEditOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui data.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      await deleteSuratKeluar(selectedItem.id);
      toast({ title: 'Berhasil', description: 'Data surat keluar berhasil dihapus.' });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus data.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (item: SuratKeluar) => {
    const newStatus = item.status === 'Belum Dikirim' ? 'Sudah Dikirim' : 'Belum Dikirim';
    try {
      await updateSuratKeluar(item.id, { status: newStatus });
      toast({ title: 'Status Diperbarui', description: `Status diubah menjadi ${newStatus}.` });
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui status.', variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      'Nomor Agenda': item.nomorAgenda,
      'Kode Surat': item.kodeSurat,
      'Nama Penerima': item.namaPenerima,
      'Perihal': item.perihal,
      'Tujuan Surat': item.tujuanSurat,
      'Status': item.status,
      'Keterangan': item.keterangan,
      'User Input': item.userInput,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    exportToExcel(exportData, 'Surat_Keluar', 'Surat Keluar');
    toast({ title: 'Export Berhasil', description: 'Data surat keluar berhasil diekspor.' });
  };

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorAgenda', header: 'Nomor Agenda' },
    { key: 'kodeSurat', header: 'Kode Surat', className: 'w-[100px]' },
    { key: 'namaPenerima', header: 'Penerima' },
    { key: 'perihal', header: 'Perihal' },
    { 
      key: 'tanggal', 
      header: 'Tanggal',
      render: (item: SuratKeluar) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-'
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: SuratKeluar) => (
        <Badge 
          variant={item.status === 'Sudah Dikirim' ? 'default' : 'secondary'}
          className="cursor-pointer"
          onClick={() => handleUpdateStatus(item)}
        >
          {item.status}
        </Badge>
      )
    },
  ];

  // Filter out D-1 (Nasabah Kredit) - only available in Agenda Kredit
  const filteredKodeSurat = KODE_SURAT_LIST.filter(item => item.kode !== 'D-1');
  const groupedKodeSurat = filteredKodeSurat.reduce((acc, item) => {
    if (!acc[item.kategori]) acc[item.kategori] = [];
    acc[item.kategori].push(item);
    return acc;
  }, {} as Record<string, typeof KODE_SURAT_LIST>);

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

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Surat Keluar" description="Kelola data surat keluar KC Telihan" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Memuat data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Surat Keluar" description="Kelola data surat keluar KC Telihan" />

      <DataTable
        data={data}
        columns={columns}
        onAdd={() => setIsAddOpen(true)}
        onExport={handleExport}
        onView={(item) => { setSelectedItem(item); setIsViewOpen(true); }}
        onEdit={(item) => { 
          setSelectedItem(item); 
          setFormData({
            kodeSurat: item.kodeSurat,
            namaPenerima: item.namaPenerima,
            perihal: item.perihal,
            tujuanSurat: item.tujuanSurat,
            keterangan: item.keterangan,
            tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        canDelete={isAdmin}
        searchPlaceholder="Cari surat keluar..."
        addLabel="Tambah Surat Keluar"
      />

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Surat Keluar</DialogTitle>
            <DialogDescription>Masukkan data surat keluar baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2">
              <Label>Jenis Kode Surat <span className="text-destructive">*</span></Label>
              <Select value={formData.kodeSurat} onValueChange={(v) => setFormData({...formData, kodeSurat: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih kode surat" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedKodeSurat).map(([kategori, items]) => (
                    <React.Fragment key={kategori}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">{kategori}</div>
                      {items.map((item) => (<SelectItem key={item.kode} value={item.kode}>{item.kode} - {item.uraian}</SelectItem>))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nama Penerima <span className="text-destructive">*</span></Label><Input placeholder="Nama penerima surat" value={formData.namaPenerima} onChange={(e) => setFormData({...formData, namaPenerima: e.target.value})} /></div>
            <div className="space-y-2"><Label>Perihal <span className="text-destructive">*</span></Label><Input placeholder="Perihal surat" value={formData.perihal} onChange={(e) => setFormData({...formData, perihal: e.target.value})} /></div>
            <div className="space-y-2"><Label>Tujuan Surat (Instansi/Alamat)</Label><Input placeholder="Alamat tujuan surat" value={formData.tujuanSurat} onChange={(e) => setFormData({...formData, tujuanSurat: e.target.value})} /></div>
            <div className="space-y-2"><Label>Keterangan Lainnya</Label><Textarea placeholder="Keterangan tambahan (opsional)" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleAdd}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Detail Surat Keluar</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-muted-foreground">Nomor Agenda</p><p className="font-medium">{selectedItem.nomorAgenda}</p></div>
                <div><p className="text-sm text-muted-foreground">Kode Surat</p><p className="font-medium">{selectedItem.kodeSurat}</p></div>
                <div><p className="text-sm text-muted-foreground">Nama Penerima</p><p className="font-medium">{selectedItem.namaPenerima}</p></div>
                <div><p className="text-sm text-muted-foreground">Tujuan Surat</p><p className="font-medium">{selectedItem.tujuanSurat || '-'}</p></div>
                <div className="col-span-2"><p className="text-sm text-muted-foreground">Perihal</p><p className="font-medium">{selectedItem.perihal}</p></div>
                <div><p className="text-sm text-muted-foreground">Status</p><Badge variant={selectedItem.status === 'Sudah Dikirim' ? 'default' : 'secondary'}>{selectedItem.status}</Badge></div>
                <div><p className="text-sm text-muted-foreground">Tanggal</p><p className="font-medium">{selectedItem.tanggal ? format(new Date(selectedItem.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}</p></div>
                <div><p className="text-sm text-muted-foreground">Keterangan</p><p className="font-medium">{selectedItem.keterangan}</p></div>
                <div><p className="text-sm text-muted-foreground">User Input</p><p className="font-medium">{selectedItem.userInput}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsViewOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Surat Keluar</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2">
              <Label>Jenis Kode Surat</Label>
              <Select value={formData.kodeSurat} onValueChange={(v) => setFormData({...formData, kodeSurat: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih kode surat" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedKodeSurat).map(([kategori, items]) => (
                    <React.Fragment key={kategori}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">{kategori}</div>
                      {items.map((item) => (<SelectItem key={item.kode} value={item.kode}>{item.kode} - {item.uraian}</SelectItem>))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nama Penerima</Label><Input value={formData.namaPenerima} onChange={(e) => setFormData({...formData, namaPenerima: e.target.value})} /></div>
            <div className="space-y-2"><Label>Perihal</Label><Input value={formData.perihal} onChange={(e) => setFormData({...formData, perihal: e.target.value})} /></div>
            <div className="space-y-2"><Label>Tujuan Surat</Label><Input value={formData.tujuanSurat} onChange={(e) => setFormData({...formData, tujuanSurat: e.target.value})} /></div>
            <div className="space-y-2"><Label>Keterangan</Label><Textarea value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
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
            <AlertDialogTitle>Hapus Surat Keluar?</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus surat keluar dengan nomor agenda "{selectedItem?.nomorAgenda}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
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
          <DialogFooter className="justify-center"><Button onClick={() => setIsSuccessOpen(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default SuratKeluarPage;
