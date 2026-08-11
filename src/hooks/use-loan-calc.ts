import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LoanSkema, AmortRow, CalcSummary, PotonganResult, BiayaItem, DsrBasis } from '@/lib/loan-calc';

export interface RateOption {
  label: string;
  value: number;
}

export interface DsrRule {
  kode: DsrBasis;
  label: string;
  max_pct: number;
}

export const DSR_RULES_DEFAULT: DsrRule[] = [
  { kode: 'gaji', label: 'GAJI', max_pct: 100 },
  { kode: 'ttp', label: 'TTP', max_pct: 30 },
];

export interface LoanProduct {
  id: string;
  nama: string;
  skema: LoanSkema;
  max_tenor_bulan: number;
  bunga_options: RateOption[];
  asuransi_options: RateOption[];
  provisi_options: RateOption[];
  biaya_items: BiayaItem[];
  dsr_rules: DsrRule[];
  biaya_notaris: number;
  biaya_perikatan: number;
  blokir_angsuran: number;
  is_active: boolean;
  urutan: number;
  asuransi_provider_default?: string;
}

export interface LoanAO {
  id: string;
  nama: string;
  jabatan: string | null;
  is_active: boolean;
  urutan: number;
}

export interface PensionRule {
  id: string;
  pilihan_karir: string;
  usia_pensiun: number;
}


export interface LoanSimulationRow {
  id: string;
  nomor_ktp: string | null;
  nama_debitur: string;
  tanggal_lahir: string | null;
  jenis_kelamin: string | null;
  pekerjaan: string | null;
  instansi: string | null;
  pilihan_karir: string | null;
  product_id: string | null;
  product_nama: string | null;
  skema: LoanSkema;
  plafon: number;
  tenor_bulan: number;
  tanggal_akad: string | null;
  gaji: number;
  gaji_pokok: number | null;
  ttp: number | null;
  bunga_pa: number;
  asuransi_provider: string;
  asuransi_nominal: number;
  asuransi_pct: number;
  asuransi_jiwa_beban: number | null;
  premi_kredit: number | null;
  provisi_pct: number;
  biaya_notaris: number;
  biaya_perikatan: number;
  biaya_items?: BiayaItem[] | null;
  angsuran_gaji?: number | null;
  angsuran_praja?: number | null;
  dsr_basis?: DsrBasis | null;
  dsr_max_pct?: number | null;
  blokir_angsuran: number;

  ada_pelunasan: boolean;
  pelunasan_bulan_ke: number | null;
  outstanding_pokok: number | null;
  outstanding_bunga: number | null;
  nama_ao: string | null;
  hasil_ringkasan: (CalcSummary & PotonganResult & { angsuranTengah?: number; cerdas?: any }) | null;
  tabel_angsuran: AmortRow[] | null;
  cerdas_skema?: string | null;
  cerdas_cap_subsidi?: number | null;
  cerdas_subsidi_bank?: number | null;
  cerdas_selisih_debitur?: number | null;
  created_by: string | null;
  created_by_nama: string | null;
  created_at: string;
  pipeline_status?: StageOrCancel | null;
  pipeline_note?: string | null;
  pipeline_updated_at?: string | null;
  pipeline_history?: PipelineHistoryEntry[] | null;
}

export interface PipelineHistoryEntry {
  from: string | null;
  to: string;
  at: string;
  by?: string | null;
}

export const PIPELINE_STAGES = ['simulasi', 'berkas_masuk', 'proses', 'input', 'cair'] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export const CANCEL_STAGE = 'batal' as const;
export type StageOrCancel = PipelineStage | typeof CANCEL_STAGE;

export const PIPELINE_LABELS: Record<PipelineStage, string> = {
  simulasi: 'Simulasi Kredit',
  berkas_masuk: 'Berkas Masuk',
  proses: 'Proses',
  input: 'Input',
  cair: 'Cair',
};

export const STAGE_LABELS_ALL: Record<string, string> = {
  ...PIPELINE_LABELS,
  batal: 'Dibatalkan',
};

export const ALASAN_BATAL_TEMPLATE = [
  'Hitungan tidak cocok bagi debitur',
  'Batal pengajuan (permintaan debitur)',
  'Mengajukan di tempat lain / bank lain',
  'Tidak memenuhi syarat / plafon tidak cukup',
  'Berkas tidak lengkap dan tidak dilanjutkan',
  'Duplikat / salah input simulasi',
];


export type LoanSimulationInput = Omit<
  LoanSimulationRow,
  'id' | 'created_at' | 'created_by' | 'created_by_nama' | 'pipeline_status' | 'pipeline_note' | 'pipeline_updated_at' | 'pipeline_history'
>;


// ============ PRODUCTS ============
export const useLoanProducts = (activeOnly = true) =>
  useQuery({
    queryKey: ['loan-products', activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from('loan_product_config').select('*').order('urutan');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LoanProduct[];
    },
    staleTime: 1000 * 60 * 5,
  });

export const useUpsertLoanProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<LoanProduct> & { nama: string }) => {
      const { id, ...rest } = p;
      if (id) {
        const { data, error } = await (supabase as any)
          .from('loan_product_config')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await (supabase as any)
        .from('loan_product_config')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-products'] }),
  });
};

