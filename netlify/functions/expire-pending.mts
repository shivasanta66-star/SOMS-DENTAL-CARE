import type { Config } from "@netlify/functions";
import { expireStalePendingAppointments, reconcileRecentPayments } from "../lib/appointments";

/**
 * Scheduled every 10 minutes:
 *  1. Releases slots held by unpaid bookings older than 30 minutes (reads also
 *     do this on demand, so a slot frees up on time even between runs).
 *  2. Asks Razorpay whether any recent unconfirmed order was actually paid
 *     (patient closed the browser mid-redirect) and confirms it.
 */
export default async () => {
  try {
    const expired = await expireStalePendingAppointments();
    const { checked, recovered } = await reconcileRecentPayments();
    if (expired || recovered) console.info(`expire-pending: released ${expired} hold(s), recovered ${recovered} of ${checked} checked payment(s)`);
  } catch (err) {
    console.error("expire-pending failed", err);
  }
};

export const config: Config = { schedule: "*/10 * * * *" };
