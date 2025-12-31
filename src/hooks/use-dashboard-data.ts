import { useQuery } from '@tanstack/react-query';
import { 
  getSuratMasuk, 
  getSuratKeluar, 
  getSPPK, 
  getPK, 
  getKKMPAK 
} from '@/lib/supabase-store';

// Dashboard stats query with optimized caching
export const useDashboardData = () => {
  const suratMasukQuery = useQuery({
    queryKey: ['surat-masuk'],
    queryFn: getSuratMasuk,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const suratKeluarQuery = useQuery({
    queryKey: ['surat-keluar'],
    queryFn: getSuratKeluar,
    staleTime: 1000 * 60 * 5,
  });

  const sppkQuery = useQuery({
    queryKey: ['sppk'],
    queryFn: getSPPK,
    staleTime: 1000 * 60 * 5,
  });

  const pkQuery = useQuery({
    queryKey: ['pk'],
    queryFn: getPK,
    staleTime: 1000 * 60 * 5,
  });

  const kkmpakQuery = useQuery({
    queryKey: ['kkmpak'],
    queryFn: getKKMPAK,
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = 
    suratMasukQuery.isLoading || 
    suratKeluarQuery.isLoading || 
    sppkQuery.isLoading || 
    pkQuery.isLoading || 
    kkmpakQuery.isLoading;

  const refetchAll = () => {
    suratMasukQuery.refetch();
    suratKeluarQuery.refetch();
    sppkQuery.refetch();
    pkQuery.refetch();
    kkmpakQuery.refetch();
  };

  return {
    suratMasuk: suratMasukQuery.data || [],
    suratKeluar: suratKeluarQuery.data || [],
    sppk: sppkQuery.data || [],
    pk: pkQuery.data || [],
    kkmpak: kkmpakQuery.data || [],
    isLoading,
    refetchAll,
  };
};
