import { db, must } from "./db";

/**
 * Fixed-window limiter stored in Supabase, so it holds across function
 * instances. Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const count = must(await db().rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds })) as number;
  return count <= limit;
}
