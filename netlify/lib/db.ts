// Supabase connection for the Netlify Functions. SUPABASE_URL and
// SUPABASE_SECRET_KEY are Netlify environment variables. The secret key bypasses
// Row Level Security, so it must only ever be used here, server-side.
import { createClient, type PostgrestError, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function isDatabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the Netlify environment");
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

export class DbError extends Error {
  code: string | undefined;
  constructor(error: PostgrestError) {
    const hint = isMissingSchema(error) ? " (run db/schema.sql in the Supabase SQL Editor)" : "";
    super(`Supabase error ${error.code ?? ""}: ${error.message}${hint}`);
    this.code = error.code;
  }
}

/** Unwraps a supabase-js result, throwing on error. */
export function must<T>(result: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (result.error) throw new DbError(result.error);
  return result.data as NonNullable<T>;
}

/** Unwraps a `{ count: 'exact', head: true }` query. */
export function mustCount(result: { count: number | null; error: PostgrestError | null }) {
  if (result.error) throw new DbError(result.error);
  return result.count ?? 0;
}

/** Postgres unique_violation, e.g. two patients racing for the same slot. */
export function isUniqueViolation(err: unknown) {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

/** The tables or functions don't exist yet: db/schema.sql hasn't been run. */
export function isMissingSchema(err: unknown) {
  const code = typeof err === "object" && err !== null ? (err as { code?: string }).code : undefined;
  return code === "42P01" || code === "42883" || code === "PGRST202" || code === "PGRST205";
}

/**
 * Every property of an error, for logs: message, stack, code, details, hint,
 * HTTP status and any nested cause. console.error on a PostgrestError can
 * print little more than `{ message: '' }`.
 */
export function describeError(err: unknown): Record<string, unknown> {
  if (err === null || typeof err !== "object") return { value: err };
  const out: Record<string, unknown> = {};
  for (const key of Object.getOwnPropertyNames(err)) out[key] = (err as Record<string, unknown>)[key];
  if (err instanceof Error) {
    out.name = err.name;
    if (err.cause !== undefined) out.cause = describeError(err.cause);
  }
  return out;
}

/**
 * Non-secret facts about the Supabase settings, for diagnosing a failed
 * connection: the URL (not secret) and which kind of key is set, never the key.
 */
export function describeSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SECRET_KEY ?? "";
  let keyType = "missing";
  if (key.startsWith("sb_secret_")) keyType = "sb_secret (correct)";
  else if (key.startsWith("sb_publishable_")) keyType = "sb_publishable (wrong key: use the secret key)";
  else if (key.split(".").length === 3) {
    let role = "unknown";
    try {
      role = String(JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")).role ?? "unknown");
    } catch {}
    keyType = `legacy JWT, role=${role}${role === "service_role" ? " (correct)" : " (wrong key: use service_role)"}`;
  } else if (key) keyType = "unrecognised format";
  let supabaseUrl = url || "missing";
  try {
    const u = new URL(url);
    supabaseUrl = `${u.origin}${u.pathname === "/" ? "" : `${u.pathname} (should be just the project URL, no path)`}`;
  } catch {
    if (url) supabaseUrl = "not a valid URL";
  }
  return { supabaseUrl, keyType };
}

