import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { User } from '@/types';
import { getUsers, addUser, deleteUser } from '@/lib/supabase-store';
import { useToast } from '@/hooks/use-toast';

const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [formData, setFormData] = useState({ nama: '', username: '', password: '', role: 'user' as 'admin' | 'user', keterangan: '' });

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const users = await getUsers();
      setData(users);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({ title: 'Error', description: 'Gagal memuat data user.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData({ nama: '', username: '', password: '', role: 'user', keterangan: '' });

  const handleAdd = async () => {
    if (!formData.nama || !formData.username || !formData.password) {
      toast({ title: 'Error', description: 'Harap isi semua field wajib.', variant: 'destructive' });
      return;
    }
    try {
      await addUser(formData);
      toast({ title: 'Berhasil', description: 'User baru berhasil ditambahkan.' });
      setIsAddOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menambahkan user.', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteUser(selectedItem.id);
      toast({ title: 'Berhasil', description: 'User berhasil dihapus.' });
      setIsDeleteOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Gagal menghapus user.', variant: 'destructive' });
    }
  };

  const columns = [
    { key: 'nama', header: 'Nama' },
    { key: 'username', header: 'Username' },
    { key: 'role', header: 'Role', render: (item: User) => <Badge variant={item.role === 'admin' ? 'default' : 'secondary'}>{item.role}</Badge> },
    { key: 'keterangan', header: 'Keterangan' },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Pengaturan User" description="Kelola akun pengguna sistem" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Memuat data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Pengaturan User" description="Kelola akun pengguna sistem" />
      <DataTable 
        data={data} 
        columns={columns} 
        onAdd={() => { resetForm(); setIsAddOpen(true); }} 
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }} 
        searchPlaceholder="Cari user..." 
        addLabel="Tambah User" 
      />
      
      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tambah User Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nama <span className="text-destructive">*</span></Label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} /></div>
            <div className="space-y-2"><Label>Username <span className="text-destructive">*</span></Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
            <div className="space-y-2"><Label>Password <span className="text-destructive">*</span></Label><Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} /></div>
            <div className="space-y-2"><Label>Role</Label><Select value={formData.role} onValueChange={(v: 'admin' | 'user') => setFormData({...formData, role: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin (IT)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Keterangan</Label><Input value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus User?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus user "{selectedItem?.nama}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default UsersPage;
