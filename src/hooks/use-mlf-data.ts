import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MLFUpload {
  id: string;
  jobdate: string;
  filename: string;
  total_rows: number;
  created_at: string;
}

export interface MLFRow {
  id: string;
  upload_id: string;
  jobdate: string;
  brcd: string | null;
  brname: string | null;
  kol: number | null;
  lytitl: string | null;
  ecname: string | null;
  l0lnno: string | null;
  l0name: string | null;
  l0narr: string | null;
  pla: number | null;
  baki: number | null;
  tungpk: number | null;
  tungbg: number | null;
  cad: number | null;
  group1: string | null;
  group2: string | null;
  l0usid: string | null;
  date1: string | null;
}

export const useMLFUploads = () => {
  return useQuery({
    queryKey: ['mlf-uploads'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('mlf_uploads')
        .select('*')
        .order('jobdate', { ascending: false });
      if (error) throw error;
      return (data || []) as MLFUpload[];
    },
    staleTime: 1000 * 60,
  });
};

export const useMLFDataByBranch = (uploadId?: string, branchCode?: string) => {
  const brcd = branchCode || '143';
  return useQuery({
    queryKey: ['mlf-data-by-branch', uploadId, brcd],
    queryFn: async () => {
      if (!uploadId) return [];
      const all: MLFRow[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from('mlf_data')
          .select('*')
          .eq('upload_id', uploadId)
          .eq('brcd', brcd)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const chunk = (data || []) as MLFRow[];
        all.push(...chunk);
        if (chunk.length < PAGE) break;
        from += PAGE;
      }
      return all;
    },
    enabled: !!uploadId,
    staleTime: 1000 * 60 * 5,
  });
};

/** @deprecated use useMLFDataByBranch(uploadId, '143') */
export const useMLFData143 = (uploadId?: string) => useMLFDataByBranch(uploadId, '143');
