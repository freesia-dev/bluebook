import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPenyelesaianSelisih, 
  addPenyelesaianSelisih, 
  updatePenyelesaianSelisih, 
  deletePenyelesaianSelisih,
  getSelisihByPenyelesaianId,
  getUnresolvedSelisih,
  getAllSelisihWithPengisian,
  getSelisihByPengisianId,
  addSelisihDetail,
  updateSelisihDetail,
  deleteSelisihDetail,
  resolveSelisihItem,
  unresolveSelisihItem,
  getPengisianWithSelisih,
} from '@/lib/penyelesaian-store';
import { PenyelesaianSelisih } from '@/types';

const SELISIH_KEYS = ['selisih-atm', 'unresolved-selisih', 'all-selisih', 'pengisian-with-selisih'] as const;

const invalidateSelisih = (queryClient: ReturnType<typeof useQueryClient>) => {
  SELISIH_KEYS.forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  queryClient.invalidateQueries({ queryKey: ['selisih-by-pengisian'] });
  queryClient.invalidateQueries({ queryKey: ['penyelesaian-selisih'] });
};

export const usePenyelesaianSelisih = () => {
  return useQuery({
    queryKey: ['penyelesaian-selisih'],
    queryFn: getPenyelesaianSelisih,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddPenyelesaianSelisih = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, selisihIds }: { 
      data: Omit<PenyelesaianSelisih, 'id' | 'nomor' | 'createdAt'>; 
      selisihIds: string[] 
    }) => addPenyelesaianSelisih(data, selisihIds),
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useUpdatePenyelesaianSelisih = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, selisihIds }: { 
      id: string; 
      data: Partial<PenyelesaianSelisih>; 
      selisihIds?: string[] 
    }) => updatePenyelesaianSelisih(id, data, selisihIds),
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useDeletePenyelesaianSelisih = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePenyelesaianSelisih(id),
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useSelisihByPenyelesaian = (penyelesaianId?: string) => {
  return useQuery({
    queryKey: ['selisih-penyelesaian', penyelesaianId],
    queryFn: () => getSelisihByPenyelesaianId(penyelesaianId!),
    enabled: !!penyelesaianId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUnresolvedSelisih = () => {
  return useQuery({
    queryKey: ['unresolved-selisih'],
    queryFn: getUnresolvedSelisih,
    staleTime: 1000 * 60 * 5,
  });
};

// ============= NEW HOOKS =============

export const useAllSelisih = () => {
  return useQuery({
    queryKey: ['all-selisih'],
    queryFn: getAllSelisihWithPengisian,
    staleTime: 1000 * 60 * 5,
  });
};

export const useSelisihByPengisian = (pengisianAtmId?: string) => {
  return useQuery({
    queryKey: ['selisih-by-pengisian', pengisianAtmId],
    queryFn: () => getSelisihByPengisianId(pengisianAtmId!),
    enabled: !!pengisianAtmId,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePengisianWithSelisih = () => {
  return useQuery({
    queryKey: ['pengisian-with-selisih'],
    queryFn: getPengisianWithSelisih,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddSelisihDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: addSelisihDetail,
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useUpdateSelisihDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateSelisihDetail>[1] }) => 
      updateSelisihDetail(id, updates),
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useDeleteSelisihDetail = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSelisihDetail,
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useResolveSelisihItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: resolveSelisihItem,
    onSuccess: () => invalidateSelisih(queryClient),
  });
};

export const useUnresolveSelisihItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unresolveSelisihItem,
    onSuccess: () => invalidateSelisih(queryClient),
  });
};
