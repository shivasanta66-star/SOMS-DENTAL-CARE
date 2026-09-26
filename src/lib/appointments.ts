import "server-only";
import { query, withTransaction } from "./db";
import { availableSlotsForDate, bookingWindow, type BlockedRow, type BookedRow, type HoursRow } from "./slots";

export const PENDING_PAYMENT_HOLD_MINUTES = 30;

export type AppointmentStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "expired" | "refund_pending" | "refunded";

export type Appointment = {
  id: string;
  patient_name: string;
  patient_phone: string;
  service: string;
  appointment_date: string;
  time_slot: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_refund_id: string | null;
  amount_paise: number;
  created_at: Date;
  updated_at: Date;
};

/**
 * Check-on-read expiry: an unpaid booking holds its slot for 30 minutes, then
 * is cancelled so the slot frees up. Called before anything reads availability.
 */
export async function expireStalePendingAppointments() {
  await query(
    `UPDATE appointments
        SET status = 'cancelled',
            payment_status = CASE WHEN payment_status = 'unpaid' OR payment_status = 'failed' THEN 'expired' ELSE payment_status END,
            updated_at = now()
      WHERE status = 'pending_payment'
        AND created_at < now() - make_interval(mins => $1)`,
    [PENDING_PAYMENT_HOLD_MINUTES],
  );
}

/** Open slots for each of the next 14 days (IST). */
export async function getAvailability(now: Date = new Date()) {
  await expireStalePendingAppointments();
  const days = bookingWindow(now);
  const from = days[0];
  const to = days[days.length - 1];

  const [hours, blocked, booked] = await Promise.all([
    query<HoursRow>("SELECT weekday, opens_at, closes_at, is_closed FROM clinic_hours"),
    query<BlockedRow>("SELECT date, time_slot FROM blocked_slots WHERE date BETWEEN $1 AND $2", [from, to]),
    query<BookedRow>(
      `SELECT appointment_date, time_slot FROM appointments
        WHERE appointment_date BETWEEN $1 AND $2 AND status <> 'cancelled'`,
      [from, to],
    ),
  ]);

  return days.map((date) => ({
    date,
    slots: availableSlotsForDate(date, hours.rows, blocked.rows, booked.rows, now),
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
 * Records a verified payment. Safe to call more than once for the same payment
 * (the checkout callback and the webhook usually both arrive).
 */
export async function markAppointmentPaid(orderId: string, paymentId: string): Promise<MarkPaidOutcome> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<Appointment>(
      "SELECT * FROM appointments WHERE razorpay_order_id = $1 FOR UPDATE",
      [orderId],
    );
    const appt = rows[0];
    if (!appt) return { kind: "not_found" };

    if (appt.payment_status === "paid" || appt.payment_status === "refund_pending" || appt.payment_status === "refunded") {
      return appt.status === "cancelled"
        ? { kind: "paid_but_slot_lost", appointment: appt }
        : { kind: "already_paid", appointment: appt };
    }

    // A cancelled + expired row means the 30-minute hold lapsed (or the patient
    // started a fresh booking) before this payment landed. Try to give the
    // patient the slot back; if someone else has taken it, keep the payment on
    // record so the clinic can refund it. A booking the clinic cancelled on
    // purpose is never revived.
    const revivable = appt.status === "pending_payment" || (appt.status === "cancelled" && appt.payment_status === "expired");
    if (revivable) {
      await client.query("SAVEPOINT reconfirm");
      try {
        const updated = await client.query<Appointment>(
          `UPDATE appointments
              SET status = 'confirmed', payment_status = 'paid', razorpay_payment_id = $2, updated_at = now()
            WHERE id = $1 RETURNING *`,
          [appt.id, paymentId],
        );
        return { kind: "confirmed", appointment: updated.rows[0] };
      } catch (err) {
        await client.query("ROLLBACK TO SAVEPOINT reconfirm");
        if ((err as { code?: string }).code !== "23505") throw err;
      }
    }

    const updated = await client.query<Appointment>(
      `UPDATE appointments
          SET payment_status = 'paid', razorpay_payment_id = $2, updated_at = now()
        WHERE id = $1 RETURNING *`,
      [appt.id, paymentId],
    );
    const appointment = updated.rows[0];
    return appointment.status === "cancelled"
      ? { kind: "paid_but_slot_lost", appointment }
      : { kind: "already_paid", appointment };
  });
}

export async function markPaymentFailed(orderId: string) {
  // The patient can retry inside the same Razorpay checkout, so the slot stays
  // held until the normal 30-minute expiry.
  await query(
    `UPDATE appointments SET payment_status = 'failed', updated_at = now()
      WHERE razorpay_order_id = $1 AND status = 'pending_payment' AND payment_status = 'unpaid'`,
    [orderId],
  );
}

export async function getAppointment(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await query<Appointment>("SELECT * FROM appointments WHERE id = $1", [id]);
  return rows[0] ?? null;
}