export const useDeleteLoanProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('loan_product_config').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-products'] }),
  });
};

// ============ PENSION RULES ============
export const usePensionRules = () =>
  useQuery({
    queryKey: ['pension-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pension_rule')
        .select('*')
        .order('pilihan_karir');
      if (error) throw error;
      return (data || []) as PensionRule[];
    },
    staleTime: 1000 * 60 * 10,
  });

export const useUpsertPensionRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Partial<PensionRule> & { pilihan_karir: string; usia_pensiun: number }) => {
      const { id, ...rest } = r;
      if (id) {
        const { error } = await (supabase as any)
          .from('pension_rule')
          .update(rest)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('pension_rule').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pension-rules'] }),
  });
};

export const useDeletePensionRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('pension_rule').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pension-rules'] }),
  });
};

// ============ SIMULATIONS ============
export const useLoanSimulations = () =>
  useQuery({
    queryKey: ['loan-simulations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('loan_simulation')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LoanSimulationRow[];
    },
    staleTime: 1000 * 60 * 2,
  });

export const useSaveLoanSimulation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoanSimulationInput) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      let nama: string | null = null;
      if (userId) {
        const { data: prof } = await (supabase as any)
          .from('profiles')
          .select('nama')
          .eq('user_id', userId)
          .maybeSingle();
        nama = prof?.nama ?? null;
      }
      const { data, error } = await (supabase as any)
        .from('loan_simulation')
        .insert({ ...input, created_by: userId, created_by_nama: nama })
        .select()
        .single();
      if (error) throw error;
      return data as LoanSimulationRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-simulations'] }),
  });
};

export const useLoanSimulation = (id: string | undefined) =>
  useQuery({
    queryKey: ['loan-simulation', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('loan_simulation')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as LoanSimulationRow | null;
    },
  });

export const useUpdateLoanSimulation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LoanSimulationInput> }) => {
      const { data, error } = await (supabase as any)
        .from('loan_simulation')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as LoanSimulationRow;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['loan-simulations'] });
      qc.invalidateQueries({ queryKey: ['loan-simulation', v.id] });
    },
  });
};

export const useDeleteLoanSimulation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('loan_simulation').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-simulations'] }),
  });
};

/** Pindahkan simulasi ke tahap pipeline lain (optimistic, tanpa reload) */
export const useUpdatePipelineStage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage, note, by }: { id: string; stage: StageOrCancel; note?: string | null; by?: string | null }) => {
      const { data: cur } = await (supabase as any)
        .from('loan_simulation')
        .select('pipeline_status, pipeline_history')
        .eq('id', id)
        .maybeSingle();
      const history: PipelineHistoryEntry[] = Array.isArray(cur?.pipeline_history) ? cur.pipeline_history : [];
      history.push({ from: cur?.pipeline_status ?? null, to: stage, at: new Date().toISOString(), by: by ?? null });
      const patch: Record<string, unknown> = {
        pipeline_status: stage,
        pipeline_updated_at: new Date().toISOString(),
        pipeline_history: history.slice(-50),
      };
      if (note !== undefined) patch.pipeline_note = note;
      const { error } = await (supabase as any).from('loan_simulation').update(patch).eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage, note, by }) => {
      await qc.cancelQueries({ queryKey: ['loan-simulations'] });
      const prev = qc.getQueryData<LoanSimulationRow[]>(['loan-simulations']);
      const now = new Date().toISOString();
      qc.setQueryData<LoanSimulationRow[]>(['loan-simulations'], (old) =>
        (old || []).map((r) =>
          r.id === id
            ? {
                ...r,
                pipeline_status: stage,
                pipeline_updated_at: now,
                pipeline_history: [
                  ...(Array.isArray(r.pipeline_history) ? r.pipeline_history : []),
                  { from: r.pipeline_status ?? null, to: stage, at: now, by: by ?? null },
                ],
                pipeline_note: note !== undefined ? note ?? null : r.pipeline_note ?? null,
              }
            : r,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) qc.setQueryData(['loan-simulations'], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['loan-simulations'] }),
  });
};


export const PILIHAN_KARIR_DEFAULT = [
  'PNS Fungsional',
  'PNS Struktural',
  'PPPK Penuh Waktu',
  'PPPK Paruh Waktu',
  'Pensiunan',
];

// ============ DAFTAR AO ============
export const useLoanAOs = (activeOnly = true) =>
  useQuery({
    queryKey: ['loan-ao', activeOnly],
    queryFn: async () => {
      let q = (supabase as any).from('loan_ao').select('*').order('urutan').order('nama');
      if (activeOnly) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LoanAO[];
    },
    staleTime: 1000 * 60 * 10,
  });

export const useUpsertLoanAO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: Partial<LoanAO> & { nama: string }) => {
      const { id, ...rest } = a;
      if (id) {
        const { error } = await (supabase as any).from('loan_ao').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('loan_ao').insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-ao'] }),
  });
};

export const useDeleteLoanAO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('loan_ao').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-ao'] }),
  });
};
