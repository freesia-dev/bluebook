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

  const query = useQuery({
    queryKey: ['sppk', type],
    queryFn: async () => {
      const allData = await getSPPK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sppk'] });

  const addMutation = useMutation({
    mutationFn: addSPPK,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SPPK> }) => updateSPPK(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSPPK,
    onSuccess: invalidate,
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

  const query = useQuery({
    queryKey: ['pk', type],
    queryFn: async () => {
      const allData = await getPK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pk'] });

  const addMutation = useMutation({
    mutationFn: addPK,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PK> }) => updatePK(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePK,
    onSuccess: invalidate,
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

  const query = useQuery({
    queryKey: ['kkmpak', type],
    queryFn: async () => {
      const allData = await getKKMPAK();
      return allData.filter(s => s.type === type);
    },
    staleTime: STALE_TIME,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kkmpak'] });

  const addMutation = useMutation({
    mutationFn: addKKMPAK,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KKMPAK> }) => updateKKMPAK(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKKMPAK,
    onSuccess: invalidate,
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

  const loanQuery = useQuery({
    queryKey: ['nomor-loan'],
    queryFn: getNomorLoan,
    staleTime: STALE_TIME,
  });

  const pkQuery = useQuery({
    queryKey: ['pk-for-loan'],
    queryFn: getPK,
    staleTime: STALE_TIME,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nomor-loan'] });

  const addMutation = useMutation({
    mutationFn: addNomorLoan,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NomorLoan> }) => updateNomorLoan(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNomorLoan,
    onSuccess: invalidate,
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
