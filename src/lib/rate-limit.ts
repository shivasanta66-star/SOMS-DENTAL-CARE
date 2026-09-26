import "server-only";
import { query } from "./db";

/**
 * Fixed-window limiter stored in Postgres, so it holds across serverless
 * instances. Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const { rows } = await query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count)
     VALUES ($1, to_timestamp(floor(extract(epoch FROM now()) / $2) * $2), 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [key, windowSeconds],
  );
  // Occasionally clear out old windows.
  if (Math.random() < 0.02) {
    await query("DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'");
  }
  return rows[0].count <= limit;
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
