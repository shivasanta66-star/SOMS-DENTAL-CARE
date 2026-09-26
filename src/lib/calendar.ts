// "Save to calendar" links for a confirmed appointment (times are IST).
import { SLOT_MINUTES } from "./slots";
import { toMinutes } from "./time";

const IST_OFFSET_MINUTES = 330;

function utcStamp(date: string, time: string, plusMinutes = 0) {
  const [y, m, d] = date.split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d, 0, toMinutes(time) + plusMinutes - IST_OFFSET_MINUTES);
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

type CalendarEvent = { date: string; time: string; title: string; details: string; location: string };

export function googleCalendarUrl(e: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${utcStamp(e.date, e.time)}/${utcStamp(e.date, e.time, SLOT_MINUTES)}`,
    details: e.details,
    location: e.location,
    ctz: "Asia/Kolkata",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function icsFile(e: CalendarEvent & { uid: string }) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SOMS Dental Care//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART:${utcStamp(e.date, e.time)}`,
    `DTEND:${utcStamp(e.date, e.time, SLOT_MINUTES)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    `DESCRIPTION:${icsEscape(e.details)}`,
    `LOCATION:${icsEscape(e.location)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
