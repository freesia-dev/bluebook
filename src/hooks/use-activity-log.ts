import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  description: string | null;
  createdAt: Date;
}

const TABLE_LABELS: Record<string, string> = {
  surat_masuk: 'Surat Masuk',
  surat_keluar: 'Surat Keluar',
  sppk: 'SPPK',
  pk: 'PK',
  kkmpak: 'KK & MPAK',
  nomor_loan: 'Nomor Loan',
  pengisian_atm: 'Pengisian ATM',
  agenda_kredit_entry: 'Agenda Kredit',
  activity_log: 'Activity Log',
  recycle_bin: 'Recycle Bin',
  penyelesaian_selisih: 'Penyelesaian Selisih',
  selisih_atm: 'Selisih ATM',
  kartu_tertelan: 'Kartu Tertelan',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Menambahkan',
  update: 'Mengubah',
  delete: 'Menghapus',
};

export const getTableLabel = (tableName: string) => TABLE_LABELS[tableName] || tableName;
export const getActionLabel = (action: string) => ACTION_LABELS[action] || action;

export const useActivityLog = (limit = 100) => {
  return useQuery({
    queryKey: ['activity-log', limit],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map((entry: any) => ({
        id: entry.id,
        userId: entry.user_id,
        userName: entry.user_name,
        action: entry.action,
        tableName: entry.table_name,
        recordId: entry.record_id,
        oldData: entry.old_data,
        newData: entry.new_data,
        description: entry.description,
        createdAt: new Date(entry.created_at),
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};
