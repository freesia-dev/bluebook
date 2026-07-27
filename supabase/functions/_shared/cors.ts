// Shared CORS helper with origin allowlist for admin/privileged endpoints.
const ALLOWED_ORIGINS = new Set([
  "https://bluebook.lovable.app",
  "https://bluebook-tlh.my.id",
  "https://id-preview--1c2132c5-5047-47c1-b614-dca7bf135f9a.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
]);

export function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
