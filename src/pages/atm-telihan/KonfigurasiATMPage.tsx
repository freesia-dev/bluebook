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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ATMConfig, JABATAN_ATM_LIST } from '@/types';
import { getATMConfig, addATMConfig, updateATMConfig, deleteATMConfig } from '@/lib/atm-store';
import { Settings, CheckCircle2 } from 'lucide-react';

const KonfigurasiATMPage = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const canEdit = userRole !== 'demo';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<ATMConfig[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<ATMConfig | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    jabatan: '',
    keterangan: '',
    isActive: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const result = await getATMConfig();
      setData(result);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
    }
  };

  const resetForm = () => setFormData({ nama: '', jabatan: '', keterangan: '', isActive: true });

  const handleAdd = async () => {
    if (isSubmitting) return;
    if (!formData.nama || !formData.jabatan) {
      toast({ title: 'Validasi Error', description: 'Nama dan Jabatan wajib diisi.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await addATMConfig({
        nama: formData.nama,
        jabatan: formData.jabatan,
        keterangan: formData.keterangan || undefined,
        isActive: formData.isActive,
      });

      setSuccessMessage('Konfigurasi berhasil ditambahkan!');
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
      await updateATMConfig(selectedItem.id, {
        nama: formData.nama,
        jabatan: formData.jabatan,
        keterangan: formData.keterangan || undefined,
        isActive: formData.isActive,
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
      await deleteATMConfig(selectedItem.id);
      toast({ title: 'Sukses', description: 'Data berhasil dihapus' });
      setIsDeleteOpen(false);
      loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' });
    }
  };

  const columns: Column<ATMConfig>[] = [
    { key: 'nama', header: 'Nama' },
    { key: 'jabatan', header: 'Jabatan' },
    { key: 'keterangan', header: 'Keterangan', render: (item) => item.keterangan || '-' },
    { 
      key: 'isActive', 
      header: 'Status', 
      render: (item) => (
        <Badge variant={item.isActive ? 'default' : 'secondary'}>
          {item.isActive ? 'Aktif' : 'Tidak Aktif'}
        </Badge>
      )
    },
  ];

  const FormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nama <span className="text-destructive">*</span></Label>
        <Input 
          value={formData.nama} 
          onChange={(e) => setFormData({...formData, nama: e.target.value})} 
          placeholder="Nama lengkap" 
        />
      </div>
      <div className="space-y-2">
        <Label>Jabatan <span className="text-destructive">*</span></Label>
        <Select value={formData.jabatan} onValueChange={(v) => setFormData({...formData, jabatan: v})}>
          <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
          <SelectContent>
            {JABATAN_ATM_LIST.map(j => (
              <SelectItem key={j} value={j}>{j}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Keterangan</Label>
        <Input 
          value={formData.keterangan} 
          onChange={(e) => setFormData({...formData, keterangan: e.target.value})} 
          placeholder="Keterangan tambahan (opsional)" 
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Status Aktif</Label>
        <Switch 
          checked={formData.isActive} 
          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})} 
        />
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Konfigurasi ATM"
          description="Kelola data petugas ATM, teller, dan pemimpin"
        />

        <DataTable
          data={data}
          columns={columns}
          onAdd={() => setIsAddOpen(true)}
          onEdit={(item) => {
            setSelectedItem(item);
            setFormData({
              nama: item.nama,
              jabatan: item.jabatan,
              keterangan: item.keterangan || '',
              isActive: item.isActive,
            });
            setIsEditOpen(true);
          }}
          onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
          canDelete={isAdmin}
          canEdit={isAdmin}
          searchPlaceholder="Cari konfigurasi..."
          addLabel="Tambah Petugas"
          showActions={isAdmin}
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Konfigurasi</DialogTitle>
            <DialogDescription>Tambahkan petugas ATM, teller, atau pemimpin</DialogDescription>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Edit Konfigurasi</DialogTitle>
            <DialogDescription>Perbarui data konfigurasi</DialogDescription>
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

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Konfigurasi?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedItem?.nama}? Tindakan ini tidak dapat dibatalkan.
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

export default KonfigurasiATMPage;
