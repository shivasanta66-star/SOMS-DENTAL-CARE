import { describe, expect, it } from "vitest";
import { availableSlotsForDate, bookingWindow, slotsForHours, type HoursRow } from "@/lib/slots";

const allWeek: HoursRow[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opens_at: "10:00:00", closes_at: "20:00:00", is_closed: false }));
// 26 Sep 2026 is a Saturday. 03:30 UTC = 09:00 IST.
const saturdayMorning = new Date("2026-09-26T03:30:00Z");

describe("slotsForHours", () => {
  it("creates 30-minute slots, the last starting 30 minutes before closing", () => {
    const slots = slotsForHours("10:00", "20:00");
    expect(slots).toHaveLength(20);
    expect(slots[0]).toBe("10:00");
    expect(slots.at(-1)).toBe("19:30");
  });
});

describe("availableSlotsForDate", () => {
  it("offers every slot on an open day with nothing booked", () => {
    expect(availableSlotsForDate("2026-09-27", allWeek, [], [], saturdayMorning)).toHaveLength(20);
  });

  it("removes booked and blocked slots", () => {
    const slots = availableSlotsForDate(
      "2026-09-27",
      allWeek,
      [{ date: "2026-09-27", time_slot: "11:00:00" }],
      [{ appointment_date: "2026-09-27", time_slot: "10:30:00" }],
      saturdayMorning,
    );
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("11:00");
    expect(slots).toHaveLength(18);
  });

  it("returns nothing for a whole-day block or a closed weekday", () => {
    expect(availableSlotsForDate("2026-09-27", allWeek, [{ date: "2026-09-27", time_slot: null }], [], saturdayMorning)).toEqual([]);
    const sundayClosed = allWeek.map((h) => (h.weekday === 0 ? { ...h, is_closed: true } : h));
    expect(availableSlotsForDate("2026-09-27", sundayClosed, [], [], saturdayMorning)).toEqual([]);
  });

  it("hides past slots today using IST, with a 30-minute lead time", () => {
    // 08:45 UTC = 14:15 IST, so the first bookable slot is 15:00.
    const slots = availableSlotsForDate("2026-09-26", allWeek, [], [], new Date("2026-09-26T08:45:00Z"));
    expect(slots[0]).toBe("15:00");
  });

  it("uses the IST date, not UTC, just after midnight IST", () => {
    // 19:00 UTC on the 26th is 00:30 IST on the 27th.
    const now = new Date("2026-09-26T19:00:00Z");
    expect(bookingWindow(now)[0]).toBe("2026-09-27");
    expect(availableSlotsForDate("2026-09-26", allWeek, [], [], now)).toEqual([]);
  });

  it("refuses dates outside the 14-day window", () => {
    expect(availableSlotsForDate("2026-10-10", allWeek, [], [], saturdayMorning)).toEqual([]);
    expect(availableSlotsForDate("2026-10-09", allWeek, [], [], saturdayMorning)).toHaveLength(20);
  });
});
