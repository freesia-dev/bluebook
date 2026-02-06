import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { 
  getSuratMasuk, 
  getSuratKeluar, 
  getSPPK, 
  getPK, 
  getKKMPAK,
  getAgendaKreditEntry,
  getJenisKredit,
  getJenisDebitur,
  getJenisPenggunaan,
  getSektorEkonomi
} from '@/lib/supabase-store';

const STALE_TIME = 1000 * 60 * 5;
const REF_STALE_TIME = 1000 * 60 * 10;

/**
 * Prefetch common data after authentication to speed up navigation
 * This runs in the background and populates the React Query cache
 */
export const usePrefetchData = (isAuthenticated: boolean) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Prefetch main data tables in background
    const prefetchMainData = async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['surat-masuk'],
          queryFn: getSuratMasuk,
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['surat-keluar'],
          queryFn: getSuratKeluar,
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['sppk'],
          queryFn: getSPPK,
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['pk'],
          queryFn: getPK,
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['kkmpak'],
          queryFn: getKKMPAK,
          staleTime: STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['agenda-kredit-entry'],
          queryFn: getAgendaKreditEntry,
          staleTime: STALE_TIME,
        }),
      ]);
    };

    // Prefetch reference data (rarely changes)
    const prefetchRefData = async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['jenis-kredit'],
          queryFn: getJenisKredit,
          staleTime: REF_STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['jenis-debitur'],
          queryFn: getJenisDebitur,
          staleTime: REF_STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['jenis-penggunaan'],
          queryFn: getJenisPenggunaan,
          staleTime: REF_STALE_TIME,
        }),
        queryClient.prefetchQuery({
          queryKey: ['sektor-ekonomi'],
          queryFn: getSektorEkonomi,
          staleTime: REF_STALE_TIME,
        }),
      ]);
    };

    // Run prefetches with slight delay to not block initial render
    const timer = setTimeout(() => {
      prefetchMainData();
      prefetchRefData();
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, queryClient]);
};
