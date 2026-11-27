// Tanya Bluebook — pengambil data dari Supabase dengan hak akses akun yang login.
// Kunci cache sama dengan hook Loan Monitoring dan Arsip, jadi data yang
// sudah pernah dibuka di menu lain tidak diunduh ulang.

import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MLFRow, MLFUpload } from '@/hooks/use-mlf-data';
import type { BerkasArsip, RekeningMaster } from '@/hooks/use-arsip';
import type { Perintah } from './perintah';
import { rapikanPerintah } from './perintah';
import { iso } from './perintah';
import type { PinjamAktif, SumberData } from './jalankan';

const BRCD = '143';
const sb = supabase as any;

async function semuaHalaman<T>(buat: (dari: number, sampai: number) => any): Promise<T[]> {
  const hasil: T[] = [];
  const PAGE = 1000;
  for (let dari = 0; ; dari += PAGE) {
    const { data, error } = await buat(dari, dari + PAGE - 1);
    if (error) throw error;
    const potong = (data || []) as T[];
    hasil.push(...potong);
    if (potong.length < PAGE) break;
  }
  return hasil;
}

export async function siapkanSumber(qc: QueryClient): Promise<SumberData> {
  const uploads = await qc.fetchQuery({
    queryKey: ['mlf-uploads'],
    queryFn: async () => {
      const { data, error } = await sb.from('mlf_uploads').select('*').order('jobdate', { ascending: false });
      if (error) throw error;
      return (data || []) as MLFUpload[];
    },
    staleTime: 60_000,
  });

  return {
    uploads,
    hariIni: new Date(),
    baris: (uploadId) =>
      qc.fetchQuery({
        queryKey: ['mlf-data-by-branch', uploadId, BRCD],
        queryFn: () =>
          semuaHalaman<MLFRow>((dari, sampai) =>
            sb.from('mlf_data').select('*').eq('upload_id', uploadId).eq('brcd', BRCD).range(dari, sampai),
          ),
        staleTime: 5 * 60_000,
      }),
    arsipMaster: () =>
      qc.fetchQuery({
        queryKey: ['arsip-master', BRCD],
        queryFn: async () => {
          const { data, error } = await sb.rpc('arsip_master', { p_brcd: BRCD });
          if (error) throw error;
          return (data || []) as RekeningMaster[];
        },
        staleTime: 60 * 60_000,
      }),
    berkas: () =>
      qc.fetchQuery({
        queryKey: ['arsip-berkas', BRCD],
        queryFn: async () => {
          const { data, error } = await sb.from('arsip_berkas').select('*').eq('brcd', BRCD).order('kode_laci').order('nomor_urut');
          if (error) throw error;
          return (data || []) as BerkasArsip[];
        },
        staleTime: 30_000,
      }),
    pinjamAktif: async () => {
      const { data, error } = await sb.from('arsip_pinjam').select('berkas_id, peminjam, tenggat').eq('brcd', BRCD).is('kembali_at', null);
      if (error) throw error;
      return (data || []) as PinjamAktif[];
    },
    kontak: async (lnno) => {
      const unik = Array.from(new Set(lnno.filter(Boolean)));
      const hasil: Record<string, string> = {};
      for (let i = 0; i < unik.length; i += 200) {
        const { data, error } = await sb.from('debitur_kontak').select('l0lnno, no_hp').in('l0lnno', unik.slice(i, i + 200));
        if (error) throw error;
        for (const r of (data || []) as { l0lnno: string; no_hp: string | null }[]) if (r.no_hp) hasil[r.l0lnno] = r.no_hp;
      }
      return hasil;
    },
  };
}

export type GagalAi = 'belum_dipasang' | 'jatah_habis' | 'gagal' | 'tidak_paham' | 'belum_login';

/** Minta Workers AI menerjemahkan pertanyaan. Hanya kalimatnya yang dikirim. */
export async function tanyaAi(teks: string): Promise<{ perintah: Perintah } | { gagal: GagalAi; detail?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { gagal: 'belum_login' };
  try {
    const res = await fetch('/api/tanya', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ teks, hariIni: iso(new Date()) }),
    });
    const json = (res.headers.get('content-type') || '').includes('json');
    const body = json ? ((await res.json().catch(() => ({}))) as { perintah?: unknown; error?: string; detail?: string }) : {};
    if (res.status === 503) return { gagal: 'belum_dipasang' };
    if (res.status === 429) return { gagal: 'jatah_habis', detail: body.detail };
    if (res.status === 401) return { gagal: 'belum_login' };
    // di mode dev (vite) /api/* tidak ada dan yang kembali adalah index.html
    if (res.ok && !json) return { gagal: 'belum_dipasang' };
    if (!res.ok) return { gagal: 'gagal', detail: `${res.status} ${body.error ?? ''} ${body.detail ?? ''}`.trim() };
    const perintah = rapikanPerintah(body.perintah);
    return perintah ? { perintah } : { gagal: 'tidak_paham', detail: JSON.stringify(body.perintah ?? null).slice(0, 200) };
  } catch (e) {
    return { gagal: 'gagal', detail: e instanceof Error ? e.message : String(e) };
  }
}
