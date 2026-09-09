// GET /api/storage/file/<path...>
//
// Public, unauthenticated file serving from R2 — this intentionally mirrors
// the previous Supabase Storage behaviour, where the `documents` bucket was
// public (public = true) and anyone with a URL could GET the file with zero
// auth. Public audit pages (/audit/security/:token) and print pages rely on
// this being unauthenticated, so do not add an auth check here.
import type { Env } from "../../../_shared/auth";
import { guessContentType } from "../../../_shared/auth";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { params, request, env } = context;
  const segments = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  if (segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }
  const key = segments.map((s) => decodeURIComponent(s)).join("/");

  const ifNoneMatch = request.headers.get("If-None-Match");
  const object = await env.DOCUMENTS_BUCKET.get(key, {
    onlyIf: ifNoneMatch ? { etagDoesNotMatch: ifNoneMatch } : undefined,
  });

  if (object === null) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || guessContentType(key));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Length", String(object.size));

  // R2 returns an object with no body (but metadata) when the conditional
  // GET's precondition fails, i.e. the client's cached copy is still fresh.
  if (!object.body) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(object.body, { headers });
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
};
