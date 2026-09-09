// Client helpers for the R2-backed storage API (Cloudflare Pages Functions
// under /api/storage/*). This replaces direct `supabase.storage.from(...)`
// calls — see MIGRATION.md for why (moving off paid Supabase Storage to
// free Cloudflare R2). All endpoints are same-origin Pages Functions, so no
// CORS handling is needed here.
import { supabase } from '@/integrations/supabase/client';

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Anda harus login untuk melakukan ini.');
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Uploads a file to the given folder and returns a full absolute URL that
 * can be stored and rendered exactly like the old
 * `supabase.storage.from('documents').getPublicUrl()` result.
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  const headers = await authHeader();

  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers,
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(body.error || `Upload gagal (${res.status})`);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

/** Admin-only: deletes a previously uploaded file by its stored URL. */
export async function deleteFile(url: string): Promise<void> {
  const headers = await authHeader();
  const res = await fetch('/api/storage/delete', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(body.error || `Hapus file gagal (${res.status})`);
  }
}

/** Admin-only: total storage usage across the whole bucket. */
export async function getStorageUsage(): Promise<{ totalBytes: number; totalFiles: number }> {
  const headers = await authHeader();
  const res = await fetch('/api/storage/list', { headers });
  if (!res.ok) throw new Error(`Gagal memuat pemakaian storage (${res.status})`);
  return res.json();
}
