import { describe, expect, it } from "vitest";
import { googleCalendarUrl, icsFile } from "@/lib/calendar";

const event = { date: "2026-09-27", time: "10:30", title: "Dental appointment", details: "Root canal", location: "Umerkote, Odisha" };

describe("calendar links", () => {
  it("converts IST slot times to UTC", () => {
    const url = new URL(googleCalendarUrl(event));
    // 10:30 IST = 05:00 UTC; 30-minute appointment.
    expect(url.searchParams.get("dates")).toBe("20260927T050000Z/20260927T053000Z");
  });

  it("builds a valid ICS file with escaped text", () => {
    const ics = icsFile({ ...event, location: "Jharigaon, Umerkote; Odisha", uid: "x@y" });
    expect(ics).toContain("DTSTART:20260927T050000Z");
    expect(ics).toContain("LOCATION:Jharigaon\\, Umerkote\; Odisha");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
