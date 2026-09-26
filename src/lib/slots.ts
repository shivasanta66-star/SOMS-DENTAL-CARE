// Pure slot calculation, shared by the public availability API and booking
// validation so both always agree on what "open" means.
import { addDays, fromMinutes, hhmm, istNow, toMinutes, weekdayOf } from "./time";

export const SLOT_MINUTES = 30;
export const BOOKING_WINDOW_DAYS = 14;
/** Same-day bookings must start at least this far in the future. */
export const MIN_LEAD_MINUTES = 30;

export type HoursRow = { weekday: number; opens_at: string; closes_at: string; is_closed: boolean };
export type BlockedRow = { date: string; time_slot: string | null };
export type BookedRow = { appointment_date: string; time_slot: string };

/** Every slot start between opening and closing, e.g. 10:00 ... 19:30 for 10-8. */
export function slotsForHours(opensAt: string, closesAt: string) {
  const out: string[] = [];
  for (let t = toMinutes(opensAt); t + SLOT_MINUTES <= toMinutes(closesAt); t += SLOT_MINUTES) {
    out.push(fromMinutes(t));
  }
  return out;
}

export function availableSlotsForDate(
  date: string,
  hours: HoursRow[],
  blocked: BlockedRow[],
  booked: BookedRow[],
  now: Date = new Date(),
) {
  const today = istNow(now);
  if (date < today.date || date > addDays(today.date, BOOKING_WINDOW_DAYS - 1)) return [];

  const day = hours.find((h) => h.weekday === weekdayOf(date));
  if (!day || day.is_closed) return [];

  const blockedToday = blocked.filter((b) => b.date === date);
  if (blockedToday.some((b) => b.time_slot === null)) return [];
  const blockedTimes = new Set(blockedToday.map((b) => hhmm(b.time_slot as string)));
  const bookedTimes = new Set(booked.filter((b) => b.appointment_date === date).map((b) => hhmm(b.time_slot)));

  return slotsForHours(day.opens_at, day.closes_at).filter((slot) => {
    if (blockedTimes.has(slot) || bookedTimes.has(slot)) return false;
    if (date === today.date && toMinutes(slot) < today.minutes + MIN_LEAD_MINUTES) return false;
    return true;
  });
}

export function bookingWindow(now: Date = new Date()) {
  const start = istNow(now).date;
  return Array.from({ length: BOOKING_WINDOW_DAYS }, (_, i) => addDays(start, i));
}
