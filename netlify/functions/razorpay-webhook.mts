import type { Config } from "@netlify/functions";
import { markAppointmentPaid, markPaymentFailed } from "../lib/appointments";
import { db, must } from "../lib/db";
import { json } from "../lib/http";
import { isWebhookConfigured, verifyWebhookSignature } from "../lib/razorpay";

type Entity = { id?: string; order_id?: string; payment_id?: string; status?: string };
type WebhookEvent = {
  event?: string;
  payload?: { payment?: { entity?: Entity }; refund?: { entity?: Entity } };
};

/**
 * Optional, faster backup confirmation path. If the patient closes the browser
 * right after paying, the checkout callback never reaches us but this webhook
 * does. Needs RAZORPAY_WEBHOOK_SECRET; without it the scheduled
 * expire-pending function still recovers such payments within 10 minutes.
 */
export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, { status: 405 });
  if (!isWebhookConfigured()) return json({ error: "webhook not configured" }, { status: 503 });

  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return json({ error: "invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: "invalid body" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const refund = event.payload?.refund?.entity;
  try {
    switch (event.event) {
      case "payment.captured":
      case "order.paid":
        if (payment?.order_id && payment.id) {
          const outcome = await markAppointmentPaid(payment.order_id, payment.id);
          if (outcome.kind === "paid_but_slot_lost") {
            console.warn(`Payment ${payment.id} arrived after its slot was re-booked; appointment ${outcome.appointment.id} needs a refund decision.`);
          }
        }
        break;
      case "payment.failed":
        if (payment?.order_id) await markPaymentFailed(payment.order_id);
        break;
      case "refund.processed":
        if (refund?.payment_id) {
          must(await db().from("appointments").update({ payment_status: "refunded" }).eq("razorpay_payment_id", refund.payment_id));
          if (refund.id) {
            must(
              await db().from("appointments").update({ razorpay_refund_id: refund.id }).eq("razorpay_payment_id", refund.payment_id).is("razorpay_refund_id", null),
            );
          }
        }
        break;
      case "refund.failed":
        if (refund?.payment_id) {
          must(
            await db()
              .from("appointments")
              .update({ payment_status: "paid" })
              .eq("razorpay_payment_id", refund.payment_id)
              .eq("payment_status", "refund_pending"),
          );
        }
        break;
    }
  } catch (err) {
    console.error(`webhook ${event.event} failed`, err);
    // Non-2xx makes Razorpay retry later, which is what we want on a DB error.
    return json({ error: "processing failed" }, { status: 500 });
  }
  return json({ ok: true });
};

export const config: Config = { path: "/api/razorpay/webhook" };
