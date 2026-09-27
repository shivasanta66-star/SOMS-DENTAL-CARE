import type { Config } from "@netlify/functions";
import { hasAdminAccount } from "../lib/auth";
import { isDatabaseConfigured, isMissingSchema } from "../lib/db";
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
      if (database === "error") console.error("health: database check failed", err);
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
