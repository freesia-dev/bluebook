import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SIMULASI_THEME, SIMULASI_THEME_KEY, SimulasiTheme, mergeTheme } from '@/lib/simulasi-theme';

/** Tema global (default bank) — dibaca semua user, disimpan oleh admin. */
export function useGlobalSimulasiTheme() {
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

/** Preferensi pribadi user (bila ada) — mengalahkan tema global. */
export function useMySimulasiTheme() {
  const q = useQuery({
    queryKey: ['simulasi-theme-me'],
    queryFn: async (): Promise<SimulasiTheme | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from('user_setting')
        .select('value')
        .eq('user_id', uid)
        .eq('key', SIMULASI_THEME_KEY)
        .maybeSingle();
      if (error || !data?.value) return null;
      return mergeTheme(data.value);
    },
    staleTime: 5 * 60 * 1000,
  });
  return { theme: q.data ?? null, isLoading: q.isLoading };
}

/** Tema efektif: preferensi pribadi bila ada, jika tidak pakai tema global. */
export function useSimulasiTheme() {
  const global = useGlobalSimulasiTheme();
  const mine = useMySimulasiTheme();
  return {
    theme: mine.theme ?? global.theme,
    isLoading: global.isLoading || mine.isLoading,
    isPersonal: !!mine.theme,
  };
}

/** Simpan tema global (admin). */
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

/** Simpan tema pribadi user yang sedang login. */
export function useSaveMySimulasiTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (theme: SimulasiTheme) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Sesi tidak ditemukan.');
      const { error } = await supabase
        .from('user_setting')
        .upsert(
          { user_id: uid, key: SIMULASI_THEME_KEY, value: theme as any, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' },
        );
      if (error) throw error;
      return theme;
    },
    onSuccess: (theme) => {
      qc.setQueryData(['simulasi-theme-me'], theme);
      qc.invalidateQueries({ queryKey: ['simulasi-theme-me'] });
    },
  });
}

/** Hapus tema pribadi → kembali mengikuti tema global. */
export function useResetMySimulasiTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Sesi tidak ditemukan.');
      const { error } = await supabase
        .from('user_setting')
        .delete()
        .eq('user_id', uid)
        .eq('key', SIMULASI_THEME_KEY);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.setQueryData(['simulasi-theme-me'], null);
      qc.invalidateQueries({ queryKey: ['simulasi-theme-me'] });
    },
  });
}
