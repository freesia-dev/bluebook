import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import BulkStatusAction from '@/components/BulkStatusAction';
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
import { SuratKeluar, KODE_SURAT_LIST, isOjkSurat, OjkStatus } from '@/types';
import { useSuratKeluarData } from '@/hooks/use-surat-data';
import { bulkUpdateSuratKeluarStatus } from '@/lib/supabase-store';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, CalendarIcon, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/FileUpload';

const SuratKeluarPage: React.FC = () => {
  const { toast } = useToast();
  const { userName, isAdmin, canEdit } = useAuth();
  const { data, isLoading, add, update, remove, isAdding, refetch, updateOjkStatus } = useSuratKeluarData();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<SuratKeluar | null>(null);
  const [ojkConfirm, setOjkConfirm] = useState<{ item: SuratKeluar; action: OjkStatus } | null>(null);
  const [ojkRejectReason, setOjkRejectReason] = useState('');
  const [ojkFilter, setOjkFilter] = useState<OjkStatus | 'all' | 'none'>('all');
  
  const [formData, setFormData] = useState({
    kodeSurat: '',
    namaPenerima: '',
    perihal: '',
    tujuanSurat: '',
    keterangan: '',
    tanggal: new Date(),
    fileUrl: null as string | null,
  });

  const resetForm = () => {
    setFormData({ kodeSurat: '', namaPenerima: '', perihal: '', tujuanSurat: '', keterangan: '', tanggal: new Date(), fileUrl: null });
  };

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    const editId = searchParams.get('edit');
    if (editId && data.length) {
      const item = data.find(d => d.id === editId);
      if (item) {
        setSelectedItem(item);
        setFormData({
          kodeSurat: item.kodeSurat,
          namaPenerima: item.namaPenerima,
          perihal: item.perihal,
          tujuanSurat: item.tujuanSurat,
          keterangan: item.keterangan,
          tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
          fileUrl: item.fileUrl || null,
        });
        setIsEditOpen(true);
        searchParams.delete('edit');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, data, setSearchParams]);

  const handleAdd = async () => {
    if (isSubmitting) return;
    if (!formData.kodeSurat || !formData.namaPenerima || !formData.perihal) {
      toast({ title: 'Validasi Error', description: 'Harap isi semua field yang wajib.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newItem = await add({
        kodeSurat: formData.kodeSurat,
        namaPenerima: formData.namaPenerima,
        perihal: formData.perihal,
        tujuanSurat: formData.tujuanSurat,
        status: 'Belum Dikirim',
        keterangan: formData.keterangan || '-',
        userInput: userName || 'Unknown',
        tanggal: formData.tanggal,
        fileUrl: formData.fileUrl,
      });

      setSuccessMessage(`Surat Berhasil Disimpan dengan nomor Agenda: ${newItem.nomorAgenda}`);
      setIsAddOpen(false);
      setIsSuccessOpen(true);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menyimpan data.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedItem || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await update({ id: selectedItem.id, data: {
        ...formData,
        tanggal: formData.tanggal,
        fileUrl: formData.fileUrl,
      }});
      toast({ title: 'Berhasil', description: 'Data surat keluar berhasil diperbarui.' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui data.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      await remove(selectedItem.id);
      toast({ title: 'Berhasil', description: 'Data surat keluar berhasil dihapus.' });
      setIsDeleteOpen(false);
      setSelectedItem(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus data.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (item: SuratKeluar) => {
    const newStatus = item.status === 'Belum Dikirim' ? 'Sudah Dikirim' : 'Belum Dikirim';
    try {
      await update({ id: item.id, data: { status: newStatus } });
      toast({ title: 'Status Diperbarui', description: `Status diubah menjadi ${newStatus}.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui status.', variant: 'destructive' });
    }
  };

  const canChangeOjk = (item: SuratKeluar) => isAdmin || (userName && item.userInput === userName);

  const handleOjkStatus = async (item: SuratKeluar, status: OjkStatus, rejectReason?: string) => {
    if (!canChangeOjk(item)) {
      toast({ title: 'Akses Ditolak', description: 'Hanya admin atau penginput surat yang dapat mengubah status pengajuan OJK.', variant: 'destructive' });
      return;
    }
    try {
      await updateOjkStatus({ id: item.id, status, userNama: userName || 'Unknown', rejectReason: status === 'ditolak' ? (rejectReason || null) : null });
      const labels: Record<OjkStatus, string> = { diajukan: 'Diajukan', diproses: 'Diproses', ditolak: 'Ditolak', selesai: 'Disetujui' };
      toast({ title: 'Status OJK Diperbarui', description: `Pengajuan SLIK OJK ditandai sebagai ${labels[status]}.` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal memperbarui status OJK.', variant: 'destructive' });
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
    {
      key: 'ojk',
      header: 'Pengajuan SLIK OJK',
      render: (item: SuratKeluar) => {
        const isOjk = item.ojkStatus || isOjkSurat(item);
        if (!isOjk) return <span className="text-xs text-muted-foreground">—</span>;
        const status = (item.ojkStatus || 'diajukan') as OjkStatus;
        const variantMap: Record<OjkStatus, 'warning' | 'info' | 'destructive' | 'success'> = {
          diajukan: 'warning', diproses: 'info', ditolak: 'destructive', selesai: 'success',
        };
        const labelMap: Record<OjkStatus, string> = {
          diajukan: 'Diajukan', diproses: 'Diproses', ditolak: 'Ditolak', selesai: 'Disetujui',
        };
        const allowed = canChangeOjk(item) && canEdit;
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant={variantMap[status]}>{labelMap[status]}</Badge>
            {allowed && (
              <div className="flex gap-1">
                {status !== 'diproses' && status !== 'selesai' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOjkConfirm({ item, action: 'diproses' }); }}
                    title="Proses pengajuan (✓)"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {status === 'diproses' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOjkConfirm({ item, action: 'selesai' }); }}
                    title="Setujui pengajuan (✓)"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {status !== 'ditolak' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOjkConfirm({ item, action: 'ditolak' }); }}
                    title="Tolak / Batalkan (✗)"
                    className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      },
    },
  ];

  // Filter out D-1 (Nasabah Kredit) - only available in Agenda Kredit
  const filteredKodeSurat = KODE_SURAT_LIST.filter(item => item.kode !== 'D-1');
  const groupedKodeSurat = filteredKodeSurat.reduce((acc, item) => {
    if (!acc[item.kategori]) acc[item.kategori] = [];
    acc[item.kategori].push(item);
    return acc;
  }, {} as Record<string, typeof KODE_SURAT_LIST>);

  const bulkStatusOptions = useMemo(() => [
    {
      from: 'Belum Dikirim',
      to: 'Sudah Dikirim',
      count: data.filter(d => d.status === 'Belum Dikirim').length,
    },
    {
      from: 'Sudah Dikirim',
      to: 'Belum Dikirim',
      count: data.filter(d => d.status === 'Sudah Dikirim').length,
    },
  ], [data]);

  // Apply OJK filter
  const filteredData = useMemo(() => {
    if (ojkFilter === 'all') return data;
    if (ojkFilter === 'none') return data.filter(d => !d.ojkStatus && !isOjkSurat(d));
    return data.filter(d => (d.ojkStatus || (isOjkSurat(d) ? 'diajukan' : null)) === ojkFilter);
  }, [data, ojkFilter]);

  const handleGenerateLaporan = async () => {
    try {
      const { generateOjkReportPDF } = await import('@/lib/ojk-report');
      await generateOjkReportPDF({
        data,
        generatedBy: userName || 'User',
        statusFilter: ojkFilter === 'all' || ojkFilter === 'none' ? 'all' : ojkFilter,
      });
      toast({ title: 'Laporan Dibuat', description: 'Laporan Pengajuan SLIK OJK berhasil diunduh.' });
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message || 'Gagal membuat laporan.', variant: 'destructive' });
    }
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
        data={filteredData}
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
            fileUrl: item.fileUrl || null,
          });
          setIsEditOpen(true); 
        }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        canDelete={isAdmin}
        canEdit={canEdit}
        searchPlaceholder="Cari surat keluar..."
        addLabel="Tambah Surat Keluar"
        toolbarActions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={ojkFilter} onValueChange={(v) => setOjkFilter(v as any)}>
              <SelectTrigger className="h-10 w-[180px]">
                <SelectValue placeholder="Filter Pengajuan SLIK OJK" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Surat</SelectItem>
                <SelectItem value="diajukan">OJK · Diajukan</SelectItem>
                <SelectItem value="diproses">OJK · Diproses</SelectItem>
                <SelectItem value="selesai">OJK · Disetujui</SelectItem>
                <SelectItem value="ditolak">OJK · Ditolak</SelectItem>
                <SelectItem value="none">Non-OJK</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2 h-10" onClick={handleGenerateLaporan}>
              <Check className="w-4 h-4" />
              Laporan SLIK OJK
            </Button>
            {canEdit && (
              <BulkStatusAction
                statusOptions={bulkStatusOptions}
                onBulkUpdate={bulkUpdateSuratKeluarStatus}
                onSuccess={() => refetch()}
              />
            )}
          </div>
        }
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
            <FileUpload
              value={formData.fileUrl}
              onChange={(url) => setFormData({...formData, fileUrl: url})}
              folder="surat-keluar"
            />
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
                <div className="col-span-2">
                  <FileUpload value={selectedItem.fileUrl} onChange={() => {}} readOnly />
                </div>
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
            <FileUpload
              value={formData.fileUrl}
              onChange={(url) => setFormData({...formData, fileUrl: url})}
              folder="surat-keluar"
            />
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

      {/* OJK Confirmation Dialog */}
      <AlertDialog open={!!ojkConfirm} onOpenChange={(open) => { if (!open) { setOjkConfirm(null); setOjkRejectReason(''); } }}>
        <AlertDialogContent className="max-w-md">
          {ojkConfirm && (() => {
            const { item, action } = ojkConfirm;
            const titleMap: Record<OjkStatus, string> = {
              diajukan: 'Tandai sebagai Diajukan?',
              diproses: 'Proses Pengajuan SLIK OJK?',
              ditolak: 'Tolak Pengajuan SLIK OJK?',
              selesai: 'Setujui Pengajuan SLIK OJK?',
            };
            const descMap: Record<OjkStatus, string> = {
              diajukan: 'Surat akan ditandai sebagai Diajukan.',
              diproses: 'Surat akan ditandai sebagai Diproses (dilanjutkan ke proses pengajuan).',
              ditolak: 'Surat akan ditandai sebagai Ditolak / Dibatalkan.',
              selesai: 'Surat akan ditandai sebagai Disetujui oleh OJK.',
            };
            const currentLabel: Record<OjkStatus, string> = {
              diajukan: 'Diajukan', diproses: 'Diproses', ditolak: 'Ditolak', selesai: 'Disetujui',
            };
            const currentStatus = (item.ojkStatus || 'diajukan') as OjkStatus;
            const isDestructive = action === 'ditolak';
            const reasonTrimmed = ojkRejectReason.trim();
            const reasonInvalid = action === 'ditolak' && reasonTrimmed.length < 5;
            return (
              <>
                <AlertDialogHeader>
                  <AlertDialogTitle>{titleMap[action]}</AlertDialogTitle>
                  <AlertDialogDescription>{descMap[action]}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1.5">
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Nomor Agenda</span>
                    <span className="font-medium">{item.nomorAgenda || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Kode Surat</span>
                    <span className="font-medium">{item.kodeSurat}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Tanggal</span>
                    <span className="font-medium">{item.tanggal ? format(new Date(item.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Penerima</span>
                    <span className="font-medium">{item.namaPenerima}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Tujuan</span>
                    <span className="font-medium break-words">{item.tujuanSurat}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Perihal</span>
                    <span className="font-medium break-words">{item.perihal}</span>
                  </div>
                  {item.keterangan && (
                    <div className="grid grid-cols-[110px_1fr] gap-x-2">
                      <span className="text-muted-foreground">Keterangan</span>
                      <span className="font-medium break-words">{item.keterangan}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Status Kirim</span>
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">User Input</span>
                    <span className="font-medium">{item.userInput || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_1fr] gap-x-2">
                    <span className="text-muted-foreground">Status OJK</span>
                    <span className="font-medium">{currentLabel[currentStatus]}</span>
                  </div>
                  {item.ojkRejectReason && action !== 'ditolak' && (
                    <div className="grid grid-cols-[110px_1fr] gap-x-2">
                      <span className="text-muted-foreground">Alasan Tolak</span>
                      <span className="font-medium break-words text-destructive">{item.ojkRejectReason}</span>
                    </div>
                  )}
                </div>
                {action === 'ditolak' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ojk-reject-reason" className="text-sm">
                      Alasan Penolakan <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="ojk-reject-reason"
                      value={ojkRejectReason}
                      onChange={(e) => setOjkRejectReason(e.target.value)}
                      placeholder="Jelaskan alasan pengajuan ini dibatalkan / ditolak (min. 5 karakter)..."
                      rows={3}
                      maxLength={500}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">{reasonTrimmed.length}/500 karakter</p>
                  </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={reasonInvalid}
                    onClick={async (e) => {
                      if (reasonInvalid) { e.preventDefault(); return; }
                      await handleOjkStatus(item, action, action === 'ditolak' ? reasonTrimmed : undefined);
                      setOjkConfirm(null);
                      setOjkRejectReason('');
                    }}
                    className={isDestructive ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90 text-success-foreground'}
                  >
                    {action === 'ditolak' ? 'Tolak' : action === 'selesai' ? 'Setujui' : 'Proses'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default SuratKeluarPage;
