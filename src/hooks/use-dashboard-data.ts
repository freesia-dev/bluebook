import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SuratMasuk, SuratKeluar, SPPK, PK, KKMPAK } from '@/types';

const getTableCount = async (table: string): Promise<number> => {
  const { count } = await (supabase as any).from(table).select('*', { count: 'exact', head: true });
  return count || 0;
};

const getRecentSuratMasuk = async (): Promise<SuratMasuk[]> => {
  const { data, error } = await supabase
    .from('surat_masuk')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorAgenda: s.nomor_agenda,
    kodeSurat: s.kode_surat,
    nomorSuratMasuk: s.nomor_surat_masuk,
    namaPengirim: s.nama_pengirim,
    perihal: s.perihal,
    tujuanDisposisi: s.tujuan_disposisi,
    status: s.status as 'Belum Disposisi' | 'Sudah Disposisi',
    keterangan: s.keterangan || '',
    userInput: s.user_input,
    fileUrl: s.file_url || undefined,
    tanggalMasuk: new Date((s as any).tanggal_masuk || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

const getRecentSuratKeluar = async (): Promise<SuratKeluar[]> => {
  const { data, error } = await supabase
    .from('surat_keluar')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorAgenda: s.nomor_agenda,
    kodeSurat: s.kode_surat,
    namaPenerima: s.nama_penerima,
    perihal: s.perihal,
    tujuanSurat: s.tujuan_surat,
    status: s.status as 'Belum Dikirim' | 'Sudah Dikirim',
    keterangan: s.keterangan || '',
    userInput: s.user_input,
    fileUrl: s.file_url || undefined,
    tanggal: new Date((s as any).tanggal || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

const getRecentSPPK = async (): Promise<SPPK[]> => {
  const { data, error } = await supabase
    .from('sppk')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorSPPK: s.nomor_sppk,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    marketing: s.marketing,
    type: s.type as 'telihan' | 'meranti',
    tanggal: new Date((s as any).tanggal || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

const getRecentPK = async (): Promise<PK[]> => {
  const { data, error } = await supabase
    .from('pk')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorPK: s.nomor_pk,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    jenisDebitur: s.jenis_debitur,
    jenisPenggunaan: s.jenis_penggunaan,
    sektorEkonomi: s.sektor_ekonomi,
    type: s.type as 'telihan' | 'meranti',
    tanggal: new Date((s as any).tanggal || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

const getRecentKKMPAK = async (): Promise<KKMPAK[]> => {
  const { data, error } = await supabase
    .from('kkmpak')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) throw error;
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorKK: s.nomor_kk,
    nomorMPAK: s.nomor_mpak,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    jenisDebitur: s.jenis_debitur,
    kodeFasilitas: s.kode_fasilitas,
    sektorEkonomi: s.sektor_ekonomi,
    type: s.type as 'telihan' | 'meranti',
    tanggal: new Date((s as any).tanggal || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

// Dashboard stats query with optimized caching
export const useDashboardData = (userInputFilter?: string | null) => {
  const countsQuery = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const [suratMasuk, suratKeluar, sppk, pk, kkmpak] = await Promise.all([
        getTableCount('surat_masuk'),
        getTableCount('surat_keluar'),
        getTableCount('sppk'),
        getTableCount('pk'),
        getTableCount('kkmpak'),
      ]);
      return { suratMasuk, suratKeluar, sppk, pk, kkmpak };
    },
    staleTime: 1000 * 60 * 5,
  });

  const suratMasukQuery = useQuery({
    queryKey: ['surat-masuk-recent'],
    queryFn: getRecentSuratMasuk,
    staleTime: 1000 * 60 * 5,
  });

  const suratKeluarQuery = useQuery({
    queryKey: ['surat-keluar-recent'],
    queryFn: getRecentSuratKeluar,
    staleTime: 1000 * 60 * 5,
  });

  const sppkQuery = useQuery({
    queryKey: ['sppk-recent'],
    queryFn: getRecentSPPK,
    staleTime: 1000 * 60 * 5,
  });

  const pkQuery = useQuery({
    queryKey: ['pk-recent'],
    queryFn: getRecentPK,
    staleTime: 1000 * 60 * 5,
  });

  const kkmpakQuery = useQuery({
    queryKey: ['kkmpak-recent'],
    queryFn: getRecentKKMPAK,
    staleTime: 1000 * 60 * 5,
  });

  const ojkStatsQuery = useQuery({
    queryKey: ['ojk-stats', userInputFilter || 'all'],
    queryFn: async () => {
      const build = (status?: string) => {
        let q = (supabase as any).from('surat_keluar').select('*', { count: 'exact', head: true });
        if (status) q = q.eq('ojk_status', status);
        else q = q.not('ojk_status', 'is', null);
        if (userInputFilter) q = q.eq('user_input', userInputFilter);
        return q;
      };
      const [total, diajukan, diproses, ditolak, selesai] = await Promise.all([
        build(),
        build('diajukan'),
        build('diproses'),
        build('ditolak'),
        build('selesai'),
      ]);
      return {
        total: total.count || 0,
        diajukan: diajukan.count || 0,
        diproses: diproses.count || 0,
        ditolak: ditolak.count || 0,
        selesai: selesai.count || 0,
      };
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const isLoading =
    countsQuery.isLoading ||
    suratMasukQuery.isLoading ||
    suratKeluarQuery.isLoading ||
    sppkQuery.isLoading ||
    pkQuery.isLoading ||
    kkmpakQuery.isLoading;

  const refetchAll = () => {
    countsQuery.refetch();
    suratMasukQuery.refetch();
    suratKeluarQuery.refetch();
    sppkQuery.refetch();
    pkQuery.refetch();
    kkmpakQuery.refetch();
    ojkStatsQuery.refetch();
  };

  return {
    counts: countsQuery.data || { suratMasuk: 0, suratKeluar: 0, sppk: 0, pk: 0, kkmpak: 0 },
    suratMasuk: suratMasukQuery.data || [],
    suratKeluar: suratKeluarQuery.data || [],
    sppk: sppkQuery.data || [],
    pk: pkQuery.data || [],
    kkmpak: kkmpakQuery.data || [],
    ojkStats: ojkStatsQuery.data || { total: 0, diajukan: 0, diproses: 0, ditolak: 0, selesai: 0 },
    isLoading,
    refetchAll,
  };
};
