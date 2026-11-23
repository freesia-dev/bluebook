import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUnit, type UnitKredit } from '@/lib/produktif-utils';
import type { MLFRow } from '@/hooks/use-mlf-data';

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

export type UnitLaci = 'telihan' | 'meranti';

/** Satu map fisik di dalam laci. */
export interface BerkasArsip {
  id: string;
  brcd: string;
  /** kode permanen BB-M-xxxxxx, isi QR di sampul map (diisi database) */
  kode_map: string;
  kode_laci: string;
  /** 1 = map paling belakang laci, naik ke arah depan */
  nomor_urut: number;
  unit: UnitLaci;
  debitur_id: string | null;
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

/** Satu orang pemilik satu atau lebih map — pengikat riwayat kreditnya. */
export interface DebiturArsip {
  id: string;
  brcd: string;
  kode: string;
  nama: string;
  nama_kunci: string;
  nik: string | null;
  catatan: string | null;
  created_at: string;
}

export const useDebiturArsip = (brcd: string = BRCD_TELIHAN) =>
  useQuery({
    queryKey: ['arsip-debitur', brcd],
    queryFn: async (): Promise<DebiturArsip[]> => {
      const { data, error } = await (supabase as any)
        .from('arsip_debitur')
        .select('*')
        .eq('brcd', brcd)
        .order('nama');
      if (error) throw error;
      return (data || []) as DebiturArsip[];
    },
    staleTime: 30 * 1000,
  });

export type BerkasBaru = Omit<BerkasArsip, 'id' | 'created_at' | 'kode_map' | 'debitur_id'> & {
  dicatat_oleh?: string | null;
};

/**
 * Ke debitur mana map baru disambungkan:
 * - { id } untuk debitur yang sudah ada,
 * - { baru: nama } untuk membuat debitur baru dengan nama itu.
 */
export type PilihanDebitur = { id: string } | { baru: string };

export const useSimpanBerkas = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ baris, debitur }: { baris: BerkasBaru; debitur: PilihanDebitur }) => {
      let debiturId: string;
      if ('id' in debitur) {
        debiturId = debitur.id;
      } else {
        const { data: d, error: e1 } = await (supabase as any)
          .from('arsip_debitur')
          .insert({ brcd: baris.brcd, nama: debitur.baru, nama_kunci: samakanNama(debitur.baru), dibuat_oleh: user?.id ?? null })
          .select()
          .single();
        if (e1) throw e1;
        debiturId = (d as DebiturArsip).id;
      }
      const { data, error } = await (supabase as any)
        .from('arsip_berkas')
        .insert({ ...baris, debitur_id: debiturId, dicatat_oleh: user?.id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as BerkasArsip;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arsip-berkas'] });
      qc.invalidateQueries({ queryKey: ['arsip-debitur'] });
    },
  });
};

/** Pindahkan satu map ke debitur lain, atau ke debitur baru (memisahkan riwayat). */
export const useTautkanDebitur = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ berkas, debitur }: { berkas: BerkasArsip; debitur: PilihanDebitur }) => {
      let debiturId: string;
      if ('id' in debitur) {
        debiturId = debitur.id;
      } else {
        const { data: d, error: e1 } = await (supabase as any)
          .from('arsip_debitur')
          .insert({ brcd: berkas.brcd, nama: debitur.baru, nama_kunci: samakanNama(debitur.baru), dibuat_oleh: user?.id ?? null })
          .select()
          .single();
        if (e1) throw e1;
        debiturId = (d as DebiturArsip).id;
      }
      const { error } = await (supabase as any)
        .from('arsip_berkas')
        .update({ debitur_id: debiturId })
        .eq('id', berkas.id);
      if (error) throw error;
      return debiturId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['arsip-berkas'] });
      qc.invalidateQueries({ queryKey: ['arsip-debitur'] });
    },
  });
};

/** Ganti unit semua map di satu laci (Telihan ⇄ Meranti). */
export const useUnitLaci = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brcd, kode_laci, unit }: { brcd: string; kode_laci: string; unit: UnitLaci }) => {
      const { error } = await (supabase as any)
        .from('arsip_berkas')
        .update({ unit })
        .eq('brcd', brcd)
        .eq('kode_laci', kode_laci);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arsip-berkas'] }),
  });
};

/** Balik nomor urut satu laci — untuk laci yang terlanjur dinomori dari depan. */
export const useBalikUrutan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ brcd, kode_laci }: { brcd: string; kode_laci: string }) => {
      const { data, error } = await (supabase as any).rpc('arsip_balik_urutan', { p_brcd: brcd, p_kode_laci: kode_laci });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['arsip-berkas'] }),
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
    .replace(/\b(H|HJ|HAJI|IR|DRS|DRA|S\s?E|S\s?T|S\s?H|M\s?M|S\s?PD|A\s?MD)\b/g, ' ')
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

/* ---------------------------------------------------------------- unit & riwayat */

