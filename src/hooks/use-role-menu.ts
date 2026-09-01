import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ROLE_MENU_OVERRIDES_KEY, RoleMenuOverrides } from '@/lib/role-permissions';

/** Pengaturan menu per role (disimpan admin di app_setting, dibaca semua user). */
export function useRoleMenuOverrides() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['role-menu-overrides'],
    queryFn: async (): Promise<RoleMenuOverrides> => {
      const { data, error } = await supabase
        .from('app_setting')
        .select('value')
        .eq('key', ROLE_MENU_OVERRIDES_KEY)
        .maybeSingle();
      if (error || !data?.value) return {};
      return (data.value as RoleMenuOverrides) ?? {};
    },
    staleTime: 5 * 60 * 1000,
  });
  return { overrides: q.data ?? {}, isLoading: q.isLoading };
}

export function useSaveRoleMenuOverrides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (value: RoleMenuOverrides) => {
      const { error } = await supabase
        .from('app_setting')
        .upsert(
          { key: ROLE_MENU_OVERRIDES_KEY, value: value as never, updated_at: new Date().toISOString() },
          { onConflict: 'key' },
        );
      if (error) throw error;
      return value;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['role-menu-overrides'] });
    },
  });
}
