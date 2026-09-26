import "server-only";
import { fallbackHours } from "./clinic";
import { query } from "./db";
import { hhmm } from "./time";

export type PublicHours = { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];

/** Weekly hours for the public site; falls back to the brief's hours if the DB is unreachable (e.g. at build time). */
export async function getPublicHours(): Promise<PublicHours> {
  try {
    const { rows } = await query<{ weekday: number; opens_at: string; closes_at: string; is_closed: boolean }>(
      "SELECT weekday, opens_at, closes_at, is_closed FROM clinic_hours ORDER BY weekday",
    );
    if (rows.length !== 7) return fallbackHours;
    return rows.map((r) => ({ weekday: r.weekday, opensAt: hhmm(r.opens_at), closesAt: hhmm(r.closes_at), isClosed: r.is_closed }));
  } catch {
    return fallbackHours;
  }
}
