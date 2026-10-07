import type { Config, Context } from "@netlify/functions";
import { hhmm } from "../../src/lib/time";
import { markAppointmentPaid } from "../lib/appointments";
import { clientIp, isSameOrigin, json, jsonError, readJsonBody } from "../lib/http";
import { verifyPaymentSignature } from "../lib/razorpay";
import { rateLimit } from "../lib/rate-limit";

/**
 * Step 6: Razorpay Checkout's success handler posts here. The signature is
 * checked server-side - nothing the browser says is trusted on its own.
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonError(405, "Method not allowed");
  if (!isSameOrigin(req)) return jsonError(403, "Forbidden");
  const body = await readJsonBody(req);
  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return jsonError(400, "Invalid request.");
  }

  try {
    if (!(await rateLimit(`verify:${clientIp(req, context)}`, 20, 600))) return jsonError(429, "Too many requests.");
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      console.warn(`Rejected payment verification with a bad signature for order ${orderId}`);
      return jsonError(400, "We could not verify this payment. If money was deducted, please call the clinic.");
    }

    const outcome = await markAppointmentPaid(orderId, paymentId);
    if (outcome.kind === "not_found") return jsonError(404, "Booking not found. Please call the clinic.");

    const a = outcome.appointment;
    return json({
      outcome: outcome.kind,
      appointment: {
        service: a.service,
        date: a.appointment_date,
        time: hhmm(a.time_slot),
        amountPaise: a.amount_paise,
        paymentId: a.razorpay_payment_id,
      },
    });
  } catch (err) {
    console.error("verify payment failed", err);
    return jsonError(500, "Your payment went through but we couldn't confirm it here. Please call the clinic.");
  }
};

export const config: Config = { path: "/api/appointments/verify" };
