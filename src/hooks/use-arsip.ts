import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const BRCD_TELIHAN = '143';

/** Satu rekening kredit yang pernah terlihat di MLF cabang ini. */
export interface RekeningMaster {
  no_rekening: string;
  nama_debitur: string;
  nomor_pk: string | null;
  tanggal_akad: string | null;
  jatuh_tempo: string | null;
  plafon: number | null;
  baki: number | null;
  kol: number | null;
  jenis_kredit: string | null;
  produk: string | null;
  status: 'aktif' | 'lunas';
  terakhir_lihat: string | null;
}

/** Satu map fisik di dalam laci. */
export interface BerkasArsip {
  id: string;
  brcd: string;
  kode_laci: string;
  nomor_urut: number;
  jenis_laci: 'produktif' | 'konsumtif' | 'jaminan';
  nama_debitur: string;
  nomor_pk: string | null;
  no_rekening: string | null;
  tanggal_akad: string | null;
  jatuh_tempo: string | null;
  plafon: number | null;
  jenis_kredit: string | null;
  status_kredit: 'aktif' | 'lunas' | 'tidak_dikenali';
  sumber: 'mlf' | 'manual';
  catatan: string | null;
  created_at: string;
}

/**
 * Daftar induk seluruh rekening yang pernah ada di MLF, beserta statusnya.
 * Diunduh sekali lalu dicari di sisi HP — mengetik nama tidak menunggu jaringan.
 */
export const useArsipMaster = (brcd: string = BRCD_TELIHAN) =>
  useQuery({
    queryKey: ['arsip-master', brcd],
    queryFn: async (): Promise<RekeningMaster[]> => {
      const { data, error } = await (supabase as any).rpc('arsip_master', { p_brcd: brcd });
      if (error) throw error;
      return (data || []) as RekeningMaster[];
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

/** Semua map yang sudah tercatat — dipakai untuk menandai yang sudah masuk laci. */
export const useBerkasArsip = (brcd: string = BRCD_TELIHAN) =>
  useQuery({
    queryKey: ['arsip-berkas', brcd],
    queryFn: async (): Promise<BerkasArsip[]> => {
      const { data, error } = await (supabase as any)
        .from('arsip_berkas')
        .select('*')
        .eq('brcd', brcd)
        .order('kode_laci')
        .order('nomor_urut');
      if (error) throw error;
      return (data || []) as BerkasArsip[];
    },
    staleTime: 30 * 1000,
  });

export type BerkasBaru = Omit<BerkasArsip, 'id' | 'created_at'> & { dicatat_oleh?: string | null };

export const useSimpanBerkas = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (baris: BerkasBaru) => {
      const { data, error } = await (supabase as any)
        .from('arsip_berkas')
        .insert({ ...baris, dicatat_oleh: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as BerkasArsip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arsip-berkas'] });
    },
  });
};

export const useHapusBerkas = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('arsip_berkas').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arsip-berkas'] });
    },
  });
};

/* -------------------------------------------------------------- pencocokan */

/** Nama dibanding tanpa gelar, tanda baca, dan spasi ganda. */
export const samakanNama = (s: string | null | undefined): string =>
  (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\b(H|HJ|HAJI|IR|DRS|DRA|S\s?E|S\s?T|S\s?H|M\s?M|SPD|A\s?MD)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Kredit yang lebih baru atas nama yang sama — tanda berkas ini sudah di-top up.
 * Dipakai supaya map lama otomatis tertaut ke akad penggantinya.
 */
export const cariTopUp = (
  rek: RekeningMaster,
  semua: RekeningMaster[],
): RekeningMaster | null => {
  const nama = samakanNama(rek.nama_debitur);
  if (!nama) return null;
  const kandidat = semua.filter(
    (r) =>
      r.no_rekening !== rek.no_rekening &&
      r.status === 'aktif' &&
      samakanNama(r.nama_debitur) === nama &&
      (r.tanggal_akad || '') > (rek.tanggal_akad || ''),
  );
  if (kandidat.length === 0) return null;
  return kandidat.sort((a, b) => (b.tanggal_akad || '').localeCompare(a.tanggal_akad || ''))[0];
};

/** Cari di daftar induk: cocok pada nama, nomor PK, atau nomor rekening. */
export const cariRekening = (
  semua: RekeningMaster[],
  kata: string,
  batas = 30,
): RekeningMaster[] => {
  const q = kata.trim().toUpperCase();
  if (q.length < 2) return [];
  const qNama = samakanNama(q);
  const nilai = (r: RekeningMaster): number => {
    const nama = samakanNama(r.nama_debitur);
    const pk = (r.nomor_pk || '').toUpperCase();
    const rek = (r.no_rekening || '').toUpperCase();
    if (nama === qNama) return 0;
    if (pk.startsWith(q) || rek.startsWith(q)) return 1;
    if (nama.startsWith(qNama)) return 2;
    if (nama.includes(qNama)) return 3;
    if (pk.includes(q) || rek.includes(q)) return 4;
    return 99;
  };
  return semua
    .map((r) => ({ r, n: nilai(r) }))
    .filter((x) => x.n < 99)
    .sort((a, b) => a.n - b.n || (b.r.tanggal_akad || '').localeCompare(a.r.tanggal_akad || ''))
    .slice(0, batas)
    .map((x) => x.r);
};
