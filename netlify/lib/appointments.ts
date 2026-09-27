import { availableSlotsForDate, bookingWindow, type BlockedRow, type BookedRow, type HoursRow } from "../../src/lib/slots";
import { db, must } from "./db";
import { fetchOrderPayments, isRazorpayConfigured } from "./razorpay";
import type { Appointment } from "../../src/lib/appointment-types";

export type { Appointment };

export const PENDING_PAYMENT_HOLD_MINUTES = 30;

/**
 * Check-on-read expiry: an unpaid booking holds its slot for 30 minutes, then
 * is cancelled so the slot frees up. Called before anything reads availability,
 * and by the scheduled expire-pending function.
 */
export async function expireStalePendingAppointments() {
  return must(await db().rpc("expire_stale_appointments", { p_hold_minutes: PENDING_PAYMENT_HOLD_MINUTES })) as number;
}

/** Open slots for each of the next 14 days (IST). */
export async function getAvailability(now: Date = new Date()) {
  await expireStalePendingAppointments();
  const days = bookingWindow(now);
  const from = days[0];
  const to = days[days.length - 1];

  const [hours, blocked, booked] = await Promise.all([
    db().from("clinic_hours").select("weekday, opens_at, closes_at, is_closed"),
    db().from("blocked_slots").select("date, time_slot").gte("date", from).lte("date", to),
    db().from("appointments").select("appointment_date, time_slot").gte("appointment_date", from).lte("appointment_date", to).neq("status", "cancelled"),
  ]);
  const hoursRows = must(hours) as HoursRow[];
  const blockedRows = must(blocked) as BlockedRow[];
  const bookedRows = must(booked) as BookedRow[];

  return days.map((date) => ({
    date,
    slots: availableSlotsForDate(date, hoursRows, blockedRows, bookedRows, now),
  }));
}

export async function isSlotAvailable(date: string, time: string, now: Date = new Date()) {
  const days = await getAvailability(now);
  return days.find((d) => d.date === date)?.slots.includes(time) ?? false;
}

export type MarkPaidOutcome =
  | { kind: "confirmed"; appointment: Appointment }
  | { kind: "already_paid"; appointment: Appointment }
  | { kind: "paid_but_slot_lost"; appointment: Appointment }
  | { kind: "not_found" };

/**
 * Records a verified payment (atomically, in the mark_appointment_paid SQL
 * function). Safe to call more than once for the same payment.
 */
export async function markAppointmentPaid(orderId: string, paymentId: string): Promise<MarkPaidOutcome> {
  return must(await db().rpc("mark_appointment_paid", { p_order_id: orderId, p_payment_id: paymentId })) as MarkPaidOutcome;
}

export async function markPaymentFailed(orderId: string) {
  // The patient can retry inside the same Razorpay checkout, so the slot stays
  // held until the normal 30-minute expiry.
  must(
    await db()
      .from("appointments")
      .update({ payment_status: "failed" })
      .eq("razorpay_order_id", orderId)
      .eq("status", "pending_payment")
      .eq("payment_status", "unpaid"),
  );
}

export async function getAppointment(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return must(await db().from("appointments").select("*").eq("id", id).maybeSingle()) as Appointment | null;
}

/** How far back the reconciliation job looks for payments that never reached us. */
const RECONCILE_WINDOW_HOURS = 3;

/**
 * Safety net for a patient who pays and then closes the browser before the
 * checkout callback reaches us. Asks Razorpay directly whether any recent
 * unconfirmed order was actually paid, and records it if so. Works without
 * the webhook being configured.
 */
export async function reconcileRecentPayments() {
  if (!isRazorpayConfigured()) return { checked: 0, recovered: 0 };
  const since = new Date(Date.now() - RECONCILE_WINDOW_HOURS * 3600_000).toISOString();
  const rows = must(
    await db()
      .from("appointments")
      .select("id, razorpay_order_id")
      .not("razorpay_order_id", "is", null)
      .gte("created_at", since)
      .or("status.eq.pending_payment,and(status.eq.cancelled,payment_status.eq.expired)")
      .limit(50),
  ) as { id: string; razorpay_order_id: string }[];

  let recovered = 0;
  for (const row of rows) {
    try {
      const captured = (await fetchOrderPayments(row.razorpay_order_id)).find((p) => p.status === "captured");
      if (!captured) continue;
      const outcome = await markAppointmentPaid(row.razorpay_order_id, captured.id);
      recovered += 1;
      console.info(`Reconciled payment ${captured.id} for appointment ${row.id}: ${outcome.kind}`);
    } catch (err) {
      console.error(`Reconciliation failed for appointment ${row.id}`, err);
    }
  }
  return { checked: rows.length, recovered };
}
