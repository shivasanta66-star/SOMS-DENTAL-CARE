import { fallbackHours } from "../../src/lib/clinic";
import { hhmm } from "../../src/lib/time";
import { db, isDatabaseConfigured, must } from "./db";

export type PublicHours = { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];

export async function getPublicHours(): Promise<PublicHours> {
  const rows = must(await db().from("clinic_hours").select("weekday, opens_at, closes_at, is_closed").order("weekday")) as {
    weekday: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
  }[];
  if (rows.length !== 7) return fallbackHours;
  return rows.map((r) => ({ weekday: r.weekday, opensAt: hhmm(r.opens_at), closesAt: hhmm(r.closes_at), isClosed: r.is_closed }));
}

/** For the static build: the brief's hours if the database isn't reachable. */
export async function getPublicHoursOrFallback(): Promise<PublicHours> {
  if (!isDatabaseConfigured()) return fallbackHours;
  try {
    return await getPublicHours();
  } catch (err) {
    console.warn("Using fallback opening hours:", (err as Error).message);
    return fallbackHours;
  }
}
