import type { Config } from "@netlify/functions";
import { getPublicHours } from "../lib/hours";
import { json, jsonError } from "../lib/http";

/** Weekly opening hours for the public site, so admin edits show without a redeploy. */
export default async (req: Request) => {
  if (req.method !== "GET") return jsonError(405, "Method not allowed");
  try {
    return json({ hours: await getPublicHours() }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (err) {
    console.error("hours failed", err);
    return jsonError(503, "Could not load opening hours.");
  }
};

export const config: Config = { path: "/api/hours" };
