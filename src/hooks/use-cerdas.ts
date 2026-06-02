import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CerdasConfig } from '@/lib/cerdas-calc';

export const useCerdasConfig = () =>
  useQuery({
    queryKey: ['cerdas-config'],
    queryFn: async (): Promise<CerdasConfig | null> => {
      const { data, error } = await (supabase as any)
        .from('cerdas_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return (data as CerdasConfig) ?? null;
    },
    staleTime: 1000 * 60 * 10,
  });

export const useUpdateCerdasConfig = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<CerdasConfig>) => {
      const { error } = await (supabase as any)
        .from('cerdas_config')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cerdas-config'] }),
  });
};
