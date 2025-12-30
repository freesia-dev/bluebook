import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PK } from '@/types';
import { 
  getPK, addPK, updatePK, deletePK, 
  getJenisKredit, getJenisDebitur, getKodeFasilitas, getSektorEkonomi 
} from '@/lib/store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';

interface PKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

const PKPage: React.FC<PKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const [data, setData] = useState<PK[]>([]);
  const [jenisKreditOptions, setJenisKreditOptions] = useState<{id: string; nama: string}[]>([]);
  const [jenisDebiturOptions, setJenisDebiturOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  const [kodeFasilitasOptions, setKodeFasilitasOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  const [sektorEkonomiOptions, setSektorEkonomiOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<PK | null>(null);
  
  const [formData, setFormData] = useState({
    namaDebitur: '',
    jenisKredit: '',
    plafon: '',
    jangkaWaktu: '',
    jenisDebitur: '',
    kodeFasilitas: '',
    sektorEkonomi: '',
  });

  useEffect(() => {
    loadData();
    loadOptions();
  }, [type]);

  const loadData = () => {
    setData(getPK().filter(s => s.type === type));
  };

  const loadOptions = () => {
    setJenisKreditOptions(getJenisKredit());
    setJenisDebiturOptions(getJenisDebitur());
    setKodeFasilitasOptions(getKodeFasilitas());
    setSektorEkonomiOptions(getSektorEkonomi());
  };

  const resetForm = () => {
    setFormData({
      namaDebitur: '',
      jenisKredit: '',
      plafon: '',
      jangkaWaktu: '',
      jenisDebitur: '',
      kodeFasilitas: '',
      sektorEkonomi: '',
    });
  };

  const handleAdd = () => {
    if (!formData.namaDebitur || !formData.jenisKredit || !formData.plafon) {
      toast({
        title: 'Validasi Error',
        description: 'Harap isi semua field yang wajib.',
        variant: 'destructive',
      });
      return;
    }

    const newItem = addPK({
      namaDebitur: formData.namaDebitur,
      jenisKredit: formData.jenisKredit,
      plafon: parseFloat(formData.plafon.replace(/\D/g, '')),
      jangkaWaktu: formData.jangkaWaktu,
      jenisDebitur: formData.jenisDebitur,
      kodeFasilitas: formData.kodeFasilitas,
      sektorEkonomi: formData.sektorEkonomi,
      type,
    });

    setSuccessMessage(`PK Berhasil diinput dengan Nomor: ${newItem.nomorPK}`);
    setIsAddOpen(false);
    setIsSuccessOpen(true);
    resetForm();
    loadData();
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    
    updatePK(selectedItem.id, {
      namaDebitur: formData.namaDebitur,
      jenisKredit: formData.jenisKredit,
      plafon: parseFloat(formData.plafon.replace(/\D/g, '')),
      jangkaWaktu: formData.jangkaWaktu,
      jenisDebitur: formData.jenisDebitur,
      kodeFasilitas: formData.kodeFasilitas,
      sektorEkonomi: formData.sektorEkonomi,
    });

    toast({ title: 'Berhasil', description: 'Data PK berhasil diperbarui.' });
    setIsEditOpen(false);
    loadData();
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deletePK(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data PK berhasil dihapus.' });
    setIsDeleteOpen(false);
    setSelectedItem(null);
    loadData();
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      'Nomor PK': item.nomorPK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': item.jenisKredit,
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Jenis Debitur': item.jenisDebitur,
      'Kode Fasilitas': item.kodeFasilitas,
      'Sektor Ekonomi': item.sektorEkonomi,
      'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
    }));
    exportToExcel(exportData, `PK_${type.charAt(0).toUpperCase() + type.slice(1)}`, 'PK');
    toast({ title: 'Export Berhasil', description: 'Data PK berhasil diekspor.' });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorPK', header: 'Nomor PK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit' },
    { key: 'plafon', header: 'Plafon', render: (item: PK) => formatCurrency(item.plafon) },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
    { key: 'jenisDebitur', header: 'Jenis Debitur' },
    { key: 'kodeFasilitas', header: 'Kode Fasilitas' },
    { key: 'sektorEkonomi', header: 'Sektor Ekonomi' },
  ];

  return (
    <MainLayout>
      <PageHeader title={title} description={`Kelola data ${title}`} />

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
            plafon: item.plafon.toString(),
            jangkaWaktu: item.jangkaWaktu,
            jenisDebitur: item.jenisDebitur,
            kodeFasilitas: item.kodeFasilitas,
            sektorEkonomi: item.sektorEkonomi,
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        searchPlaceholder="Cari PK..."
        addLabel="Tambah PK"
      />

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah {title}</DialogTitle>
            <DialogDescription>Masukkan data PK baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Debitur <span className="text-destructive">*</span></Label>
              <Input value={formData.namaDebitur} onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})} placeholder="Nama debitur" />
            </div>
            <div className="space-y-2">
              <Label>Jenis Kredit <span className="text-destructive">*</span></Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis kredit" /></SelectTrigger>
                <SelectContent>
                  {jenisKreditOptions.map((jk) => (<SelectItem key={jk.id} value={jk.nama}>{jk.nama}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plafon <span className="text-destructive">*</span></Label>
              <Input value={formData.plafon} onChange={(e) => setFormData({...formData, plafon: e.target.value})} placeholder="Jumlah plafon" />
            </div>
            <div className="space-y-2">
              <Label>Jangka Waktu</Label>
              <Input value={formData.jangkaWaktu} onChange={(e) => setFormData({...formData, jangkaWaktu: e.target.value})} placeholder="Contoh: 12 Bulan" />
            </div>
            <div className="space-y-2">
              <Label>Jenis Debitur</Label>
              <Select value={formData.jenisDebitur} onValueChange={(v) => setFormData({...formData, jenisDebitur: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis debitur" /></SelectTrigger>
                <SelectContent>
                  {jenisDebiturOptions.map((jd) => (<SelectItem key={jd.id} value={jd.kode}>{jd.kode} - {jd.keterangan}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kode Fasilitas</Label>
              <Select value={formData.kodeFasilitas} onValueChange={(v) => setFormData({...formData, kodeFasilitas: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih kode fasilitas" /></SelectTrigger>
                <SelectContent>
                  {kodeFasilitasOptions.map((kf) => (<SelectItem key={kf.id} value={kf.kode}>{kf.kode} - {kf.keterangan}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sektor Ekonomi</Label>
              <Select value={formData.sektorEkonomi} onValueChange={(v) => setFormData({...formData, sektorEkonomi: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih sektor ekonomi" /></SelectTrigger>
                <SelectContent>
                  {sektorEkonomiOptions.map((se) => (<SelectItem key={se.id} value={se.kode}>{se.kode} - {se.keterangan}</SelectItem>))}
                </SelectContent>
              </Select>
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
          <DialogHeader><DialogTitle className="font-display">Detail PK</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><p className="text-sm text-muted-foreground">Nomor PK</p><p className="font-medium">{selectedItem.nomorPK}</p></div>
              <div><p className="text-sm text-muted-foreground">Nama Debitur</p><p className="font-medium">{selectedItem.namaDebitur}</p></div>
              <div><p className="text-sm text-muted-foreground">Jenis Kredit</p><p className="font-medium">{selectedItem.jenisKredit}</p></div>
              <div><p className="text-sm text-muted-foreground">Plafon</p><p className="font-medium">{formatCurrency(selectedItem.plafon)}</p></div>
              <div><p className="text-sm text-muted-foreground">Jangka Waktu</p><p className="font-medium">{selectedItem.jangkaWaktu}</p></div>
              <div><p className="text-sm text-muted-foreground">Jenis Debitur</p><p className="font-medium">{selectedItem.jenisDebitur}</p></div>
              <div><p className="text-sm text-muted-foreground">Kode Fasilitas</p><p className="font-medium">{selectedItem.kodeFasilitas}</p></div>
              <div><p className="text-sm text-muted-foreground">Sektor Ekonomi</p><p className="font-medium">{selectedItem.sektorEkonomi}</p></div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsViewOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit PK</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nama Debitur</Label><Input value={formData.namaDebitur} onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})} /></div>
            <div className="space-y-2"><Label>Jenis Kredit</Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{jenisKreditOptions.map((jk) => (<SelectItem key={jk.id} value={jk.nama}>{jk.nama}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Plafon</Label><Input value={formData.plafon} onChange={(e) => setFormData({...formData, plafon: e.target.value})} /></div>
            <div className="space-y-2"><Label>Jangka Waktu</Label><Input value={formData.jangkaWaktu} onChange={(e) => setFormData({...formData, jangkaWaktu: e.target.value})} /></div>
            <div className="space-y-2"><Label>Jenis Debitur</Label>
              <Select value={formData.jenisDebitur} onValueChange={(v) => setFormData({...formData, jenisDebitur: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{jenisDebiturOptions.map((jd) => (<SelectItem key={jd.id} value={jd.kode}>{jd.kode} - {jd.keterangan}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Kode Fasilitas</Label>
              <Select value={formData.kodeFasilitas} onValueChange={(v) => setFormData({...formData, kodeFasilitas: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{kodeFasilitasOptions.map((kf) => (<SelectItem key={kf.id} value={kf.kode}>{kf.kode} - {kf.keterangan}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sektor Ekonomi</Label>
              <Select value={formData.sektorEkonomi} onValueChange={(v) => setFormData({...formData, sektorEkonomi: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{sektorEkonomiOptions.map((se) => (<SelectItem key={se.id} value={se.kode}>{se.kode} - {se.keterangan}</SelectItem>))}</SelectContent>
              </Select>
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
            <AlertDialogTitle>Hapus PK?</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus PK "{selectedItem?.nomorPK}"?</AlertDialogDescription>
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

export default PKPage;
