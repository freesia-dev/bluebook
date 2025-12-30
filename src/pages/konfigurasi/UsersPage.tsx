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
import { getUsers, addUser, deleteUser, updateUser } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<User[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<User | null>(null);
  const [formData, setFormData] = useState({ nama: '', username: '', password: '', role: 'user' as 'admin' | 'user', keterangan: '' });

  useEffect(() => { setData(getUsers()); }, []);

  const resetForm = () => setFormData({ nama: '', username: '', password: '', role: 'user', keterangan: '' });

  const handleAdd = () => {
    if (!formData.nama || !formData.username || !formData.password) {
      toast({ title: 'Error', description: 'Harap isi semua field wajib.', variant: 'destructive' });
      return;
    }
    addUser(formData);
    toast({ title: 'Berhasil', description: 'User baru berhasil ditambahkan.' });
    setIsAddOpen(false);
    resetForm();
    setData(getUsers());
  };

  const handleEdit = () => {
    if (!selectedItem) return;
    if (!formData.nama || !formData.username) {
      toast({ title: 'Error', description: 'Harap isi semua field wajib.', variant: 'destructive' });
      return;
    }
    const updateData: Partial<User> = {
      nama: formData.nama,
      username: formData.username,
      role: formData.role,
      keterangan: formData.keterangan,
    };
    if (formData.password) {
      updateData.password = formData.password;
    }
    updateUser(selectedItem.id, updateData);
    toast({ title: 'Berhasil', description: 'User berhasil diperbarui.' });
    setIsEditOpen(false);
    resetForm();
    setData(getUsers());
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    deleteUser(selectedItem.id);
    toast({ title: 'Berhasil', description: 'User berhasil dihapus.' });
    setIsDeleteOpen(false);
    setData(getUsers());
  };

  const openEdit = (item: User) => {
    setSelectedItem(item);
    setFormData({ 
      nama: item.nama, 
      username: item.username, 
      password: '', 
      role: item.role, 
      keterangan: item.keterangan 
    });
    setIsEditOpen(true);
  };

  const columns = [
    { key: 'nama', header: 'Nama' },
    { key: 'username', header: 'Username' },
    { key: 'role', header: 'Role', render: (item: User) => <Badge variant={item.role === 'admin' ? 'default' : 'secondary'}>{item.role}</Badge> },
    { key: 'keterangan', header: 'Keterangan' },
  ];

  return (
    <MainLayout>
      <PageHeader title="Pengaturan User" description="Kelola akun pengguna sistem" />
      <DataTable 
        data={data} 
        columns={columns} 
        onAdd={() => { resetForm(); setIsAddOpen(true); }} 
        onEdit={openEdit}
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nama <span className="text-destructive">*</span></Label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} /></div>
            <div className="space-y-2"><Label>Username <span className="text-destructive">*</span></Label><Input value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} /></div>
            <div className="space-y-2"><Label>Password <span className="text-muted-foreground text-xs">(kosongkan jika tidak ingin mengubah)</span></Label><Input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="Biarkan kosong" /></div>
            <div className="space-y-2"><Label>Role</Label><Select value={formData.role} onValueChange={(v: 'admin' | 'user') => setFormData({...formData, role: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin (IT)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Keterangan</Label><Input value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
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