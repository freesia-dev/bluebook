import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ShiftType = 'pagi' | 'sore' | 'malam';
export type ShiftStatus = 'aktif' | 'selesai';
export type EntryJenis = 'kejadian' | 'serah_terima' | 'mulai_shift' | 'akhir_shift';

export const SHIFT_LABEL: Record<ShiftType, string> = {
  pagi: 'Pagi (08:00 – 16:00)',
  sore: 'Sore (16:00 – 24:00)',
  malam: 'Malam (24:00 – 08:00)',
};

export const SHIFT_LABEL_SHORT: Record<ShiftType, string> = {
  pagi: 'Pagi',
  sore: 'Sore',
  malam: 'Malam',
};

export interface SecurityShift {
  id: string;
  tanggal: string;
  shift: ShiftType;
  nama_petugas: string;
  petugas_user_id: string | null;
  jam_mulai: string;
  jam_selesai: string | null;
  status: ShiftStatus;
  is_lembur: boolean;
  parent_shift_id: string | null;
  kondisi_akhir: string | null;
  serah_terima_ke_nama: string | null;
  serah_terima_ke_user_id: string | null;
  serah_terima_at: string | null;
  catatan_serah_terima: string | null;
  ttd_pimpinan_nama: string | null;
  ttd_pimpinan_user_id: string | null;
  ttd_pimpinan_at: string | null;
  created_by: string | null;
}

export interface SecurityLogEntry {
  id: string;
  shift_id: string;
  waktu_kejadian: string;
  jenis: EntryJenis;
  kejadian: string;
  foto_urls: string[];
  video_url: string | null;
  created_by: string | null;
  created_at: string;
}

const QK = {
  shifts: (tanggal?: string) => ['security-shifts', tanggal] as const,
  entries: (shiftId: string) => ['security-entries', shiftId] as const,
};

export const useSecurityShifts = (tanggal?: string) =>
  useQuery({
    queryKey: QK.shifts(tanggal),
    queryFn: async (): Promise<SecurityShift[]> => {
      let q = supabase.from('security_shift' as any).select('*').order('tanggal', { ascending: false }).order('jam_mulai', { ascending: true });
      if (tanggal) q = q.eq('tanggal', tanggal);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as SecurityShift[];
    },
  });

export const useSecurityEntries = (shiftId?: string) =>
  useQuery({
    queryKey: QK.entries(shiftId || ''),
    enabled: !!shiftId,
    queryFn: async (): Promise<SecurityLogEntry[]> => {
      const { data, error } = await supabase
        .from('security_log_entry' as any)
        .select('*')
        .eq('shift_id', shiftId!)
        .order('waktu_kejadian', { ascending: true });
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        foto_urls: Array.isArray(d.foto_urls) ? d.foto_urls : [],
      })) as SecurityLogEntry[];
    },
  });

export const useStartShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      tanggal: string;
      shift: ShiftType;
      nama_petugas: string;
      is_lembur?: boolean;
      parent_shift_id?: string | null;
      catatan_awal?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const { data, error } = await supabase
        .from('security_shift' as any)
        .insert({
          tanggal: payload.tanggal,
          shift: payload.shift,
          nama_petugas: payload.nama_petugas,
          petugas_user_id: uid,
          is_lembur: payload.is_lembur ?? false,
          parent_shift_id: payload.parent_shift_id ?? null,
          created_by: uid,
          status: 'aktif',
        })
        .select()
        .single();
      if (error) throw error;
      const shift = data as unknown as SecurityShift;
      // Insert "mulai shift" entry
      await supabase.from('security_log_entry' as any).insert({
        shift_id: shift.id,
        jenis: 'mulai_shift',
        kejadian: payload.catatan_awal?.trim()
          ? `Memulai shift ${SHIFT_LABEL_SHORT[shift.shift]}. ${payload.catatan_awal.trim()}`
          : `Memulai shift ${SHIFT_LABEL_SHORT[shift.shift]} oleh ${shift.nama_petugas}.`,
        waktu_kejadian: shift.jam_mulai,
        created_by: uid,
      });
      return shift;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-shifts'] });
    },
  });
};

export const useAddEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      shift_id: string;
      waktu_kejadian: string; // ISO
      kejadian: string;
      foto_urls?: string[];
      video_url?: string | null;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('security_log_entry' as any)
        .insert({
          shift_id: payload.shift_id,
          waktu_kejadian: payload.waktu_kejadian,
          kejadian: payload.kejadian,
          foto_urls: payload.foto_urls ?? [],
          video_url: payload.video_url ?? null,
          jenis: 'kejadian',
          created_by: userRes.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.entries(vars.shift_id) });
    },
  });
};

export const useUpdateEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      shift_id: string;
      waktu_kejadian?: string;
      kejadian?: string;
      foto_urls?: string[];
      video_url?: string | null;
    }) => {
      const { id, shift_id, ...rest } = payload;
      const { error } = await supabase.from('security_log_entry' as any).update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.entries(vars.shift_id) });
    },
  });
};

export const useDeleteEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; shift_id: string }) => {
      const { error } = await supabase.from('security_log_entry' as any).delete().eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QK.entries(vars.shift_id) });
    },
  });
};

export const useHandoverShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      shift_id: string;
      kondisi_akhir: string;
      serah_terima_ke_nama: string;
      catatan_serah_terima?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('security_shift' as any)
        .update({
          status: 'selesai',
          jam_selesai: now,
          kondisi_akhir: payload.kondisi_akhir,
          serah_terima_ke_nama: payload.serah_terima_ke_nama,
          catatan_serah_terima: payload.catatan_serah_terima || null,
          serah_terima_at: now,
        })
        .eq('id', payload.shift_id)
        .select()
        .single();
      if (error) throw error;
      // Log "serah terima" entry on the timeline
      await supabase.from('security_log_entry' as any).insert({
        shift_id: payload.shift_id,
        jenis: 'serah_terima',
        waktu_kejadian: now,
        kejadian: `Serah terima shift kepada ${payload.serah_terima_ke_nama}. Kondisi akhir: ${payload.kondisi_akhir}${
          payload.catatan_serah_terima ? `. Catatan: ${payload.catatan_serah_terima}` : ''
        }`,
        created_by: userRes.user?.id,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-shifts'] });
    },
  });
};

export const useSignBA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { tanggal: string; nama_pimpinan: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('security_shift' as any)
        .update({
          ttd_pimpinan_nama: payload.nama_pimpinan,
          ttd_pimpinan_user_id: userRes.user?.id,
          ttd_pimpinan_at: new Date().toISOString(),
        })
        .eq('tanggal', payload.tanggal);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['security-shifts'] });
    },
  });
};
