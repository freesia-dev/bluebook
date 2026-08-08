import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProyeksiRow {
  id: string;
  unit: string;
  nama_debitur: string;
  jenis_kredit: string;
  plafon: number;
  jangka_waktu_bulan: number;
  keterangan: string | null;
  created_at: string;
}

export type ProyeksiInput = Omit<ProyeksiRow, 'id' | 'created_at'>;

const KEY = ['proyeksi-kredit'];

export const useProyeksi = () =>
  useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ProyeksiRow[]> => {
      const { data, error } = await (supabase as any)
        .from('proyeksi_kredit')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ProyeksiRow[];
    },
    staleTime: 1000 * 60,
  });

export const useProyeksiMutations = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const create = useMutation({
    mutationFn: async (input: ProyeksiInput) => {
      const { error } = await (supabase as any).from('proyeksi_kredit').insert(input);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Data proyeksi ditambahkan' }); },
    onError: (e: any) => toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: ProyeksiInput & { id: string }) => {
      const { error } = await (supabase as any)
        .from('proyeksi_kredit')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Data proyeksi diperbarui' }); },
    onError: (e: any) => toast({ title: 'Gagal memperbarui', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('proyeksi_kredit').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Data proyeksi dihapus' }); },
    onError: (e: any) => toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' }),
  });

  return { create, update, remove };
};
