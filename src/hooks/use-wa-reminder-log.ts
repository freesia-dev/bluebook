import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WAReminderLog {
  id: string;
  l0lnno: string;
  nama: string | null;
  no_hp: string;
  pesan: string;
  template_id: string | null;
  metode: 'wame' | 'twilio';
  status: string;
  kol: number | null;
  tunggakan: number | null;
  upload_id: string | null;
  kategori?: string | null;
  sent_by: string | null;
  sent_at: string;
}

export const useWAReminderLog = (limit = 500) => {
  return useQuery({
    queryKey: ['wa-reminder-log', limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('wa_reminder_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as WAReminderLog[];
    },
    staleTime: 1000 * 30,
  });
};

export const useInsertReminderLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<WAReminderLog, 'id' | 'sent_at' | 'sent_by'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from('wa_reminder_log')
        .insert({ ...payload, sent_by: userData.user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as WAReminderLog;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-reminder-log'] }),
  });
};
