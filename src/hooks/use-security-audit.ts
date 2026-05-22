import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============ Comments ============
export interface SecurityComment {
  id: string;
  shift_id: string | null;
  entry_id: string | null;
  komentar: string;
  created_by: string | null;
  created_by_nama: string | null;
  created_at: string;
}

export const useSecurityComments = (params: { shift_id?: string; entry_id?: string }) =>
  useQuery({
    queryKey: ['security-comments', params.shift_id, params.entry_id],
    enabled: !!(params.shift_id || params.entry_id),
    queryFn: async (): Promise<SecurityComment[]> => {
      let q = supabase.from('security_log_comment' as any).select('*').order('created_at', { ascending: false });
      if (params.entry_id) q = q.eq('entry_id', params.entry_id);
      else if (params.shift_id) q = q.eq('shift_id', params.shift_id).is('entry_id', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SecurityComment[];
    },
  });

export const useAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { shift_id?: string; entry_id?: string; komentar: string; nama: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const insertObj: any = {
        komentar: payload.komentar,
        created_by: u.user?.id ?? null,
        created_by_nama: payload.nama,
      };
      if (payload.entry_id) insertObj.entry_id = payload.entry_id;
      if (payload.shift_id) insertObj.shift_id = payload.shift_id;
      const { error } = await supabase.from('security_log_comment' as any).insert(insertObj);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['security-comments', vars.shift_id, vars.entry_id] });
    },
  });
};

export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('security_log_comment' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-comments'] });
    },
  });
};

// ============ Incident flag ============
export const useToggleIncident = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_insiden }: { id: string; is_insiden: boolean }) => {
      const { error } = await supabase.from('security_log_entry' as any).update({ is_insiden }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-entries'] });
    },
  });
};

// ============ Audit Tokens ============
export interface AuditToken {
  id: string;
  token: string;
  periode_dari: string;
  periode_sampai: string;
  expires_at: string;
  revoked_at: string | null;
  created_by_nama: string | null;
  catatan: string | null;
  created_at: string;
}

export const useAuditTokens = () =>
  useQuery({
    queryKey: ['audit-tokens'],
    queryFn: async (): Promise<AuditToken[]> => {
      const { data, error } = await supabase
        .from('security_audit_token' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AuditToken[];
    },
  });

export const useCreateAuditToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { dari: string; sampai: string; expires_at: string; catatan?: string }) => {
      const { data, error } = await supabase.rpc('create_security_audit_token' as any, {
        _dari: p.dari,
        _sampai: p.sampai,
        _expires_at: p.expires_at,
        _catatan: p.catatan ?? null,
      });
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-tokens'] }),
  });
};

export const useRevokeAuditToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('security_audit_token' as any)
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-tokens'] }),
  });
};

export const useDeleteAuditToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('security_audit_token' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit-tokens'] }),
  });
};

// ============ Public audit report ============
export interface AuditReport {
  periode_dari: string;
  periode_sampai: string;
  expires_at: string;
  created_by_nama: string | null;
  created_at: string;
  catatan: string | null;
  shifts: Array<{
    id: string;
    tanggal: string;
    shift: string;
    nama_petugas: string;
    jam_mulai: string;
    jam_selesai: string | null;
    status: string;
    is_lembur: boolean;
    ttd_pimpinan_nama: string | null;
    ttd_pimpinan_at: string | null;
    ba_signature_token: string | null;
  }>;
  entries: Array<{
    id: string;
    shift_id: string;
    jenis: string;
    kejadian: string;
    waktu_kejadian: string;
    is_insiden: boolean;
    foto_urls: string[];
    video_url: string | null;
    tanggal: string;
    shift: string;
    nama_petugas: string;
  }>;
  comments: Array<{
    id: string;
    shift_id: string | null;
    entry_id: string | null;
    komentar: string;
    created_by_nama: string | null;
    created_at: string;
  }>;
}

export const useAuditReport = (token: string | undefined) =>
  useQuery({
    queryKey: ['audit-report', token],
    enabled: !!token,
    queryFn: async (): Promise<AuditReport | { error: string }> => {
      const { data, error } = await supabase.rpc('get_security_audit_report' as any, { _token: token });
      if (error) throw error;
      return data as unknown as AuditReport | { error: string };
    },
  });
