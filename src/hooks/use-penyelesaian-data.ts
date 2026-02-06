import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPenyelesaianSelisih, 
  addPenyelesaianSelisih, 
  updatePenyelesaianSelisih, 
  deletePenyelesaianSelisih,
  getSelisihByPenyelesaianId,
  getUnresolvedSelisih
} from '@/lib/penyelesaian-store';
import { PenyelesaianSelisih } from '@/types';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penyelesaian-selisih'] });
      queryClient.invalidateQueries({ queryKey: ['selisih-atm'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-selisih'] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penyelesaian-selisih'] });
      queryClient.invalidateQueries({ queryKey: ['selisih-atm'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-selisih'] });
    },
  });
};

export const useDeletePenyelesaianSelisih = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePenyelesaianSelisih(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penyelesaian-selisih'] });
      queryClient.invalidateQueries({ queryKey: ['selisih-atm'] });
      queryClient.invalidateQueries({ queryKey: ['unresolved-selisih'] });
    },
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
