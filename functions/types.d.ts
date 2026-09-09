// Minimal ambient types for Cloudflare Pages Functions, scoped to this
// folder only (see functions/tsconfig.json). This is intentionally hand-
// rolled rather than pulling in `@cloudflare/workers-types` as a real
// dependency, to avoid touching package.json/lockfiles for a change that
// isn't needed at build time — Cloudflare bundles Functions with esbuild
// (no type-checking), so these declarations only help local editing.

interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  httpMetadata?: R2HTTPMetadata;
  uploaded: Date;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream | null;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}

interface R2GetOptions {
  onlyIf?: { etagDoesNotMatch?: string; etagMatches?: string };
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
}

interface R2ListOptions {
  limit?: number;
  cursor?: string;
  prefix?: string;
}

interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | R2Object | null>;
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

interface EventContext<Env, P extends string = string, Data = unknown> {
  request: Request;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
  waitUntil(promise: Promise<unknown>): void;
  next(): Promise<Response>;
}

type PagesFunction<Env = unknown, P extends string = string, Data = unknown> = (
  context: EventContext<Env, P, Data>
) => Response | Promise<Response>;
