import Link from "next/link";
import { expireStalePendingAppointments, type Appointment } from "@/lib/appointments";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { istNow, isIsoDate } from "@/lib/time";
import { AppointmentTable, Flash } from "../../ui";

const STATUSES = ["pending_payment", "confirmed", "completed", "cancelled", "no_show"] as const;
const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "past", label: "Past" },
  { key: "refunds", label: "Refund decisions" },
  { key: "all", label: "All" },
] as const;

type Search = { view?: string; from?: string; to?: string; status?: string; error?: string };

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin();
  await expireStalePendingAppointments();
  const sp = await searchParams;
  const today = istNow().date;
  const custom = isIsoDate(sp.from) || isIsoDate(sp.to) || (sp.status && STATUSES.includes(sp.status as (typeof STATUSES)[number]));
  const view = custom ? "custom" : (VIEWS.find((v) => v.key === sp.view)?.key ?? "upcoming");

  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };
  let order = "appointment_date, time_slot";

  if (view === "upcoming") {
    add("appointment_date >= ?", today);
    where.push("status <> 'cancelled'");
  } else if (view === "today") {
    add("appointment_date = ?", today);
  } else if (view === "past") {
    add("appointment_date < ?", today);
    order = "appointment_date DESC, time_slot DESC";
  } else if (view === "refunds") {
    where.push("status = 'cancelled' AND payment_status = 'paid'");
  } else if (view === "custom") {
    if (isIsoDate(sp.from)) add("appointment_date >= ?", sp.from);
    if (isIsoDate(sp.to)) add("appointment_date <= ?", sp.to);
    if (sp.status && STATUSES.includes(sp.status as (typeof STATUSES)[number])) add("status = ?", sp.status);
  } else {
    order = "appointment_date DESC, time_slot DESC";
  }

  const { rows } = await query<Appointment>(
    `SELECT * FROM appointments ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY ${order} LIMIT 500`,
    params,
  );

  return (
    <>
      <h1>Appointments</h1>
      <Flash error={sp.error} />
      <div className="chips" role="navigation" aria-label="Quick views">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/admin/appointments?view=${v.key}`} aria-current={view === v.key ? "true" : undefined}>{v.label}</Link>
        ))}
      </div>
      <form className="filters" method="get">
        <label>From<input type="date" name="from" className="input" defaultValue={isIsoDate(sp.from) ? sp.from : ""} /></label>
        <label>To<input type="date" name="to" className="input" defaultValue={isIsoDate(sp.to) ? sp.to : ""} /></label>
        <label>
          Status
          <select name="status" className="select" defaultValue={sp.status ?? ""}>
            <option value="">Any status</option>
            <option value="pending_payment">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary btn--small">Filter</button>
        {view === "custom" && <Link href="/admin/appointments">Clear</Link>}
      </form>
      <div className="admin-card">
        <AppointmentTable rows={rows} empty="No appointments match." />
        {rows.length === 500 && <p className="caption">Showing the first 500. Narrow the dates to see more.</p>}
      </div>
    </>
  );
}
