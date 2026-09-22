// Shared helpers for Cloudflare Pages Functions that need to verify a
// Supabase-issued JWT and (optionally) check the caller's admin role.
//
// These run in the Workers runtime, same-origin with the Pages site, so no
// CORS handling is required here (unlike the Supabase Edge Functions, which
// live on a different origin).
import { createClient } from "@supabase/supabase-js";

export interface Env {
  DOCUMENTS_BUCKET: R2Bucket;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Verifies the request's `Authorization: Bearer <jwt>` header against
 * Supabase Auth and returns the authenticated user, or null if missing/invalid.
 */
export async function requireUser(request: Request, env: Env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;

  // Akun yang belum di-approve (atau ditolak) admin tidak boleh mengakses file.
  // Kalau pengecekan status gagal karena hal lain (mis. jaringan), jangan
  // blokir — supaya user yang sah tidak ikut terkunci.
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("status")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (!profileError && profile && profile.status !== "approved") return null;

  return { user: data.user, client };
}

/**
 * Checks whether the given (already-authenticated) client's user has the
 * 'admin' role in `user_roles`. Mirrors the check used by the admin-* edge
 * functions elsewhere in this project.
 */
export async function isAdmin(client: { from: (table: string) => any }, userId: string) {
  const { data } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
};

export function guessContentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "application/octet-stream";
}
