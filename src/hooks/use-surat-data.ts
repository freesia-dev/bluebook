import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSuratMasuk, addSuratMasuk, updateSuratMasuk, deleteSuratMasuk,
  getSuratKeluar, addSuratKeluar, updateSuratKeluar, deleteSuratKeluar,
  updateSuratKeluarOjkStatus
} from '@/lib/supabase-store';
import { SuratMasuk, SuratKeluar, OjkStatus } from '@/types';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes cache

// ============= SURAT MASUK HOOK =============
export const useSuratMasukData = () => {
  const queryClient = useQueryClient();
  const queryKey = ['surat-masuk'];

  const query = useQuery({
    queryKey,
    queryFn: getSuratMasuk,
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addSuratMasuk,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SuratMasuk> }) => updateSuratMasuk(id, data),
    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<SuratMasuk[]>(queryKey);
      
      queryClient.setQueryData<SuratMasuk[]>(queryKey, (old) => 
        old?.map(item => item.id === id ? { ...item, ...data } : item) || []
      );
      
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSuratMasuk,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
};

// ============= SURAT KELUAR HOOK =============
export const useSuratKeluarData = () => {
  const queryClient = useQueryClient();
  const queryKey = ['surat-keluar'];

  const query = useQuery({
    queryKey,
    queryFn: getSuratKeluar,
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addSuratKeluar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SuratKeluar> }) => updateSuratKeluar(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<SuratKeluar[]>(queryKey);
      
      queryClient.setQueryData<SuratKeluar[]>(queryKey, (old) => 
        old?.map(item => item.id === id ? { ...item, ...data } : item) || []
      );
      
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSuratKeluar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const ojkStatusMutation = useMutation({
    mutationFn: ({ id, status, userNama }: { id: string; status: OjkStatus; userNama: string }) =>
      updateSuratKeluarOjkStatus(id, status, userNama),
    onMutate: async ({ id, status, userNama }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<SuratKeluar[]>(queryKey);
      queryClient.setQueryData<SuratKeluar[]>(queryKey, (old) =>
        old?.map(item => item.id === id ? {
          ...item,
          ojkStatus: status,
          ojkStatusUpdatedAt: new Date(),
          ojkStatusUpdatedByNama: userNama,
        } : item) || []
      );
      queryClient.invalidateQueries({ queryKey: ['ojk-stats'] });
      return { previousData };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previousData) queryClient.setQueryData(queryKey, ctx.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['ojk-stats'] });
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    updateOjkStatus: ojkStatusMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
};
