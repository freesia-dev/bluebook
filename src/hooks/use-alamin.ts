import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AlaminConfig, AlaminUWRule, TarifMap } from '@/lib/alamin-calc';

export const useAlaminTarif = () =>
  useQuery({
    queryKey: ['alamin-tarif'],
    queryFn: async (): Promise<TarifMap> => {
      const { data, error } = await (supabase as any)
        .from('alamin_tarif')
        .select('umur, tenor_bulan, rate');
      if (error) throw error;
      const map: TarifMap = new Map();
      for (const row of (data ?? []) as Array<{ umur: number; tenor_bulan: number; rate: number }>) {
        let inner = map.get(row.umur);
        if (!inner) {
          inner = new Map();
          map.set(row.umur, inner);
        }
        inner.set(row.tenor_bulan, Number(row.rate));
      }
      return map;
    },
    staleTime: 1000 * 60 * 60, // 1 jam
  });

export const useAlaminUWRules = () =>
  useQuery({
    queryKey: ['alamin-uw-rules'],
    queryFn: async (): Promise<AlaminUWRule[]> => {
      const { data, error } = await (supabase as any)
        .from('alamin_underwriting_rule')
        .select('*')
        .order('urutan');
      if (error) throw error;
      return (data ?? []) as AlaminUWRule[];
    },
    staleTime: 1000 * 60 * 60,
  });

export const useAlaminConfig = () =>
  useQuery({
    queryKey: ['alamin-config'],
    queryFn: async (): Promise<AlaminConfig> => {
      const { data, error } = await (supabase as any)
        .from('alamin_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return (
        data ?? {
          ujroh_pct: 10,
          pajak_pct: 2,
          premi_min: 5000,
          x_plus_n_default: 70,
        }
      ) as AlaminConfig;
    },
    staleTime: 1000 * 60 * 60,
  });
