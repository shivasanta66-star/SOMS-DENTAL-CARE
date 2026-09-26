import { NextResponse } from "next/server";
import { isSameOrigin, jsonError } from "@/lib/api";
import { isSlotAvailable } from "@/lib/appointments";
import { isUniqueViolation, query } from "@/lib/db";
import { createOrder, isRazorpayConfigured, razorpayKeyId } from "@/lib/razorpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getConsultationFeePaise } from "@/lib/settings";
import { isHhmm, isIsoDate } from "@/lib/time";
import { maskPhone, normaliseIndianMobile, normalisePatientName } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Step 5 of the booking flow: hold the slot as pending_payment and create the
 * Razorpay order the checkout will charge.
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403, "Forbidden");
  if (!isRazorpayConfigured()) return jsonError(503, "Online payment is not set up yet. Please call the clinic to book.");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request.");
  }

  const name = normalisePatientName(body.name);
  const phone = normaliseIndianMobile(body.phone);
  const { service, date, time } = body;
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Please enter your full name.";
  if (!phone) fieldErrors.phone = "Please enter a valid 10-digit mobile number.";
  if (typeof service !== "string" || !service) fieldErrors.service = "Please choose a service.";
  if (!isIsoDate(date)) fieldErrors.date = "Please choose a date.";
  if (!isHhmm(time)) fieldErrors.time = "Please choose a time.";
  if (Object.keys(fieldErrors).length) return jsonError(400, "Please check the highlighted fields.", { fieldErrors });

  try {
    const ip = clientIp(req.headers);
    const allowed = (await rateLimit(`book:ip:${ip}`, 6, 600)) && (await rateLimit(`book:phone:${phone}`, 4, 3600));
    if (!allowed) return jsonError(429, "Too many booking attempts. Please try again later or call the clinic.");

    const svc = await query("SELECT 1 FROM services WHERE name = $1 AND is_active", [service]);
    if (!svc.rowCount) return jsonError(400, "That service is not available for online booking.", { fieldErrors: { service: "Please choose a service." } });

    // A patient who abandoned checkout and is trying again (often for the same
    // slot) shouldn't be blocked by their own earlier, unpaid hold.
    await query(
      `UPDATE appointments SET status = 'cancelled', payment_status = 'expired', updated_at = now()
        WHERE patient_phone = $1 AND status = 'pending_payment'`,
      [phone],
    );

    if (!(await isSlotAvailable(date as string, time as string))) {
      return jsonError(409, "Sorry, that time was just taken. Please pick another slot.", { code: "slot_taken" });
    }

    const amountPaise = await getConsultationFeePaise();

    let appointmentId: string;
    try {
      const { rows } = await query<{ id: string }>(
        `INSERT INTO appointments (patient_name, patient_phone, service, appointment_date, time_slot, amount_paise)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [name, phone, service, date, time, amountPaise],
      );
      appointmentId = rows[0].id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        return jsonError(409, "Sorry, that time was just taken. Please pick another slot.", { code: "slot_taken" });
      }
      throw err;
    }

    let orderId: string;
    try {
      const order = await createOrder(amountPaise, appointmentId, {
        appointment_id: appointmentId,
        service: String(service).slice(0, 250),
        slot: `${date} ${time}`,
      });
      orderId = order.id;
      await query("UPDATE appointments SET razorpay_order_id = $2, updated_at = now() WHERE id = $1", [appointmentId, orderId]);
    } catch (err) {
      // No order means no way to pay - release the slot immediately.
      await query("DELETE FROM appointments WHERE id = $1 AND razorpay_order_id IS NULL", [appointmentId]);
      console.error(`Razorpay order failed for ${maskPhone(phone!)}`, err);
      return jsonError(502, "We couldn't start the payment. Please try again in a moment.");
    }

    console.info(`Appointment ${appointmentId} held for ${maskPhone(phone!)} on ${date} ${time}`);
    return NextResponse.json({
      appointmentId,
      orderId,
      amountPaise,
      currency: "INR",
      keyId: razorpayKeyId(),
      prefill: { name, contact: `+91${phone}` },
    });
  } catch (err) {
    console.error("create appointment failed", err);
    return jsonError(500, "Something went wrong. Please try again or call the clinic.");
  }
}
