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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CalendarIcon, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AgendaKreditEntry, KODE_SURAT_LIST } from '@/types';
import { 
  getAgendaKreditEntry, 
  addAgendaKreditEntry, 
  updateAgendaKreditEntry, 
  deleteAgendaKreditEntry 
} from '@/lib/supabase-store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const AgendaKreditPage: React.FC = () => {
  const { toast } = useToast();
  const { userName } = useAuth();
  const [data, setData] = useState<AgendaKreditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<AgendaKreditEntry | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    kodeSurat: '',
    nomorSuratMasuk: '',
    namaPengirim: '',
    perihal: '',
    tujuanDisposisi: '',
    keterangan: '',
    tanggalMasuk: new Date(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const items = await getAgendaKreditEntry();
      setData(items);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Gagal memuat data.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      kodeSurat: '',
      nomorSuratMasuk: '',
      namaPengirim: '',
      perihal: '',
      tujuanDisposisi: '',
      keterangan: '',
      tanggalMasuk: new Date(),
    });
  };

  const handleAdd = async () => {
    if (!formData.kodeSurat || !formData.nomorSuratMasuk || !formData.namaPengirim || !formData.perihal) {
      toast({
        title: 'Validasi Error',
        description: 'Harap isi semua field yang wajib.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newItem = await addAgendaKreditEntry({
        kodeSurat: formData.kodeSurat,
        nomorSuratMasuk: formData.nomorSuratMasuk,
        namaPengirim: formData.namaPengirim,
        perihal: formData.perihal,
        tujuanDisposisi: formData.tujuanDisposisi,
        status: 'Belum Disposisi',
        keterangan: formData.keterangan || '-',
        userInput: userName || 'Unknown',
        tanggalMasuk: formData.tanggalMasuk,
      });

      setSuccessMessage(`Data Berhasil Disimpan dengan nomor Agenda: ${newItem.nomorAgenda}`);
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
      await updateAgendaKreditEntry(selectedItem.id, {
        kodeSurat: formData.kodeSurat,
        nomorSuratMasuk: formData.nomorSuratMasuk,
        namaPengirim: formData.namaPengirim,
        perihal: formData.perihal,
        tujuanDisposisi: formData.tujuanDisposisi,
        keterangan: formData.keterangan,
        tanggalMasuk: formData.tanggalMasuk,
      });

      toast({
        title: 'Berhasil',
        description: 'Data agenda kredit berhasil diperbarui.',
      });
      setIsEditOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui data.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      await deleteAgendaKreditEntry(selectedItem.id);
      toast({
        title: 'Berhasil',
        description: 'Data agenda kredit berhasil dihapus.',
      });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus data.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (item: AgendaKreditEntry) => {
    const newStatus = item.status === 'Belum Disposisi' ? 'Sudah Disposisi' : 'Belum Disposisi';
    try {
      await updateAgendaKreditEntry(item.id, { status: newStatus });
      toast({
        title: 'Status Diperbarui',
        description: `Status diubah menjadi ${newStatus}.`,
      });
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
      'Nomor Surat Masuk': item.nomorSuratMasuk,
      'Nama Pengirim': item.namaPengirim,
      'Perihal': item.perihal,
      'Tujuan Disposisi': item.tujuanDisposisi,
      'Status': item.status,
      'Keterangan': item.keterangan,
      'User Input': item.userInput,
      'Tanggal Masuk': new Date(item.tanggalMasuk).toLocaleDateString('id-ID'),
      'Tanggal Input': new Date(item.createdAt).toLocaleDateString('id-ID'),
    }));
    exportToExcel(exportData, 'Agenda_Kredit', 'Agenda Kredit');
    toast({
      title: 'Export Berhasil',
      description: 'Data agenda kredit berhasil diekspor.',
    });
  };

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorAgenda', header: 'Nomor Agenda' },
    { key: 'kodeSurat', header: 'Kode Surat', className: 'w-[100px]' },
    { key: 'nomorSuratMasuk', header: 'Nomor Surat' },
    { key: 'namaPengirim', header: 'Pengirim' },
    { key: 'perihal', header: 'Perihal' },
    { 
      key: 'tanggalMasuk', 
      header: 'Tgl Masuk',
      render: (item: AgendaKreditEntry) => new Date(item.tanggalMasuk).toLocaleDateString('id-ID')
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: AgendaKreditEntry) => (
        <Badge 
          variant={item.status === 'Sudah Disposisi' ? 'default' : 'secondary'}
          className="cursor-pointer"
          onClick={() => handleUpdateStatus(item)}
        >
          {item.status}
        </Badge>
      )
    },
  ];

  const groupedKodeSurat = KODE_SURAT_LIST.reduce((acc, item) => {
    if (!acc[item.kategori]) acc[item.kategori] = [];
    acc[item.kategori].push(item);
    return acc;
  }, {} as Record<string, typeof KODE_SURAT_LIST>);

  const DatePickerField = ({ label, value, onChange, required = false }: { label: string; value: Date; onChange: (date: Date) => void; required?: boolean }) => (
    <div className="space-y-2">
      <Label>{label} {required && <span className="text-destructive">*</span>}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(date) => date && onChange(date)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Agenda Kredit" description="Kelola data agenda kredit KC Telihan" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Memuat data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Agenda Kredit" 
        description="Kelola data agenda kredit KC Telihan"
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
            kodeSurat: item.kodeSurat,
            nomorSuratMasuk: item.nomorSuratMasuk,
            namaPengirim: item.namaPengirim,
            perihal: item.perihal,
            tujuanDisposisi: item.tujuanDisposisi,
            keterangan: item.keterangan,
            tanggalMasuk: new Date(item.tanggalMasuk),
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        searchPlaceholder="Cari agenda kredit..."
        addLabel="Tambah Agenda Kredit"
      />

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Agenda Kredit</DialogTitle>
            <DialogDescription>
              Masukkan data agenda kredit baru
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField 
              label="Tanggal Masuk Surat" 
              value={formData.tanggalMasuk} 
              onChange={(date) => setFormData({...formData, tanggalMasuk: date})}
              required
            />
            <div className="space-y-2">
              <Label>Jenis Kode Surat <span className="text-destructive">*</span></Label>
              <Select value={formData.kodeSurat} onValueChange={(v) => setFormData({...formData, kodeSurat: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kode surat" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedKodeSurat).map(([kategori, items]) => (
                    <React.Fragment key={kategori}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">{kategori}</div>
                      {items.map((item) => (
                        <SelectItem key={item.kode} value={item.kode}>
                          {item.kode} - {item.uraian}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nomor Surat Masuk <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Contoh: SM-2024/001" 
                value={formData.nomorSuratMasuk}
                onChange={(e) => setFormData({...formData, nomorSuratMasuk: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pengirim <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Nama pengirim surat"
                value={formData.namaPengirim}
                onChange={(e) => setFormData({...formData, namaPengirim: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Perihal <span className="text-destructive">*</span></Label>
              <Input 
                placeholder="Perihal surat"
                value={formData.perihal}
                onChange={(e) => setFormData({...formData, perihal: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tujuan Disposisi</Label>
              <Input 
                placeholder="Tujuan disposisi surat"
                value={formData.tujuanDisposisi}
                onChange={(e) => setFormData({...formData, tujuanDisposisi: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Keterangan Lainnya</Label>
              <Textarea 
                placeholder="Keterangan tambahan (opsional)"
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
              />
            </div>
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
          <DialogHeader>
            <DialogTitle className="font-display">Detail Agenda Kredit</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Agenda</p>
                  <p className="font-medium">{selectedItem.nomorAgenda}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kode Surat</p>
                  <p className="font-medium">{selectedItem.kodeSurat}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nomor Surat Masuk</p>
                  <p className="font-medium">{selectedItem.nomorSuratMasuk}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nama Pengirim</p>
                  <p className="font-medium">{selectedItem.namaPengirim}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Perihal</p>
                  <p className="font-medium">{selectedItem.perihal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tujuan Disposisi</p>
                  <p className="font-medium">{selectedItem.tujuanDisposisi || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={selectedItem.status === 'Sudah Disposisi' ? 'default' : 'secondary'}>
                    {selectedItem.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Keterangan</p>
                  <p className="font-medium">{selectedItem.keterangan}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User Input</p>
                  <p className="font-medium">{selectedItem.userInput}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Masuk</p>
                  <p className="font-medium">{new Date(selectedItem.tanggalMasuk).toLocaleDateString('id-ID')}</p>
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
            <DialogTitle className="font-display">Edit Agenda Kredit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField 
              label="Tanggal Masuk Surat" 
              value={formData.tanggalMasuk} 
              onChange={(date) => setFormData({...formData, tanggalMasuk: date})}
            />
            <div className="space-y-2">
              <Label>Jenis Kode Surat</Label>
              <Select value={formData.kodeSurat} onValueChange={(v) => setFormData({...formData, kodeSurat: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kode surat" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.entries(groupedKodeSurat).map(([kategori, items]) => (
                    <React.Fragment key={kategori}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">{kategori}</div>
                      {items.map((item) => (
                        <SelectItem key={item.kode} value={item.kode}>
                          {item.kode} - {item.uraian}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nomor Surat Masuk</Label>
              <Input 
                value={formData.nomorSuratMasuk}
                onChange={(e) => setFormData({...formData, nomorSuratMasuk: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Pengirim</Label>
              <Input 
                value={formData.namaPengirim}
                onChange={(e) => setFormData({...formData, namaPengirim: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Perihal</Label>
              <Input 
                value={formData.perihal}
                onChange={(e) => setFormData({...formData, perihal: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tujuan Disposisi</Label>
              <Input 
                value={formData.tujuanDisposisi}
                onChange={(e) => setFormData({...formData, tujuanDisposisi: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Textarea 
                value={formData.keterangan}
                onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
              />
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
            <AlertDialogTitle>Hapus Agenda Kredit?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus agenda kredit dengan nomor agenda "{selectedItem?.nomorAgenda}"? 
              Tindakan ini tidak dapat dibatalkan.
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

export default AgendaKreditPage;
