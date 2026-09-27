import type { Config } from "@netlify/functions";
import { hasAdminAccount } from "../lib/auth";
import { describeError, describeSupabaseConfig, isDatabaseConfigured, isMissingSchema } from "../lib/db";
import { json } from "../lib/http";
import { isWebhookConfigured, razorpayMode } from "../lib/razorpay";

/**
 * Setup check: which pieces are ready. Reports only yes/no states, never
 * keys, URLs or data. Open /api/health after deploying.
 */
export default async () => {
  let database: "ok" | "not_configured" | "schema_missing" | "error" = "not_configured";
  let adminAccount = false;
  if (isDatabaseConfigured()) {
    try {
      adminAccount = await hasAdminAccount();
      database = "ok";
    } catch (err) {
      database = isMissingSchema(err) ? "schema_missing" : "error";
      // Log everything (the error's own fields, HTTP status, nested cause and the
      // non-secret Supabase settings) so Netlify's function log shows the real reason.
      console.error(
        `health: database check failed (${database})`,
        JSON.stringify({ error: describeError(err), config: describeSupabaseConfig() }, null, 2),
      );
    }
  }
  const razorpay = razorpayMode();
  return json(
    {
      ok: database === "ok" && adminAccount && razorpay !== "not_configured",
      database,
      adminAccount,
      razorpay,
      razorpayWebhook: isWebhookConfigured() ? "configured" : "not_configured (optional)",
    },
    { status: database === "ok" ? 200 : 503 },
  );
};

export const config: Config = { path: "/api/health" };
