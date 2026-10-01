import type { Config, Context } from "@netlify/functions";
import { isHhmm, isIsoDate } from "../../src/lib/time";
import { maskPhone, normaliseIndianMobile, normalisePatientName } from "../../src/lib/validation";
import { isSlotAvailable } from "../lib/appointments";
import { db, isUniqueViolation, must } from "../lib/db";
import { clientIp, isSameOrigin, json, jsonError, readJsonBody } from "../lib/http";
import { createOrder, isRazorpayConfigured, razorpayKeyId } from "../lib/razorpay";
import { rateLimit } from "../lib/rate-limit";
import { getConsultationFeePaise } from "../lib/settings";

const SLOT_TAKEN = "Sorry, that time was just taken. Please pick another slot.";

/**
 * Step 5 of the booking flow: hold the slot as pending_payment and create the
 * Razorpay order the checkout will charge.
 */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return jsonError(405, "Method not allowed");
  if (!isSameOrigin(req)) return jsonError(403, "Forbidden");
  if (!isRazorpayConfigured()) return jsonError(503, "Online payment is not set up yet. Please call the clinic to book.");

  const body = await readJsonBody(req);
  if (!body) return jsonError(400, "Invalid request.");

  const name = normalisePatientName(body.name);
  const phone = normaliseIndianMobile(body.phone);
  const { service, date, time } = body;
  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Please enter your full name.";
  if (!phone) fieldErrors.phone = "Please enter a valid 10-digit mobile number.";
  if (typeof service !== "string" || !service) fieldErrors.service = "Please choose a service.";
  if (!isIsoDate(date)) fieldErrors.date = "Please choose a date.";
  if (!isHhmm(time)) fieldErrors.time = "Please choose a time.";
  if (!name || !phone || typeof service !== "string" || !isIsoDate(date) || !isHhmm(time)) {
    return jsonError(400, "Please check the highlighted fields.", { fieldErrors });
  }

  try {
    const ip = clientIp(req, context);
    const allowed = (await rateLimit(`book:ip:${ip}`, 6, 600)) && (await rateLimit(`book:phone:${phone}`, 4, 3600));
    if (!allowed) return jsonError(429, "Too many booking attempts. Please try again later or call the clinic.");

    const svc = must(await db().from("services").select("id").eq("name", service).eq("is_active", true).maybeSingle());
    if (!svc) {
      return jsonError(400, "That service is not available for online booking.", { fieldErrors: { service: "Please choose a service." } });
    }

    // A patient who abandoned checkout and is trying again (often for the same
    // slot) shouldn't be blocked by their own earlier, unpaid hold.
    must(
      await db()
        .from("appointments")
        .update({ status: "cancelled", payment_status: "expired" })
        .eq("patient_phone", phone)
        .eq("status", "pending_payment"),
    );

    if (!(await isSlotAvailable(date, time))) return jsonError(409, SLOT_TAKEN, { code: "slot_taken" });

    const amountPaise = await getConsultationFeePaise();

    const inserted = await db()
      .from("appointments")
      .insert({ patient_name: name, patient_phone: phone, service, appointment_date: date, time_slot: time, amount_paise: amountPaise })
      .select("id")
      .single();
    if (inserted.error && isUniqueViolation(inserted.error)) return jsonError(409, SLOT_TAKEN, { code: "slot_taken" });
    const appointmentId = (must(inserted) as { id: string }).id;

    let orderId: string;
    try {
      const order = await createOrder(amountPaise, appointmentId, {
        appointment_id: appointmentId,
        service: service.slice(0, 250),
        slot: `${date} ${time}`,
      });
      orderId = order.id;
      must(await db().from("appointments").update({ razorpay_order_id: orderId }).eq("id", appointmentId));
    } catch (err) {
      // No order means no way to pay - release the slot immediately.
      await db().from("appointments").delete().eq("id", appointmentId).is("razorpay_order_id", null);
      console.error(`Razorpay order failed for ${maskPhone(phone)}`, err);
      return jsonError(502, "We couldn't start the payment. Please try again in a moment.");
    }

    console.info(`Appointment ${appointmentId} held for ${maskPhone(phone)} on ${date} ${time}`);
    return json({
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
};

export const config: Config = { path: "/api/appointments" };
