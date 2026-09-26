import Link from "next/link";
import { expireStalePendingAppointments, type Appointment } from "@/lib/appointments";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addDays, formatDateLong, fromMinutes, istNow, weekdayOf } from "@/lib/time";
import { AppointmentTable } from "../ui";

export default async function DashboardPage() {
  await requireAdmin();
  await expireStalePendingAppointments();
  const now = istNow();
  const today = now.date;
  // Rest of this week, Monday-Sunday.
  const sunday = addDays(today, (7 - weekdayOf(today)) % 7);

  const [todayRows, weekCount, refundCount, pendingCount] = await Promise.all([
    query<Appointment>(
      `SELECT * FROM appointments WHERE appointment_date = $1 AND status <> 'cancelled' ORDER BY time_slot`,
      [today],
    ),
    query<{ n: number }>(
      `SELECT count(*)::int AS n FROM appointments
        WHERE status = 'confirmed' AND appointment_date BETWEEN $1 AND $2
          AND (appointment_date > $1 OR time_slot >= $3::time)`,
      [today, sunday, fromMinutes(now.minutes)],
    ),
    query<{ n: number }>(`SELECT count(*)::int AS n FROM appointments WHERE status = 'cancelled' AND payment_status = 'paid'`),
    query<{ n: number }>(`SELECT count(*)::int AS n FROM appointments WHERE status = 'pending_payment'`),
  ]);

  return (
    <>
      <h1>Today, {formatDateLong(today)}</h1>
      <div className="stats">
        <div className="stat">
          <div className="stat__value">{todayRows.rows.filter((a) => a.status === "confirmed").length}</div>
          <div className="stat__label">Confirmed today</div>
        </div>
        <div className="stat">
          <div className="stat__value">{weekCount.rows[0].n}</div>
          <div className="stat__label">Upcoming confirmed this week (to Sunday)</div>
        </div>
        <div className="stat">
          <div className="stat__value">{pendingCount.rows[0].n}</div>
          <div className="stat__label">Awaiting payment (held 30 min)</div>
        </div>
        {refundCount.rows[0].n > 0 && (
          <Link href="/admin/appointments?view=refunds" className="stat stat--alert" style={{ textDecoration: "none" }}>
            <div className="stat__value">{refundCount.rows[0].n}</div>
            <div className="stat__label">Cancelled but still paid: decide on refund</div>
          </Link>
        )}
      </div>

      <section className="admin-card" aria-labelledby="today-title">
        <h2 id="today-title" style={{ marginTop: 0 }}>Today's appointments</h2>
        <AppointmentTable rows={todayRows.rows} empty="No appointments booked for today yet." />
      </section>
      <p><Link href="/admin/appointments">See all upcoming appointments</Link></p>
    </>
  );
}
