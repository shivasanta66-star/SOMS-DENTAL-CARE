import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { getAvailability } from "@/lib/appointments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Open 30-minute slots for each of the next 14 days (IST). */
export async function GET(req: Request) {
  try {
    if (!(await rateLimit(`availability:${clientIp(req.headers)}`, 60, 60))) {
      return jsonError(429, "Too many requests. Please wait a minute and try again.");
    }
    return NextResponse.json({ days: await getAvailability() });
  } catch (err) {
    console.error("availability failed", err);
    return jsonError(503, "Could not load open slots right now.");
  }
}
