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
import { KKMPAK, JenisKredit } from '@/types';
import { 
  getKKMPAK, addKKMPAK, updateKKMPAK, deleteKKMPAK, 
  getJenisKredit, getJenisDebitur, getKodeFasilitas, getSektorEkonomi 
} from '@/lib/supabase-store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { CheckCircle2, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface KKMPAKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

const KKMPAKPage: React.FC<KKMPAKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const [data, setData] = useState<KKMPAK[]>([]);
  const [jenisKreditOptions, setJenisKreditOptions] = useState<JenisKredit[]>([]);
  const [jenisDebiturOptions, setJenisDebiturOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  const [kodeFasilitasOptions, setKodeFasilitasOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  const [sektorEkonomiOptions, setSektorEkonomiOptions] = useState<{id: string; kode: string; keterangan: string}[]>([]);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<KKMPAK | null>(null);
  
  const [formData, setFormData] = useState({
    namaDebitur: '',
    jenisKredit: '',
    plafon: '',
    jangkaWaktu: '',
    jenisDebitur: '',
    kodeFasilitas: '',
    sektorEkonomi: '',
    tanggal: new Date(),
  });

  useEffect(() => {
    loadData();
    loadOptions();
  }, [type]);

  const loadData = async () => {
    const allData = await getKKMPAK();
    setData(allData.filter(s => s.type === type));
  };

  const loadOptions = async () => {
    const [jk, jd, kf, se] = await Promise.all([
      getJenisKredit(),
      getJenisDebitur(),
      getKodeFasilitas(),
      getSektorEkonomi()
    ]);
    setJenisKreditOptions(jk);
    setJenisDebiturOptions(jd);
    setKodeFasilitasOptions(kf);
    setSektorEkonomiOptions(se);
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
      tanggal: new Date(),
    });
  };

  const handlePlafonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value);
    setFormData({...formData, plafon: formatted});
  };

  const handleAdd = async () => {
    if (!formData.namaDebitur || !formData.jenisKredit || !formData.plafon) {
      toast({ title: 'Validasi Error', description: 'Harap isi semua field yang wajib.', variant: 'destructive' });
      return;
    }

    const newItem = await addKKMPAK({
      namaDebitur: formData.namaDebitur,
      jenisKredit: formData.jenisKredit,
      plafon: parseCurrencyValue(formData.plafon),
      jangkaWaktu: formData.jangkaWaktu,
      jenisDebitur: formData.jenisDebitur,
      kodeFasilitas: formData.kodeFasilitas,
      sektorEkonomi: formData.sektorEkonomi,
      type,
      tanggal: formData.tanggal,
    });

    const msg = type === 'telihan' 
      ? `KK Berhasil diinput dengan Nomor: ${newItem.nomorKK}\nMPAK Berhasil diinput dengan Nomor: ${newItem.nomorMPAK}`
      : `Agenda dan MPAK Berhasil diinput dengan Nomor: ${newItem.nomorKK}`;
    
    setSuccessMessage(msg);
    setIsAddOpen(false);
    setIsSuccessOpen(true);
    resetForm();
    loadData();
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    
    await updateKKMPAK(selectedItem.id, {
      namaDebitur: formData.namaDebitur,
      jenisKredit: formData.jenisKredit,
      plafon: parseCurrencyValue(formData.plafon),
      jangkaWaktu: formData.jangkaWaktu,
      jenisDebitur: formData.jenisDebitur,
      kodeFasilitas: formData.kodeFasilitas,
      sektorEkonomi: formData.sektorEkonomi,
      tanggal: formData.tanggal,
    });

    toast({ title: 'Berhasil', description: 'Data berhasil diperbarui.' });
    setIsEditOpen(false);
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await deleteKKMPAK(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data berhasil dihapus.' });
    setIsDeleteOpen(false);
    setSelectedItem(null);
    loadData();
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      [type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda']: item.nomorKK,
      'Nomor MPAK': item.nomorMPAK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': item.jenisKredit,
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Jenis Debitur': item.jenisDebitur,
      'Kode Fasilitas': item.kodeFasilitas,
      'Sektor Ekonomi': item.sektorEkonomi,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    const filename = type === 'telihan' ? 'KK_MPAK_Telihan' : 'Agenda_MPAK_Meranti';
    exportToExcel(exportData, filename, type === 'telihan' ? 'KK MPAK' : 'Agenda MPAK');
    toast({ title: 'Export Berhasil', description: 'Data berhasil diekspor.' });
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
    { key: 'nomorKK', header: type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda' },
    { key: 'nomorMPAK', header: 'Nomor MPAK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit', render: (item: KKMPAK) => getJenisKreditLabel(item.jenisKredit) },
    { key: 'plafon', header: 'Plafon', render: (item: KKMPAK) => formatCurrencyDisplay(item.plafon) },
    { 
      key: 'tanggal', 
      header: 'Tanggal',
      render: (item: KKMPAK) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-'
    },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
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
            plafon: formatCurrencyInput(item.plafon.toString()),
            jangkaWaktu: item.jangkaWaktu,
            jenisDebitur: item.jenisDebitur,
            kodeFasilitas: item.kodeFasilitas,
            sektorEkonomi: item.sektorEkonomi,
            tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        searchPlaceholder={`Cari ${type === 'telihan' ? 'KK & MPAK' : 'Agenda & MPAK'}...`}
        addLabel={`Tambah ${type === 'telihan' ? 'KK & MPAK' : 'Agenda & MPAK'}`}
      />

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah {title}</DialogTitle>
            <DialogDescription>Masukkan data baru</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2"><Label>Nama Debitur <span className="text-destructive">*</span></Label><Input value={formData.namaDebitur} onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})} placeholder="Nama debitur" /></div>
            <div className="space-y-2"><Label>Jenis Kredit <span className="text-destructive">*</span></Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis kredit" /></SelectTrigger>
                <SelectContent>{jenisKreditOptions.map((jk) => (<SelectItem key={jk.id} value={jk.id}>{jk.nama} - {jk.produkKredit}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Plafon <span className="text-destructive">*</span></Label><Input value={formData.plafon} onChange={handlePlafonChange} placeholder="1,000,000.00" /></div>
            <div className="space-y-2"><Label>Jangka Waktu</Label><Input value={formData.jangkaWaktu} onChange={(e) => setFormData({...formData, jangkaWaktu: e.target.value})} placeholder="Contoh: 12 Bulan" /></div>
            <div className="space-y-2"><Label>Jenis Debitur</Label>
              <Select value={formData.jenisDebitur} onValueChange={(v) => setFormData({...formData, jenisDebitur: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih jenis debitur" /></SelectTrigger>
                <SelectContent>{jenisDebiturOptions.map((jd) => (<SelectItem key={jd.id} value={jd.kode}>{jd.kode} - {jd.keterangan}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Kode Fasilitas</Label>
              <Select value={formData.kodeFasilitas} onValueChange={(v) => setFormData({...formData, kodeFasilitas: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih kode fasilitas" /></SelectTrigger>
                <SelectContent>{kodeFasilitasOptions.map((kf) => (<SelectItem key={kf.id} value={kf.kode}>{kf.kode} - {kf.keterangan}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Sektor Ekonomi</Label>
              <Select value={formData.sektorEkonomi} onValueChange={(v) => setFormData({...formData, sektorEkonomi: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih sektor ekonomi" /></SelectTrigger>
                <SelectContent>{sektorEkonomiOptions.map((se) => (<SelectItem key={se.id} value={se.kode}>{se.kode} - {se.keterangan}</SelectItem>))}</SelectContent>
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
          <DialogHeader><DialogTitle className="font-display">Detail {type === 'telihan' ? 'KK & MPAK' : 'Agenda & MPAK'}</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><p className="text-sm text-muted-foreground">{type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda'}</p><p className="font-medium">{selectedItem.nomorKK}</p></div>
              <div><p className="text-sm text-muted-foreground">Nomor MPAK</p><p className="font-medium">{selectedItem.nomorMPAK}</p></div>
              <div><p className="text-sm text-muted-foreground">Nama Debitur</p><p className="font-medium">{selectedItem.namaDebitur}</p></div>
              <div><p className="text-sm text-muted-foreground">Jenis Kredit</p><p className="font-medium">{getJenisKreditLabel(selectedItem.jenisKredit)}</p></div>
              <div><p className="text-sm text-muted-foreground">Plafon</p><p className="font-medium">{formatCurrencyDisplay(selectedItem.plafon)}</p></div>
              <div><p className="text-sm text-muted-foreground">Jangka Waktu</p><p className="font-medium">{selectedItem.jangkaWaktu}</p></div>
              <div><p className="text-sm text-muted-foreground">Tanggal</p><p className="font-medium">{selectedItem.tanggal ? format(new Date(selectedItem.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}</p></div>
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
          <DialogHeader><DialogTitle className="font-display">Edit {type === 'telihan' ? 'KK & MPAK' : 'Agenda & MPAK'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData({...formData, tanggal: date})} label="Tanggal" />
            <div className="space-y-2"><Label>Nama Debitur</Label><Input value={formData.namaDebitur} onChange={(e) => setFormData({...formData, namaDebitur: e.target.value})} /></div>
            <div className="space-y-2"><Label>Jenis Kredit</Label>
              <Select value={formData.jenisKredit} onValueChange={(v) => setFormData({...formData, jenisKredit: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{jenisKreditOptions.map((jk) => (<SelectItem key={jk.id} value={jk.id}>{jk.nama} - {jk.produkKredit}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Plafon</Label><Input value={formData.plafon} onChange={handlePlafonChange} /></div>
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
            <AlertDialogTitle>Hapus Data?</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus data ini?</AlertDialogDescription>
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
            <p className="text-lg font-medium text-foreground whitespace-pre-line">{successMessage}</p>
          </div>
          <DialogFooter className="justify-center"><Button onClick={() => setIsSuccessOpen(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default KKMPAKPage;
