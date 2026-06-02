import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LoanPromo {
  id: string;
  nama: string;
  deskripsi: string | null;
  periode_mulai: string;
  periode_selesai: string;
  aktif: boolean;
  bunga_override: number | null;
  provisi_diskon_pct: number;
  gratis_asuransi: boolean;
  cap_subsidi: number;
  target_skema: 'semua' | 'anuitas' | 'efektif' | 'sliding';
  syarat: string | null;
  urutan: number;
  created_at: string;
  updated_at: string;
}

export const useLoanPromos = (activeOnly = false) =>
  useQuery({
    queryKey: ['loan-promos', activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from('loan_promo').select('*').order('urutan').order('created_at', { ascending: false });
      if (activeOnly) q = q.eq('aktif', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LoanPromo[];
    },
    staleTime: 1000 * 60 * 5,
  });

export const useUpsertLoanPromo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<LoanPromo> & { nama: string; periode_mulai: string; periode_selesai: string }) => {
      const { id, created_at, updated_at, ...rest } = p as any;
      if (id) {
        const { data, error } = await (supabase as any).from('loan_promo').update(rest).eq('id', id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any).from('loan_promo').insert(rest).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-promos'] }),
  });
};

export const useDeleteLoanPromo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('loan_promo').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-promos'] }),
  });
};
