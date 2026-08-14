import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SIMULASI_THEME, SIMULASI_THEME_KEY, SimulasiTheme, mergeTheme } from '@/lib/simulasi-theme';

/** Tema kartu simulasi — dibaca semua user, disimpan oleh admin. */
export function useSimulasiTheme() {
  const q = useQuery({
    queryKey: ['simulasi-theme'],
    queryFn: async (): Promise<SimulasiTheme> => {
      const { data, error } = await supabase
        .from('app_setting')
        .select('value')
        .eq('key', SIMULASI_THEME_KEY)
        .maybeSingle();
      if (error) return DEFAULT_SIMULASI_THEME;
      return mergeTheme(data?.value);
    },
    staleTime: 5 * 60 * 1000,
  });
  return { theme: q.data ?? DEFAULT_SIMULASI_THEME, isLoading: q.isLoading };
}

export function useSaveSimulasiTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (theme: SimulasiTheme) => {
      const { error } = await supabase
        .from('app_setting')
        .upsert({ key: SIMULASI_THEME_KEY, value: theme as any, updated_at: new Date().toISOString() });
      if (error) throw error;
      return theme;
    },
    onSuccess: (theme) => {
      qc.setQueryData(['simulasi-theme'], theme);
      qc.invalidateQueries({ queryKey: ['simulasi-theme'] });
    },
  });
}
