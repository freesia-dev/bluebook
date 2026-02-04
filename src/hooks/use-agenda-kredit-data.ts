import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getSPPK, addSPPK, updateSPPK, deleteSPPK,
  getPK, addPK, updatePK, deletePK,
  getKKMPAK, addKKMPAK, updateKKMPAK, deleteKKMPAK,
  getNomorLoan, addNomorLoan, updateNomorLoan, deleteNomorLoan,
  getJenisKredit, getJenisDebitur, getJenisPenggunaan, getSektorEkonomi
} from '@/lib/supabase-store';
import { SPPK, PK, KKMPAK, NomorLoan } from '@/types';

const STALE_TIME = 1000 * 60 * 5; // 5 minutes cache

// ============= SPPK HOOK =============
export const useSPPKData = (type: 'telihan' | 'meranti') => {
  const queryClient = useQueryClient();
  const queryKey = ['sppk', type];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const allData = await getSPPK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addSPPK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sppk'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SPPK> }) => updateSPPK(id, data),
    // Optimistic update for instant UI
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<SPPK[]>(queryKey);
      
      queryClient.setQueryData<SPPK[]>(queryKey, (old) => 
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
      queryClient.invalidateQueries({ queryKey: ['sppk'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSPPK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sppk'] }),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
};

// ============= PK HOOK =============
export const usePKData = (type: 'telihan' | 'meranti') => {
  const queryClient = useQueryClient();
  const queryKey = ['pk', type];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const allData = await getPK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addPK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pk'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PK> }) => updatePK(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<PK[]>(queryKey);
      
      queryClient.setQueryData<PK[]>(queryKey, (old) => 
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
      queryClient.invalidateQueries({ queryKey: ['pk'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pk'] }),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
};

// ============= KKMPAK HOOK =============
export const useKKMPAKData = (type: 'telihan' | 'meranti') => {
  const queryClient = useQueryClient();
  const queryKey = ['kkmpak', type];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const allData = await getKKMPAK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addKKMPAK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kkmpak'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KKMPAK> }) => updateKKMPAK(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<KKMPAK[]>(queryKey);
      
      queryClient.setQueryData<KKMPAK[]>(queryKey, (old) => 
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
      queryClient.invalidateQueries({ queryKey: ['kkmpak'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKKMPAK,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kkmpak'] }),
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
};

// ============= NOMOR LOAN HOOK =============
export const useNomorLoanData = () => {
  const queryClient = useQueryClient();
  const queryKey = ['nomor-loan'];

  const loanQuery = useQuery({
    queryKey,
    queryFn: getNomorLoan,
    staleTime: STALE_TIME,
  });

  const pkQuery = useQuery({
    queryKey: ['pk-for-loan'],
    queryFn: getPK,
    staleTime: STALE_TIME,
  });

  const addMutation = useMutation({
    mutationFn: addNomorLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NomorLoan> }) => updateNomorLoan(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<NomorLoan[]>(queryKey);
      
      queryClient.setQueryData<NomorLoan[]>(queryKey, (old) => 
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
    mutationFn: deleteNomorLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    data: loanQuery.data || [],
    pkData: pkQuery.data || [],
    isLoading: loanQuery.isLoading || pkQuery.isLoading,
    refetch: () => {
      loanQuery.refetch();
      pkQuery.refetch();
    },
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
};

// ============= OPTIONS HOOK (shared across forms) =============
export const useKreditOptions = () => {
  const jenisKreditQuery = useQuery({
    queryKey: ['jenis-kredit'],
    queryFn: getJenisKredit,
    staleTime: STALE_TIME * 2, // 10 minutes for reference data
  });

  const jenisDebiturQuery = useQuery({
    queryKey: ['jenis-debitur'],
    queryFn: getJenisDebitur,
    staleTime: STALE_TIME * 2,
  });

  const jenisPenggunaanQuery = useQuery({
    queryKey: ['jenis-penggunaan'],
    queryFn: getJenisPenggunaan,
    staleTime: STALE_TIME * 2,
  });

  const sektorEkonomiQuery = useQuery({
    queryKey: ['sektor-ekonomi'],
    queryFn: getSektorEkonomi,
    staleTime: STALE_TIME * 2,
  });

  return {
    jenisKredit: jenisKreditQuery.data || [],
    jenisDebitur: jenisDebiturQuery.data || [],
    jenisPenggunaan: jenisPenggunaanQuery.data || [],
    kodeFasilitas: jenisPenggunaanQuery.data || [], // Alias for KKMPAK page
    sektorEkonomi: sektorEkonomiQuery.data || [],
    isLoading: jenisKreditQuery.isLoading || jenisDebiturQuery.isLoading || jenisPenggunaanQuery.isLoading || sektorEkonomiQuery.isLoading,
  };
};
