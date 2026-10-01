import { DEFAULT_BOOKING_WINDOW_DAYS, MAX_BOOKING_WINDOW_DAYS, MIN_BOOKING_WINDOW_DAYS } from "../../src/lib/slots";
import { db, must } from "./db";

export const DEFAULT_FEE_PAISE = 20000;

export async function getConsultationFeePaise() {
  const row = must(await db().from("settings").select("value").eq("key", "consultation_fee_paise").maybeSingle()) as { value: string } | null;
  const fee = Number(row?.value);
  return Number.isInteger(fee) && fee >= 100 ? fee : DEFAULT_FEE_PAISE;
}

export async function setConsultationFeePaise(paise: number) {
  must(await db().from("settings").upsert({ key: "consultation_fee_paise", value: String(paise) }, { onConflict: "key" }));
}

export function isValidBookingWindowDays(days: number) {
  return Number.isInteger(days) && days >= MIN_BOOKING_WINDOW_DAYS && days <= MAX_BOOKING_WINDOW_DAYS;
}

/** How many days ahead patients can book. Falls back to 30 if unset or invalid. */
export async function getBookingWindowDays() {
  const row = must(await db().from("settings").select("value").eq("key", "booking_window_days").maybeSingle()) as { value: string } | null;
  const days = Number(row?.value);
  return isValidBookingWindowDays(days) ? days : DEFAULT_BOOKING_WINDOW_DAYS;
}

export async function setBookingWindowDays(days: number) {
  must(await db().from("settings").upsert({ key: "booking_window_days", value: String(days) }, { onConflict: "key" }));
}
