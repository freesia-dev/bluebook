import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DebiturKontak {
  id: string;
  l0lnno: string;
  nama: string | null;
  no_hp: string | null;
  catatan: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useDebiturKontak = () => {
  return useQuery({
    queryKey: ['debitur-kontak'],
    queryFn: async () => {
      const all: DebiturKontak[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from('debitur_kontak')
          .select('*')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const chunk = (data || []) as DebiturKontak[];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useUpsertDebiturKontak = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { l0lnno: string; nama?: string | null; no_hp?: string | null; catatan?: string | null }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      const { data, error } = await (supabase as any)
        .from('debitur_kontak')
        .upsert(
          { ...payload, updated_by: userId, updated_at: new Date().toISOString() },
          { onConflict: 'l0lnno' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as DebiturKontak;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debitur-kontak'] });
    },
  });
};
