import React, { useState } from 'react';
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
import { Pencil, KeyRound, Check, X, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  useUsersData, 
  useAddUserRole, 
  useUpdateUserRole, 
  useDeleteUserRole,
  useApproveUser,
  useRejectUser,
  UserRoleDisplay,
  PendingUser
} from '@/hooks/use-users-data';

const UsersPage: React.FC = () => {
  const { toast } = useToast();
  
  // React Query hooks
  const { data: usersData, isLoading } = useUsersData();
  const addRoleMutation = useAddUserRole();
  const updateRoleMutation = useUpdateUserRole();
  const deleteRoleMutation = useDeleteUserRole();
  const approveMutation = useApproveUser();
  const rejectMutation = useRejectUser();

  const data = usersData?.rolesWithProfile || [];
  const pendingUsers = usersData?.pendingUsers || [];

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<UserRoleDisplay | null>(null);
  const [formData, setFormData] = useState({ userId: '', role: 'user' as 'admin' | 'user' | 'demo' });
  const [editFormData, setEditFormData] = useState({ role: 'user' as 'admin' | 'user' | 'demo' });
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Create user form
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ 
    email: '', 
    password: '', 
    nama: '', 
    role: 'user' as 'admin' | 'user' | 'demo'
  });

  const resetForm = () => setFormData({ userId: '', role: 'user' });

  const handleAdd = async () => {
    if (!formData.userId) {
      toast({ title: 'Error', description: 'Harap isi User ID.', variant: 'destructive' });
      return;
    }
    try {
      await addRoleMutation.mutateAsync({ userId: formData.userId, role: formData.role });
      toast({ title: 'Berhasil', description: 'Role user berhasil ditambahkan.' });
      setIsAddOpen(false);
      resetForm();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan role user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    try {
      await updateRoleMutation.mutateAsync({ id: selectedItem.id, role: editFormData.role });
      toast({ title: 'Berhasil', description: 'Role user berhasil diperbarui.' });
      setIsEditOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memperbarui role user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteRoleMutation.mutateAsync(selectedItem.id);
      toast({ title: 'Berhasil', description: 'Role user berhasil dihapus.' });
      setIsDeleteOpen(false);
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
      await approveMutation.mutateAsync(userId);
      toast({ title: 'Berhasil', description: 'User berhasil diapprove.' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal approve user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      await rejectMutation.mutateAsync(userId);
      toast({ title: 'Berhasil', description: 'User berhasil ditolak.' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menolak user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleCreateUser = async () => {
    if (!createUserForm.email || !createUserForm.password || !createUserForm.nama) {
      toast({ title: 'Error', description: 'Email, password, dan nama wajib diisi.', variant: 'destructive' });
      return;
    }

    if (createUserForm.password.length < 6) {
      toast({ title: 'Error', description: 'Password minimal 6 karakter.', variant: 'destructive' });
      return;
    }

    setIsCreatingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: createUserForm
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Berhasil', description: 'User berhasil dibuat.' });
      setIsCreateUserOpen(false);
      setCreateUserForm({ email: '', password: '', nama: '', role: 'user' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal membuat user.';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsCreatingUser(false);
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
        <Badge variant={item.role === 'admin' ? 'default' : item.role === 'demo' ? 'outline' : 'secondary'}>
          {item.role === 'admin' ? 'Admin (IT)' : item.role === 'demo' ? 'Demo (View Only)' : 'User'}
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
            disabled={approveMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRejectUser(item.userId)}
            disabled={rejectMutation.isPending}
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
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <PageHeader title="Pengaturan User" description="Kelola pengguna dan role sistem" />
        <Button onClick={() => setIsCreateUserOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Buat User Baru
        </Button>
      </div>
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
            <Button onClick={handleAdd} disabled={addRoleMutation.isPending}>
              {addRoleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
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
              <Select value={editFormData.role} onValueChange={(v: 'admin' | 'user' | 'demo') => setEditFormData({...editFormData, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin (IT)</SelectItem>
                  <SelectItem value="demo">Demo (View Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User</Label>
              <div className="p-2 bg-muted rounded-md">
                <div className="font-medium">{selectedItem?.nama || '-'}</div>
                <div className="text-xs text-muted-foreground font-mono">{selectedItem?.userId}</div>
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
              {isResetting ? 'Mereset...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Role User?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus role untuk {selectedItem?.nama || selectedItem?.userId}? User tidak akan bisa mengakses sistem.
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

      {/* Create User Dialog */}
      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buat User Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input 
                type="email"
                value={createUserForm.email} 
                onChange={(e) => setCreateUserForm({...createUserForm, email: e.target.value})} 
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
              <Input 
                value={createUserForm.nama} 
                onChange={(e) => setCreateUserForm({...createUserForm, nama: e.target.value})} 
                placeholder="Nama lengkap user"
              />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input 
                type="password"
                value={createUserForm.password} 
                onChange={(e) => setCreateUserForm({...createUserForm, password: e.target.value})} 
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={createUserForm.role} onValueChange={(v: 'admin' | 'user' | 'demo') => setCreateUserForm({...createUserForm, role: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin (IT)</SelectItem>
                  <SelectItem value="demo">Demo (View Only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Batal</Button>
            <Button onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser ? 'Membuat...' : 'Buat User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default UsersPage;
