import type { Config, Context } from "@netlify/functions";
import { getAvailability } from "../lib/appointments";
import { clientIp, json, jsonError } from "../lib/http";
import { rateLimit } from "../lib/rate-limit";

/** Open 30-minute slots for each day in the booking window (IST). */
export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return jsonError(405, "Method not allowed");
  try {
    if (!(await rateLimit(`availability:${clientIp(req, context)}`, 60, 60))) {
      return jsonError(429, "Too many requests. Please wait a minute and try again.");
    }
    return json({ days: await getAvailability() });
  } catch (err) {
    console.error("availability failed", err);
    return jsonError(503, "Could not load open slots right now.");
  }
};

export const config: Config = { path: "/api/availability" };
