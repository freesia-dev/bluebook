import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRoles, addUserRole, updateUserRole, deleteUserRole } from '@/lib/supabase-store';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

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

// Fetch all user data (roles + profiles + pending users)
const fetchUsersData = async () => {
  const roles = await getUserRoles();
  
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*');
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserEmail = sessionData?.session?.user?.email;
  const currentUserId = sessionData?.session?.user?.id;
  
  const rolesWithProfile: UserRoleDisplay[] = roles.map(r => {
    const profile = profiles?.find(p => p.user_id === r.userId);
    return {
      ...r,
      nama: profile?.nama || '',
      email: r.userId === currentUserId ? currentUserEmail : undefined
    };
  });

  const pendingProfiles = profiles?.filter(p => p.status === 'pending') || [];
  const pendingUsers: PendingUser[] = pendingProfiles.map(p => ({
    id: p.id,
    userId: p.user_id,
    nama: p.nama || 'Belum diisi',
    status: p.status as 'pending' | 'approved' | 'rejected',
    createdAt: new Date(p.created_at)
  }));

  return { rolesWithProfile, pendingUsers };
};

export const useUsersData = () => {
  return useQuery({
    queryKey: ['users-data'],
    queryFn: fetchUsersData,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useAddUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'user' | 'demo' }) => 
      addUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-data'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'admin' | 'user' | 'demo' }) => 
      updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-data'] });
    },
  });
};

export const useDeleteUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUserRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-data'] });
    },
  });
};

export const useApproveUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'approved' })
        .eq('user_id', userId);
      if (error) throw error;
      await addUserRole(userId, 'user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-data'] });
    },
  });
};

export const useRejectUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'rejected' })
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-data'] });
    },
  });
};

export type { UserRoleDisplay, PendingUser };
