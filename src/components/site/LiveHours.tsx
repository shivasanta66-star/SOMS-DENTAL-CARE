"use client";

// Opening hours on the public page. The static page is built with the hours
// from Supabase at deploy time, then refreshed from /api/hours in the browser
// so edits made in the admin panel show up without a redeploy.
import { createContext, useContext, useEffect, useState } from "react";
import { weekdayNames } from "@/lib/clinic";
import { formatTime12, istNow, weekdayOf } from "@/lib/time";

export type PublicHours = { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];

// Monday first, as clinics usually list hours.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const HoursContext = createContext<PublicHours>([]);

export function HoursProvider({ initial, children }: { initial: PublicHours; children: React.ReactNode }) {
  const [hours, setHours] = useState(initial);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/hours")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hours?: PublicHours } | null) => {
        if (!cancelled && data?.hours?.length === 7) setHours(data.hours);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return <HoursContext.Provider value={hours}>{children}</HoursContext.Provider>;
}

function hoursLabel(h: PublicHours[number]) {
  return h.isClosed ? "Closed" : `${formatTime12(h.opensAt)} - ${formatTime12(h.closesAt)}`;
}

export function hoursSummaryText(hours: PublicHours) {
  const first = hours[0];
  if (!first) return "See opening hours below";
  const allSame = hours.every((h) => h.isClosed === first.isClosed && h.opensAt === first.opensAt && h.closesAt === first.closesAt);
  return allSame && !first.isClosed ? `Open every day, ${hoursLabel(first)}` : "See opening hours below";
}

export function HoursSummary() {
  return <>{hoursSummaryText(useContext(HoursContext))}</>;
}

export function HoursTable() {
  const hours = useContext(HoursContext);
  // "Today" depends on when the page is viewed, not when it was built.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(weekdayOf(istNow().date)), []);
  return (
    <table className="hours">
      <caption className="sr-only">Opening hours by day</caption>
      <tbody>
        {WEEK_ORDER.map((wd) => {
          const h = hours.find((x) => x.weekday === wd);
          if (!h) return null;
          return (
            <tr key={wd} data-today={wd === today}>
              <th scope="row">{weekdayNames[wd]}{wd === today && <span className="sr-only"> (today)</span>}</th>
              <td>{hoursLabel(h)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
