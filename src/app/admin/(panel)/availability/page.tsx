"use client";

import Link from "next/link";
import { useState } from "react";
import { weekdayNames } from "@/lib/clinic";
import { SLOT_MINUTES } from "@/lib/slots";
import { formatDateLong, formatTime12, fromMinutes, toMinutes } from "@/lib/time";
import { formValues, submitChange, useAdminData, type FlashState } from "../../api";
import { Flash, Loading } from "../../ui";

type Hours = { weekday: number; opensAt: string; closesAt: string; isClosed: boolean };
type Block = { date: string; reason: string | null; wholeDay: boolean; slots: string[]; affected: number };

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function describeSlots(slots: string[]) {
  // Collapse consecutive 30-minute slots into ranges: 13:00, 13:30 -> "1:00 PM - 2:00 PM".
  const sorted = [...slots].sort();
  if (!sorted.length) return "";
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

export default function AvailabilityPage() {
  const { data, error, reload } = useAdminData<{ today: string; hours: Hours[]; blocks: Block[] }>("availability");
  const [flash, setFlash] = useState<FlashState>({});
  const [busy, setBusy] = useState(false);

  async function change(path: string, body: unknown) {
    setBusy(true);
    const ok = await submitChange(path, body, setFlash, reload);
    setBusy(false);
    return ok;
  }

  if (error) return <Flash error={error} />;
  if (!data) return <Loading />;

  function onSaveHours(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = formValues(e.currentTarget);
    const hours = [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
      weekday: wd,
      opensAt: v[`opens_${wd}`] ?? "",
      closesAt: v[`closes_${wd}`] ?? "",
      isClosed: v[`closed_${wd}`] === "on",
    }));
    void change("hours", { hours });
  }

  async function onAddBlock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = formValues(form);
    if (await change("blocks", { date: v.date, wholeDay: v.whole_day === "on", from: v.from, to: v.to, reason: v.reason })) form.reset();
  }

  return (
    <>
      <h1>Availability</h1>
      <Flash ok={flash.ok} error={flash.error} />

      <section className="admin-card" aria-labelledby="weekly-title">
        <h2 id="weekly-title" style={{ marginTop: 0 }}>Weekly clinic hours</h2>
        <p className="caption">Patients can book 30-minute slots between opening and closing time. The last slot starts 30 minutes before closing.</p>
        <form onSubmit={onSaveHours} key={JSON.stringify(data.hours)}>
          <table className="table hours-form">
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col">Closed all day</th></tr>
            </thead>
            <tbody>
              {WEEK_ORDER.map((wd) => {
                const h = data.hours.find((r) => r.weekday === wd);
                if (!h) return null;
                return (
                  <tr key={wd}>
                    <th scope="row">{weekdayNames[wd]}</th>
                    <td><input type="time" step={1800} name={`opens_${wd}`} className="input" defaultValue={h.opensAt} aria-label={`${weekdayNames[wd]} opening time`} /></td>
                    <td><input type="time" step={1800} name={`closes_${wd}`} className="input" defaultValue={h.closesAt} aria-label={`${weekdayNames[wd]} closing time`} /></td>
                    <td><input type="checkbox" name={`closed_${wd}`} defaultChecked={h.isClosed} aria-label={`${weekdayNames[wd]} closed`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="submit" className="btn btn--primary btn--small" style={{ marginTop: 16 }} disabled={busy}>Save weekly hours</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="block-title">
        <h2 id="block-title" style={{ marginTop: 0 }}>Block a date or time</h2>
        <p className="caption">For holidays, the doctor's leave, or a busy afternoon. Existing bookings are not cancelled automatically.</p>
        <form onSubmit={onAddBlock} className="filters">
          <label>Date<input type="date" name="date" className="input" min={data.today} required /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "center" }}>
            <input type="checkbox" name="whole_day" defaultChecked /> Whole day
          </label>
          <label>From<input type="time" step={1800} name="from" className="input" /></label>
          <label>To<input type="time" step={1800} name="to" className="input" /></label>
          <label>Reason (optional)<input name="reason" className="input" maxLength={200} placeholder="e.g. Doctor on leave" /></label>
          <button type="submit" className="btn btn--primary btn--small" disabled={busy}>Block</button>
        </form>
        <p className="caption">To block only part of a day, untick "Whole day" and set From and To.</p>
      </section>

      <section className="admin-card" aria-labelledby="blocked-title">
        <h2 id="blocked-title" style={{ marginTop: 0 }}>Upcoming blocks</h2>
        {data.blocks.length === 0 ? (
          <p className="caption">Nothing blocked.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th scope="col">Date</th><th scope="col">Blocked</th><th scope="col">Reason</th><th scope="col">Existing bookings</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {data.blocks.map((b) => (
                <tr key={`${b.date}-${b.reason ?? ""}`}>
                  <td>{formatDateLong(b.date)}</td>
                  <td className="wrap">{b.wholeDay ? "Whole day" : describeSlots(b.slots)}</td>
                  <td className="wrap">{b.reason ?? "-"}</td>
                  <td>
                    {b.affected > 0 ? (
                      <Link href={`/admin/appointments?from=${b.date}&to=${b.date}`} className="admin-warning">{b.affected} still booked - review</Link>
                    ) : (
                      "None"
                    )}
                  </td>
                  <td>
                    <button className="btn btn--outline btn--small" disabled={busy} onClick={() => change("blocks/delete", { date: b.date, reason: b.reason ?? "" })}>
                      Remove
                    </button>
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