/** Unit kredit sebuah rekening, memakai aturan yang sama dengan menu Produktif. */
export const unitRekening = (r: RekeningMaster): UnitKredit =>
  getUnit({ l0lnno: r.no_rekening, l0narr: r.nomor_pk } as unknown as MLFRow);

/** Satu baris di riwayat debitur: map fisik, rekening MLF, atau keduanya. */
export interface BarisRiwayat {
  kunci: string;
  nama: string;
  nomor_pk: string | null;
  no_rekening: string | null;
  tanggal_akad: string | null;
  plafon: number | null;
  status: 'aktif' | 'lunas' | 'tidak_dikenali';
  map: BerkasArsip | null;
  rekening: RekeningMaster | null;
}

/**
 * Riwayat lengkap satu debitur, diurutkan dari akad paling lama:
 * semua map yang tersambung ke debitur itu, ditambah rekening MLF atas nama
 * yang sama (atau atas nama di map-mapnya) yang belum punya map.
 */
export const riwayatDebitur = (
  debitur: DebiturArsip,
  berkas: BerkasArsip[],
  master: RekeningMaster[],
): BarisRiwayat[] => {
  const maps = berkas.filter((b) => b.debitur_id === debitur.id);
  const kunciNama = new Set([debitur.nama_kunci, ...maps.map((m) => samakanNama(m.nama_debitur))].filter(Boolean));
  const rekDiMap = new Set(maps.map((m) => m.no_rekening).filter(Boolean) as string[]);
  const masterPerRek = new Map(master.map((r) => [r.no_rekening, r]));
  // rekening yang sudah punya map di laci lain milik debitur lain tidak ikut
  const rekDiMapLain = new Set(
    berkas.filter((b) => b.debitur_id !== debitur.id && b.no_rekening).map((b) => b.no_rekening as string),
  );

  const baris: BarisRiwayat[] = maps.map((m) => {
    const r = m.no_rekening ? masterPerRek.get(m.no_rekening) ?? null : null;
    return {
      kunci: m.id,
      nama: m.nama_debitur,
      nomor_pk: m.nomor_pk,
      no_rekening: m.no_rekening,
      tanggal_akad: m.tanggal_akad,
      plafon: m.plafon,
      status: r ? r.status : m.status_kredit,
      map: m,
      rekening: r,
    };
  });
  master.forEach((r) => {
    if (rekDiMap.has(r.no_rekening) || rekDiMapLain.has(r.no_rekening)) return;
    if (!kunciNama.has(samakanNama(r.nama_debitur))) return;
    baris.push({
      kunci: r.no_rekening,
      nama: r.nama_debitur,
      nomor_pk: r.nomor_pk,
      no_rekening: r.no_rekening,
      tanggal_akad: r.tanggal_akad,
      plafon: r.plafon,
      status: r.status,
      map: null,
      rekening: r,
    });
  });
  return baris.sort((a, b) => (a.tanggal_akad || '0000').localeCompare(b.tanggal_akad || '0000'));
};

/** Debitur yang paling mungkin sama orangnya dengan nama ini (nama kunci persis sama). */
export const debiturSeNama = (nama: string, daftar: DebiturArsip[]): DebiturArsip | null => {
  const k = samakanNama(nama);
  if (!k) return null;
  return daftar.find((d) => d.nama_kunci === k) ?? null;
};

/**
 * Saran sambungan untuk map lama yang diketik manual: debitur yang sudah ada
 * dan nama-nama di MLF yang mirip. Nama yang persis sama diletakkan paling atas.
 */
export interface SaranDebitur {
  kunci: string;
  nama: string;
  debitur: DebiturArsip | null;
  rekening: RekeningMaster[];
  persis: boolean;
}

export const saranDebitur = (
  nama: string,
  daftar: DebiturArsip[],
  master: RekeningMaster[],
  batas = 6,
): SaranDebitur[] => {
  const q = samakanNama(nama);
  if (q.length < 3) return [];
  const kata = q.split(' ');
  const mirip = (k: string) => k === q || k.includes(q) || q.includes(k) || kata.every((w) => k.includes(w));
  const peta = new Map<string, SaranDebitur>();
  daftar.forEach((d) => {
    if (!mirip(d.nama_kunci)) return;
    peta.set(d.nama_kunci, { kunci: d.nama_kunci, nama: d.nama, debitur: d, rekening: [], persis: d.nama_kunci === q });
  });
  master.forEach((r) => {
    const k = samakanNama(r.nama_debitur);
    if (!k || !mirip(k)) return;
    const ada = peta.get(k) ?? { kunci: k, nama: r.nama_debitur, debitur: null, rekening: [], persis: k === q };
    ada.rekening.push(r);
    peta.set(k, ada);
  });
  return [...peta.values()]
    .sort((a, b) =>
      Number(b.persis) - Number(a.persis)
      || b.rekening.filter((r) => r.status === 'aktif').length - a.rekening.filter((r) => r.status === 'aktif').length
      || a.nama.localeCompare(b.nama))
    .slice(0, batas);
};
