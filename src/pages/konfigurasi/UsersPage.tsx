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
import { Pencil } from 'lucide-react';
import { UserRole } from '@/types';
import { getUserRoles, addUserRole, updateUserRole, deleteUserRole } from '@/lib/supabase-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRoleDisplay extends UserRole {
  email?: string;
}

const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<UserRoleDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserRoleDisplay | null>(null);
  const [formData, setFormData] = useState({ userId: '', role: 'user' as 'admin' | 'user' });
  const [editFormData, setEditFormData] = useState({ role: 'user' as 'admin' | 'user' });

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const roles = await getUserRoles();
      
      // Fetch user emails from auth - we'll get the current user's email at minimum
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserEmail = sessionData?.session?.user?.email;
      const currentUserId = sessionData?.session?.user?.id;
      
      // Map roles with email (we can only reliably get current user's email)
      const rolesWithEmail: UserRoleDisplay[] = roles.map(r => ({
        ...r,
        email: r.userId === currentUserId ? currentUserEmail : undefined
      }));
      
      setData(rolesWithEmail);
    } catch (error) {
      console.error('Error loading user roles:', error);
      toast({ title: 'Error', description: 'Gagal memuat data role user.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData({ userId: '', role: 'user' });

  const handleAdd = async () => {
    if (!formData.userId) {
      toast({ title: 'Error', description: 'Harap isi User ID.', variant: 'destructive' });
      return;
    }
    try {
      await addUserRole(formData.userId, formData.role);
      toast({ title: 'Berhasil', description: 'Role user berhasil ditambahkan.' });
      setIsAddOpen(false);
      resetForm();
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan role user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    try {
      await updateUserRole(selectedItem.id, editFormData.role);
      toast({ title: 'Berhasil', description: 'Role user berhasil diperbarui.' });
      setIsEditOpen(false);
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui role user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteUserRole(selectedItem.id);
      toast({ title: 'Berhasil', description: 'Role user berhasil dihapus.' });
      setIsDeleteOpen(false);
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus role user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const openEditDialog = (item: UserRoleDisplay) => {
    setSelectedItem(item);
    setEditFormData({ role: item.role });
    setIsEditOpen(true);
  };

  const columns = [
    { 
      key: 'email', 
      header: 'Email / User ID', 
      render: (item: UserRoleDisplay) => (
        <div className="flex flex-col">
          {item.email ? (
            <>
              <span className="font-medium">{item.email}</span>
              <span className="text-xs text-muted-foreground">{item.userId}</span>
            </>
          ) : (
            <span className="font-mono text-sm">{item.userId}</span>
          )}
        </div>
      )
    },
    { 
      key: 'role', 
      header: 'Role', 
      render: (item: UserRoleDisplay) => (
        <Badge variant={item.role === 'admin' ? 'default' : 'secondary'}>
          {item.role === 'admin' ? 'Admin (IT)' : 'User'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: UserRoleDisplay) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openEditDialog(item);
          }}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Edit
        </Button>
      )
    }
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Pengaturan Role User" description="Kelola role pengguna sistem" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Memuat data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Pengaturan Role User" description="Kelola role pengguna sistem" />
      <DataTable 
        data={data} 
        columns={columns} 
        onAdd={() => { resetForm(); setIsAddOpen(true); }} 
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }} 
        searchPlaceholder="Cari user..." 
        addLabel="Tambah Role" 
      />
      
      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Role User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User ID (UUID dari Supabase Auth) <span className="text-destructive">*</span></Label>
              <Input 
                value={formData.userId} 
                onChange={(e) => setFormData({...formData, userId: e.target.value})} 
                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              />
              <p className="text-xs text-muted-foreground">Dapatkan User ID dari halaman Authentication di backend</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v: 'admin' | 'user') => setFormData({...formData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin (IT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Role User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <div className="p-2 bg-muted rounded-md">
                {selectedItem?.email ? (
                  <div>
                    <span className="font-medium">{selectedItem.email}</span>
                    <p className="text-xs text-muted-foreground">{selectedItem.userId}</p>
                  </div>
                ) : (
                  <span className="font-mono text-sm">{selectedItem?.userId}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editFormData.role} onValueChange={(v: 'admin' | 'user') => setEditFormData({...editFormData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin (IT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role User?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus role user {selectedItem?.email || selectedItem?.userId}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default UsersPage;
