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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, KeyRound, Check, X } from 'lucide-react';
import { UserRole } from '@/types';
import { getUserRoles, addUserRole, updateUserRole, deleteUserRole } from '@/lib/supabase-store';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  nama: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface UserRoleDisplay extends UserRole {
  email?: string;
  nama?: string;
}

interface PendingUser {
  id: string;
  userId: string;
  nama: string;
  email?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
}

const UsersPage: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<UserRoleDisplay[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserRoleDisplay | null>(null);
  const [formData, setFormData] = useState({ userId: '', role: 'user' as 'admin' | 'user' });
  const [editFormData, setEditFormData] = useState({ role: 'user' as 'admin' | 'user' });
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => { 
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const roles = await getUserRoles();
      
      // Fetch profiles to get names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Fetch current user's email
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserEmail = sessionData?.session?.user?.email;
      const currentUserId = sessionData?.session?.user?.id;
      
      // Map roles with profile data
      const rolesWithProfile: UserRoleDisplay[] = roles.map(r => {
        const profile = profiles?.find(p => p.user_id === r.userId);
        return {
          ...r,
          nama: profile?.nama || '',
          email: r.userId === currentUserId ? currentUserEmail : undefined
        };
      });
      
      setData(rolesWithProfile);

      // Load pending users
      const pendingProfiles = profiles?.filter(p => p.status === 'pending') || [];
      setPendingUsers(pendingProfiles.map(p => ({
        id: p.id,
        userId: p.user_id,
        nama: p.nama || 'Belum diisi',
        status: p.status as 'pending' | 'approved' | 'rejected',
        createdAt: new Date(p.created_at)
      })));

    } catch (error) {
      console.error('Error loading data:', error);
      toast({ title: 'Error', description: 'Gagal memuat data.', variant: 'destructive' });
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

  const handleResetPassword = async () => {
    if (!selectedItem || !newPassword) return;
    
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password minimal 6 karakter.', variant: 'destructive' });
      return;
    }

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { userId: selectedItem.userId, newPassword }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Berhasil', description: 'Password berhasil direset.' });
      setIsResetPasswordOpen(false);
      setNewPassword('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal reset password.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('user_id', userId);

      if (error) throw error;

      // Add default user role
      await addUserRole(userId, 'user');

      toast({ title: 'Berhasil', description: 'User berhasil diapprove.' });
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal approve user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Berhasil', description: 'User berhasil ditolak.' });
      loadData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menolak user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const openEditDialog = (item: UserRoleDisplay) => {
    setSelectedItem(item);
    setEditFormData({ role: item.role });
    setIsEditOpen(true);
  };

  const openResetPasswordDialog = (item: UserRoleDisplay) => {
    setSelectedItem(item);
    setNewPassword('');
    setIsResetPasswordOpen(true);
  };

  const columns = [
    { 
      key: 'nama', 
      header: 'Nama', 
      render: (item: UserRoleDisplay) => (
        <span className="font-medium">{item.nama || '-'}</span>
      )
    },
    { 
      key: 'email', 
      header: 'Email / User ID', 
      render: (item: UserRoleDisplay) => (
        <div className="flex flex-col">
          {item.email ? (
            <>
              <span>{item.email}</span>
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
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openEditDialog(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openResetPasswordDialog(item);
            }}
            title="Reset Password"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const pendingColumns = [
    { key: 'nama', header: 'Nama', render: (item: PendingUser) => <span className="font-medium">{item.nama || '-'}</span> },
    { key: 'userId', header: 'User ID', render: (item: PendingUser) => <span className="font-mono text-sm">{item.userId}</span> },
    { key: 'createdAt', header: 'Tanggal Daftar', render: (item: PendingUser) => item.createdAt.toLocaleDateString('id-ID') },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: PendingUser) => (
        <div className="flex gap-1">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleApproveUser(item.userId)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRejectUser(item.userId)}
          >
            <X className="h-4 w-4 mr-1" />
            Tolak
          </Button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Pengaturan User" description="Kelola pengguna sistem" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Memuat data...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader title="Pengaturan User" description="Kelola pengguna dan role sistem" />
      
      <Tabs defaultValue="roles" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="roles">Role User ({data.length})</TabsTrigger>
          <TabsTrigger value="pending">
            Menunggu Approval 
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <DataTable 
            data={data} 
            columns={columns} 
            onAdd={() => { resetForm(); setIsAddOpen(true); }} 
            onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }} 
            searchPlaceholder="Cari user..." 
            addLabel="Tambah Role" 
          />
        </TabsContent>

        <TabsContent value="pending">
          {pendingUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada user yang menunggu approval.
            </div>
          ) : (
            <DataTable 
              data={pendingUsers} 
              columns={pendingColumns} 
              searchPlaceholder="Cari user..." 
            />
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Role User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User ID (UUID) <span className="text-destructive">*</span></Label>
              <Input 
                value={formData.userId} 
                onChange={(e) => setFormData({...formData, userId: e.target.value})} 
                placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              />
              <p className="text-xs text-muted-foreground">Salin User ID dari tab Menunggu Approval atau dari backend</p>
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
                <div className="font-medium">{selectedItem?.nama || '-'}</div>
                {selectedItem?.email && <div className="text-sm text-muted-foreground">{selectedItem.email}</div>}
                <div className="text-xs text-muted-foreground font-mono">{selectedItem?.userId}</div>
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

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <div className="p-2 bg-muted rounded-md">
                <div className="font-medium">{selectedItem?.nama || '-'}</div>
                {selectedItem?.email && <div className="text-sm text-muted-foreground">{selectedItem.email}</div>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password Baru <span className="text-destructive">*</span></Label>
              <Input 
                type="password"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>Batal</Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? 'Menyimpan...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role User?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus role user {selectedItem?.nama || selectedItem?.userId}?
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
