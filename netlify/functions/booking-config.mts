import type { Config } from "@netlify/functions";
import { db, must } from "../lib/db";
import { json, jsonError } from "../lib/http";
import { isRazorpayConfigured, razorpayKeyId } from "../lib/razorpay";
import { getConsultationFeePaise } from "../lib/settings";

/** Active services, the consultation fee and the Razorpay key for the booking widget. */
export default async (req: Request) => {
  if (req.method !== "GET") return jsonError(405, "Method not allowed");
  try {
    const [services, feePaise] = await Promise.all([
      db().from("services").select("id, name").eq("is_active", true).order("display_order").order("id"),
      getConsultationFeePaise(),
    ]);
    return json({
      services: must(services),
      feePaise,
      razorpayKeyId: razorpayKeyId(),
      paymentsEnabled: isRazorpayConfigured(),
    });
  } catch (err) {
    console.error("booking config failed", err);
    return jsonError(503, "Online booking is temporarily unavailable.");
  }
};

export const config: Config = { path: "/api/booking/config" };
