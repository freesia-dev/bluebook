// POST /api/storage/upload
//
// Requires a valid Supabase JWT (any authenticated user — mirrors the
// previous Storage RLS policy: "Authenticated users can upload documents",
// no role check). Expects multipart/form-data with:
//   - file:   the File to upload
//   - folder: destination subfolder, e.g. "security-log/foto", "call-memo"
//
// Returns a FULL absolute URL (built from this request's own origin), which
// exactly matches the shape `supabase.storage.from('documents').getPublicUrl()`
// used to return. This lets every render site in the app keep working
// unchanged — they just store/display whatever URL string they're given.
import type { Env } from "../../_shared/auth";
import { requireUser, json } from "../../_shared/auth";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB safety cap

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  const folder = String(form.get("folder") || "misc").replace(/^\/+|\/+$/g, "");

  if (!(file instanceof File)) {
    return json({ error: "file is required" }, 400);
  }
  if (file.size === 0) {
    return json({ error: "file is empty" }, 400);
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "file too large" }, 413);
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
  const rand = Math.random().toString(36).slice(2, 9);
  const filename = ext ? `${Date.now()}_${rand}.${ext}` : `${Date.now()}_${rand}`;
  const key = `${folder}/${filename}`;

  await env.DOCUMENTS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || undefined },
  });

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/storage/file/${key}`;

  return json({ url, path: key });
};
