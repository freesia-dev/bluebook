import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type JenisAktivitas = 'call' | 'wa' | 'kunjungan' | 'surat_peringatan' | 'lainnya';
export type StatusKomitmen = 'belum_ada' | 'janji_bayar' | 'sudah_bayar' | 'ingkar_janji' | 'negosiasi';

export interface CallMemo {
  id: string;
  nomor: number;
  tanggal: string;
  jam: string;
  l0lnno: string | null;
  nama_debitur: string;
  no_hp: string | null;
  no_rek: string | null;
  produk: string | null;
  tunggakan_pokok: number;
  tunggakan_bunga: number;
  total_tunggakan: number;
  jenis_aktivitas: JenisAktivitas;
  hasil: string | null;
  janji_bayar_tanggal: string | null;
  janji_bayar_nominal: number | null;
  status_komitmen: StatusKomitmen;
  petugas_penagih: string;
  saksi: string | null;
  lampiran_urls: string[];
  catatan_tambahan: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type CallMemoInput = Omit<CallMemo, 'id' | 'nomor' | 'created_at' | 'updated_at' | 'created_by'>;

const TABLE = 'call_memo_penagihan' as const;

export const useCallMemoList = () => {
  return useQuery({
    queryKey: ['call-memo'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select('*')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CallMemo[];
    },
    staleTime: 1000 * 60 * 2,
  });
};

export const useCallMemo = (id?: string) => {
  return useQuery({
    queryKey: ['call-memo', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any).from(TABLE).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data as CallMemo | null;
    },
    enabled: !!id,
  });
};

export const useCreateCallMemo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CallMemoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;

      // Get next nomor
      const { data: maxRow } = await (supabase as any)
        .from(TABLE)
        .select('nomor')
        .order('nomor', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextNomor = (maxRow?.nomor ?? 0) + 1;

      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({ ...input, nomor: nextNomor, created_by: userId })
        .select()
        .single();
      if (error) throw error;
      return data as CallMemo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-memo'] }),
  });
};

export const useUpdateCallMemo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CallMemoInput> }) => {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as CallMemo;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-memo'] }),
  });
};

export const useDeleteCallMemo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['call-memo'] }),
  });
};

export const uploadCallMemoLampiran = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop();
  const path = `call-memo/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const { error } = await supabase.storage.from('documents').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return data.publicUrl;
};

export const JENIS_AKTIVITAS_LABEL: Record<JenisAktivitas, string> = {
  call: 'Telepon',
  wa: 'WhatsApp',
  kunjungan: 'Kunjungan Langsung',
  surat_peringatan: 'Surat Peringatan',
  lainnya: 'Lainnya',
};

export const STATUS_KOMITMEN_LABEL: Record<StatusKomitmen, string> = {
  belum_ada: 'Belum Ada Komitmen',
  janji_bayar: 'Janji Bayar',
  sudah_bayar: 'Sudah Bayar',
  ingkar_janji: 'Ingkar Janji',
  negosiasi: 'Negosiasi',
};

export const STATUS_KOMITMEN_COLOR: Record<StatusKomitmen, string> = {
  belum_ada: 'bg-slate-500',
  janji_bayar: 'bg-sky-600',
  sudah_bayar: 'bg-emerald-600',
  ingkar_janji: 'bg-rose-600',
  negosiasi: 'bg-amber-600',
};
