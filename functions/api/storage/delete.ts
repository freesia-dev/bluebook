// POST /api/storage/delete  { path: string }  or  { url: string }
//
// Requires a valid Supabase JWT AND the 'admin' role in user_roles — mirrors
// the previous Storage RLS policy: "Admins can delete documents".
import type { Env } from "../../_shared/auth";
import { requireUser, isAdmin, json } from "../../_shared/auth";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  const admin = await isAdmin(auth.client, auth.user.id);
  if (!admin) return json({ error: "Forbidden" }, 403);

  let body: { path?: string; url?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  let key = body.path;
  if (!key && body.url) {
    try {
      const u = new URL(body.url);
      const marker = "/api/storage/file/";
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) key = decodeURIComponent(u.pathname.slice(idx + marker.length));
    } catch {
      // ignore, key stays undefined
    }
  }

  if (!key) return json({ error: "path or url is required" }, 400);

  await env.DOCUMENTS_BUCKET.delete(key);
  return json({ success: true });
};
