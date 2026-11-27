import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { KONFIG_BAWAAN, SAPAAN_KEY, gabungKonfig, type KonfigSapaan } from '@/lib/sapaan-konfig';

/** Pengaturan layar sapaan (dibaca semua user, disimpan admin). */
export function useKonfigSapaan() {
  const q = useQuery({
    queryKey: ['sapaan-konfig'],
    queryFn: async (): Promise<KonfigSapaan> => {
      const { data, error } = await supabase.from('app_setting').select('value').eq('key', SAPAAN_KEY).maybeSingle();
      if (error) return KONFIG_BAWAAN;
      return gabungKonfig(data?.value);
    },
    staleTime: 5 * 60 * 1000,
  });
  return { konfig: q.data ?? KONFIG_BAWAAN, siap: !q.isLoading, refetch: q.refetch };
}

export function useSimpanKonfigSapaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (k: KonfigSapaan) => {
      const { error } = await supabase
        .from('app_setting')
        .upsert({ key: SAPAAN_KEY, value: k as never, updated_at: new Date().toISOString() });
      if (error) throw error;
      return k;
    },
    onSuccess: (k) => qc.setQueryData(['sapaan-konfig'], k),
  });
}

export interface StatusSapaanUser {
  user_id: string;
  nama: string;
  status: string;
  last_greeting_slot: string | null;
  last_greeting_date: string | null;
}

/** Daftar akun beserta sapaan terakhir yang sudah mereka lihat (khusus admin). */
export function useStatusSapaan() {
  return useQuery({
    queryKey: ['sapaan-status-user'],
    queryFn: async (): Promise<StatusSapaanUser[]> => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('user_id, nama, status, last_greeting_slot, last_greeting_date')
        .order('nama');
      if (error) {
        // kolom last_greeting_slot belum ada
        const lama = await (supabase as any).from('profiles').select('user_id, nama, status, last_greeting_date').order('nama');
        if (lama.error) throw lama.error;
        return (lama.data || []).map((r: any) => ({ ...r, last_greeting_slot: null }));
      }
      return (data || []) as StatusSapaanUser[];
    },
    staleTime: 10 * 1000,
  });
}

/** Reset sapaan satu akun (atau semua bila userId null) supaya muncul lagi. */
export function useResetSapaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string | null) => {
      const { data, error } = await (supabase as any).rpc('reset_sapaan', { p_user_id: userId });
      if (error) throw error;
      return Number(data) || 0;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sapaan-status-user'] }),
  });
}
