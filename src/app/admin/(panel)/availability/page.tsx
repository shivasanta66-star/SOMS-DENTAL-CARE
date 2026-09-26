import { requireAdmin } from "@/lib/auth";
import { weekdayNames } from "@/lib/clinic";
import { query } from "@/lib/db";
import { SLOT_MINUTES } from "@/lib/slots";
import { formatDateLong, formatTime12, fromMinutes, hhmm, istNow, toMinutes } from "@/lib/time";
import { addBlockAction, deleteBlockAction, saveHoursAction } from "../../actions";
import { Flash } from "../../ui";

type Block = { date: string; reason: string | null; whole_day: boolean; slots: string[] | null; affected: number };

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function describeSlots(slots: string[]) {
  // Collapse consecutive 30-minute slots into ranges: 13:00, 13:30 -> "1:00 PM - 2:00 PM".
  const sorted = slots.map(hhmm).sort();
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const s of [...sorted.slice(1), null]) {
    if (s && toMinutes(s) === toMinutes(prev) + SLOT_MINUTES) {
      prev = s;
      continue;
    }
    ranges.push(`${formatTime12(start)} - ${formatTime12(fromMinutes(toMinutes(prev) + SLOT_MINUTES))}`);
    if (s) start = prev = s;
  }
  return ranges.join(", ");
}

export default async function AvailabilityPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = istNow().date;

  const [hours, blocks] = await Promise.all([
    query<{ weekday: number; opens_at: string; closes_at: string; is_closed: boolean }>("SELECT * FROM clinic_hours ORDER BY weekday"),
    query<Block>(
      `SELECT b.date, b.reason,
              bool_or(b.time_slot IS NULL) AS whole_day,
              array_agg(b.time_slot::text) FILTER (WHERE b.time_slot IS NOT NULL) AS slots,
              (SELECT count(*)::int FROM appointments a
                WHERE a.appointment_date = b.date AND a.status IN ('confirmed', 'pending_payment')
                  AND (bool_or(b.time_slot IS NULL) OR a.time_slot = ANY(array_agg(b.time_slot)))) AS affected
         FROM blocked_slots b
        WHERE b.date >= $1
        GROUP BY b.date, b.reason
        ORDER BY b.date`,
      [today],
    ),
  ]);

  return (
    <>
      <h1>Availability</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <section className="admin-card" aria-labelledby="weekly-title">
        <h2 id="weekly-title" style={{ marginTop: 0 }}>Weekly clinic hours</h2>
        <p className="caption">Patients can book 30-minute slots between opening and closing time. The last slot starts 30 minutes before closing.</p>
        <form action={saveHoursAction}>
          <table className="table hours-form">
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col">Closed all day</th></tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((wd) => {
                const h = hours.rows.find((r) => r.weekday === wd)!;
                return (
                  <tr key={wd}>
                    <th scope="row">{weekdayNames[wd]}</th>
                    <td><input type="time" step={1800} name={`opens_${wd}`} className="input" defaultValue={hhmm(h.opens_at)} aria-label={`${weekdayNames[wd]} opening time`} /></td>
                    <td><input type="time" step={1800} name={`closes_${wd}`} className="input" defaultValue={hhmm(h.closes_at)} aria-label={`${weekdayNames[wd]} closing time`} /></td>
                    <td><input type="checkbox" name={`closed_${wd}`} defaultChecked={h.is_closed} aria-label={`${weekdayNames[wd]} closed`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="submit" className="btn btn--primary btn--small" style={{ marginTop: 16 }}>Save weekly hours</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="block-title">
        <h2 id="block-title" style={{ marginTop: 0 }}>Block a date or time</h2>
        <p className="caption">For holidays, the doctor's leave, or a busy afternoon. Existing bookings are not cancelled automatically.</p>
        <form action={addBlockAction} className="filters">
          <label>Date<input type="date" name="date" className="input" min={today} required /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center" }}>
            <input type="checkbox" name="whole_day" defaultChecked /> Whole day
          </label>
          <label>From<input type="time" step={1800} name="from" className="input" /></label>
          <label>To<input type="time" step={1800} name="to" className="input" /></label>
          <label>Reason (optional)<input name="reason" className="input" maxLength={200} placeholder="e.g. Doctor on leave" /></label>
          <button type="submit" className="btn btn--primary btn--small">Block</button>
        </form>
        <p className="caption">To block only part of a day, untick "Whole day" and set From and To.</p>
      </section>

      <section className="admin-card" aria-labelledby="blocked-title">
        <h2 id="blocked-title" style={{ marginTop: 0 }}>Upcoming blocks</h2>
        {blocks.rows.length === 0 ? (
          <p className="caption">Nothing blocked.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th scope="col">Date</th><th scope="col">Blocked</th><th scope="col">Reason</th><th scope="col">Existing bookings</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {blocks.rows.map((b) => (
                <tr key={`${b.date}-${b.reason ?? ""}`}>
                  <td>{formatDateLong(b.date)}</td>
                  <td className="wrap">{b.whole_day ? "Whole day" : describeSlots(b.slots ?? [])}</td>
                  <td className="wrap">{b.reason ?? "-"}</td>
                  <td>
                    {b.affected > 0 ? (
                      <a href={`/admin/appointments?from=${b.date}&to=${b.date}`} className="admin-warning">{b.affected} still booked - review</a>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td>
                    <form action={deleteBlockAction} className="inline-form">
                      <input type="hidden" name="date" value={b.date} />
                      <input type="hidden" name="reason" value={b.reason ?? ""} />
                      <button className="btn btn--outline btn--small">Remove</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
