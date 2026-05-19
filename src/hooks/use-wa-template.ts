import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WATemplate {
  id: string;
  nama_template: string;
  isi: string;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useWATemplates = () => {
  return useQuery({
    queryKey: ['wa-template'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('wa_template')
        .select('*')
        .order('is_default', { ascending: false })
        .order('nama_template');
      if (error) throw error;
      return (data || []) as WATemplate[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useSaveWATemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<WATemplate> & { nama_template: string; isi: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      if (payload.is_default) {
        // unset previous defaults
        await (supabase as any).from('wa_template').update({ is_default: false }).neq('id', payload.id || '00000000-0000-0000-0000-000000000000');
      }

      if (payload.id) {
        const { data, error } = await (supabase as any)
          .from('wa_template')
          .update({
            nama_template: payload.nama_template,
            isi: payload.isi,
            is_default: !!payload.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data as WATemplate;
      }
      const { data, error } = await (supabase as any)
        .from('wa_template')
        .insert({
          nama_template: payload.nama_template,
          isi: payload.isi,
          is_default: !!payload.is_default,
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WATemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-template'] }),
  });
};

export const useDeleteWATemplate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('wa_template').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-template'] }),
  });
};
