// GET /api/storage/list
//
// Admin-only (used by the Dashboard's storage-usage widget). Returns the
// true total across ALL files in the bucket — R2's list() is flat (keys are
// just strings with '/' in them), so unlike the old Supabase Storage query
// this needs no manual per-folder recursion and has no depth limit.
import type { Env } from "../../_shared/auth";
import { requireUser, isAdmin, json } from "../../_shared/auth";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const admin = await isAdmin(auth.client, auth.user.id);
  if (!admin) return json({ error: "Forbidden" }, 403);

  let totalBytes = 0;
  let totalFiles = 0;
  let cursor: string | undefined;

  do {
    const page = await env.DOCUMENTS_BUCKET.list({ cursor, limit: 1000 });
    for (const obj of page.objects) {
      totalBytes += obj.size;
      totalFiles += 1;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return json({ totalBytes, totalFiles });
};
