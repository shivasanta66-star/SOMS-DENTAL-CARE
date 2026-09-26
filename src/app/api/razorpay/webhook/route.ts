import { NextResponse } from "next/server";
import { markAppointmentPaid, markPaymentFailed } from "@/lib/appointments";
import { query } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type Entity = { id?: string; order_id?: string; payment_id?: string; status?: string };
type WebhookEvent = {
  event?: string;
  payload?: { payment?: { entity?: Entity }; refund?: { entity?: Entity } };
};

/**
 * Backup confirmation path: if the patient closes the browser right after
 * paying, the checkout callback never reaches us, but this webhook still does.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
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
          await query(
            `UPDATE appointments SET payment_status = 'refunded', razorpay_refund_id = COALESCE(razorpay_refund_id, $2), updated_at = now()
              WHERE razorpay_payment_id = $1`,
            [refund.payment_id, refund.id ?? null],
          );
        }
        break;
      case "refund.failed":
        if (refund?.payment_id) {
          await query(
            `UPDATE appointments SET payment_status = 'paid', updated_at = now()
              WHERE razorpay_payment_id = $1 AND payment_status = 'refund_pending'`,
            [refund.payment_id],
          );
        }
        break;
    }
  } catch (err) {
    console.error(`webhook ${event.event} failed`, err);
    // Non-2xx makes Razorpay retry later, which is what we want on a DB error.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
