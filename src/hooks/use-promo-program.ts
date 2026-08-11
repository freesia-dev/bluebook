import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CerdasConfig } from '@/lib/cerdas-calc';

/** Program promo kredit (generalisasi dari Program CERDAS — bisa banyak program). */
export interface PromoProgram extends CerdasConfig {
  id: string;
  kode: string;
  deskripsi: string | null;
  urutan: number;
  created_at?: string;
  updated_at?: string;
}

export const emptyPromoProgram = (): Partial<PromoProgram> => ({
  kode: 'custom',
  nama_program: '',
  deskripsi: '',
  aktif: true,
  periode_mulai: new Date().toISOString().slice(0, 10),
  periode_selesai: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
  bunga_debitur_baru: 0,
  bunga_take_over: 0,
  bunga_top_up: 0,
  diskon_provisi_top_up_pct: 0,
  plafon_tier_1_max: 100_000_000,
  plafon_tier_2_max: 250_000_000,
  plafon_tier_3_max: 500_000_000,
  cap_tier_1_baru: 0,
  cap_tier_2_baru: 0,
  cap_tier_3_baru: 0,
  cap_tier_4_baru: 0,
  cap_tier_1_takeover: 0,
  cap_tier_2_takeover: 0,
  cap_tier_3_takeover: 0,
  cap_tier_4_takeover: 0,
  urutan: 0,
});

export const usePromoPrograms = (activeOnly = false) =>
  useQuery({
    queryKey: ['promo-programs', activeOnly],
    queryFn: async () => {
      let q = (supabase as any)
        .from('loan_promo_program')
        .select('*')
        .order('urutan')
        .order('created_at', { ascending: true });
      if (activeOnly) q = q.eq('aktif', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as PromoProgram[];
    },
    staleTime: 1000 * 60 * 5,
  });

export const useUpsertPromoProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<PromoProgram> & { nama_program: string }) => {
      const { id, created_at, updated_at, ...rest } = p as any;
      if (id) {
        const { error } = await (supabase as any).from('loan_promo_program').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('loan_promo_program').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-programs'] }),
  });
};

export const useDeletePromoProgram = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('loan_promo_program').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-programs'] }),
  });
};
