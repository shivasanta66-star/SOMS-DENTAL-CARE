import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/api";
import { markAppointmentPaid } from "@/lib/appointments";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { hhmm } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Step 6: Razorpay Checkout's success handler posts here. The signature is
 * checked server-side - nothing the browser says is trusted on its own.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "Forbidden");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (typeof orderId !== "string" || typeof paymentId !== "string" || typeof signature !== "string") {
    return jsonError(400, "Invalid request.");
  }

  try {
    if (!(await rateLimit(`verify:${clientIp(req.headers)}`, 20, 600))) return jsonError(429, "Too many requests.");
    if (!verifyPaymentSignature(orderId, paymentId, signature)) {
      console.warn(`Rejected payment verification with a bad signature for order ${orderId}`);
      return jsonError(400, "We could not verify this payment. If money was deducted, please call the clinic.");
    }

    const outcome = await markAppointmentPaid(orderId, paymentId);
    if (outcome.kind === "not_found") return jsonError(404, "Booking not found. Please call the clinic.");

    const a = outcome.appointment;
    return NextResponse.json({
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
}
