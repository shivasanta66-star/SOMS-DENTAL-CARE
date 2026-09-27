import type { Config, Context } from "@netlify/functions";
import { SLOT_MINUTES } from "../../src/lib/slots";
import { addDays, fromMinutes, hhmm, isHhmm, isIsoDate, istNow, toMinutes, weekdayOf } from "../../src/lib/time";
import { expireStalePendingAppointments, getAppointment } from "../lib/appointments";
import { changePassword, endSession, getAdmin, startSession, verifyCredentials, type Admin } from "../lib/auth";
import { db, isUniqueViolation, must, mustCount } from "../lib/db";
import { clientIp, isSameOrigin, json, jsonError, readJsonBody } from "../lib/http";
import { isWebhookConfigured, razorpayMode, refundPayment } from "../lib/razorpay";
import { rateLimit } from "../lib/rate-limit";
import { getConsultationFeePaise, setConsultationFeePaise } from "../lib/settings";

/*
 * Admin API, all behind the session cookie set by POST /api/admin/login.
 * Responses use short codes ({ ok: "saved" } / { error: "duplicate" }) that the
 * admin pages turn into messages.
 */

type Body = Record<string, unknown>;
type Handler = (ctx: { req: Request; context: Context; admin: Admin; body: Body; params: string[]; url: URL }) => Promise<Response>;

const ok = (code: string, extra: Record<string, unknown> = {}) => json({ ok: code, ...extra });
const fail = (status: number, code: string) => json({ error: code }, { status });
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const STATUSES = ["pending_payment", "confirmed", "completed", "cancelled", "no_show"] as const;

// ---------- Dashboard ----------

const dashboard: Handler = async () => {
  await expireStalePendingAppointments();
  const now = istNow();
  const today = now.date;
  // Rest of this week, to Sunday.
  const sunday = addDays(today, (7 - weekdayOf(today)) % 7);
  const nowTime = fromMinutes(now.minutes);

  const [todayRows, week, refunds, pending] = await Promise.all([
    db().from("appointments").select("*").eq("appointment_date", today).neq("status", "cancelled").order("time_slot"),
    db().from("appointments").select("appointment_date, time_slot").eq("status", "confirmed").gte("appointment_date", today).lte("appointment_date", sunday),
    db().from("appointments").select("id", { count: "exact", head: true }).eq("status", "cancelled").eq("payment_status", "paid"),
    db().from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending_payment"),
  ]);
  const weekRows = must(week) as { appointment_date: string; time_slot: string }[];
  return json({
    today,
    todayAppointments: must(todayRows),
    upcomingThisWeek: weekRows.filter((r) => r.appointment_date > today || hhmm(r.time_slot) >= nowTime).length,
    refundDecisions: mustCount(refunds),
    awaitingPayment: mustCount(pending),
  });
};

// ---------- Appointments ----------

const listAppointments: Handler = async ({ url }) => {
  await expireStalePendingAppointments();
  const sp = url.searchParams;
  const today = istNow().date;
  const from = sp.get("from");
  const to = sp.get("to");
  const status = sp.get("status");
  const validStatus = STATUSES.includes(status as (typeof STATUSES)[number]);
  const view = isIsoDate(from) || isIsoDate(to) || validStatus ? "custom" : (sp.get("view") ?? "upcoming");

  let q = db().from("appointments").select("*");
  let desc = false;
  if (view === "upcoming") q = q.gte("appointment_date", today).neq("status", "cancelled");
  else if (view === "today") q = q.eq("appointment_date", today);
  else if (view === "past") {
    q = q.lt("appointment_date", today);
    desc = true;
  } else if (view === "refunds") q = q.eq("status", "cancelled").eq("payment_status", "paid");
  else if (view === "custom") {
    if (isIsoDate(from)) q = q.gte("appointment_date", from);
    if (isIsoDate(to)) q = q.lte("appointment_date", to);
    if (validStatus) q = q.eq("status", status as string);
  } else desc = true;

  const rows = must(await q.order("appointment_date", { ascending: !desc }).order("time_slot", { ascending: !desc }).limit(500));
  return json({ view, appointments: rows });
};

const showAppointment: Handler = async ({ params }) => {
  const a = await getAppointment(params[0]);
  return a ? json({ appointment: a }) : fail(404, "not_found");
};

const setAppointmentStatus: Handler = async ({ params, body }) => {
  const status = str(body.status);
  if (status !== "completed" && status !== "no_show") return fail(400, "bad_status");
  const updated = must(
    await db().from("appointments").update({ status }).eq("id", params[0]).in("status", ["confirmed", "completed", "no_show"]).select("id"),
  ) as unknown[];
  return updated.length ? ok(status) : fail(409, "not_allowed");
};

async function issueRefund(id: string): Promise<"refunded" | "refund_pending" | "failed" | "not_refundable"> {
  // Flip to refund_pending first so a double-click can't refund twice.
  const claimed = must(
    await db()
      .from("appointments")
      .update({ payment_status: "refund_pending" })
      .eq("id", id)
      .eq("payment_status", "paid")
      .not("razorpay_payment_id", "is", null)
      .select("razorpay_payment_id"),
  ) as { razorpay_payment_id: string }[];
  const paymentId = claimed[0]?.razorpay_payment_id;
  if (!paymentId) return "not_refundable";
  try {
    const refund = await refundPayment(paymentId, { appointment_id: id, reason: "Cancelled by clinic" });
    const status = refund.status === "processed" ? "refunded" : "refund_pending";
    must(await db().from("appointments").update({ payment_status: status, razorpay_refund_id: refund.id }).eq("id", id));
    return status;
  } catch (err) {
    console.error(`Refund failed for appointment ${id}`, err);
    must(await db().from("appointments").update({ payment_status: "paid" }).eq("id", id).eq("payment_status", "refund_pending"));
    return "failed";
  }
}

const cancelAppointment: Handler = async ({ params, body }) => {
  const id = params[0];
  const appt = await getAppointment(id);
  if (!appt) return fail(404, "not_found");
  if (appt.status === "cancelled" || appt.status === "completed") return fail(409, "not_allowed");

  must(await db().from("appointments").update({ status: "cancelled" }).eq("id", id));
  if (appt.payment_status === "paid" && body.refund === true) {
    const result = await issueRefund(id);
    return result === "failed" ? fail(502, "refund_failed") : ok("cancelled_refunded");
  }
  return ok("cancelled");
};

const refundAppointment: Handler = async ({ params }) => {
  const result = await issueRefund(params[0]);
  return result === "failed" || result === "not_refundable" ? fail(result === "failed" ? 502 : 409, `refund_${result}`) : ok("refunded");
};

// ---------- Services ----------

const listServices: Handler = async () =>
  json({ services: must(await db().from("services").select("id, name, is_active").order("display_order").order("id")) });

function serviceName(body: Body) {
  const name = str(body.name).replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 100 ? name : null;
}

const addService: Handler = async ({ body }) => {
  const name = serviceName(body);
  if (!name) return fail(400, "name");
  const last = must(await db().from("services").select("display_order").order("display_order", { ascending: false }).limit(1)) as { display_order: number }[];
  const { error } = await db().from("services").insert({ name, display_order: (last[0]?.display_order ?? 0) + 1 });
  if (error) return isUniqueViolation(error) ? fail(409, "duplicate") : Promise.reject(error);
  return ok("added");
};

const updateService: Handler = async ({ params, body }) => {
  const id = Number(params[0]);
  if (!Number.isInteger(id)) return fail(404, "not_found");
  if (body.toggle === true) {
    const svc = must(await db().from("services").select("is_active").eq("id", id).maybeSingle()) as { is_active: boolean } | null;
    if (!svc) return fail(404, "not_found");
    must(await db().from("services").update({ is_active: !svc.is_active }).eq("id", id));
    return ok("saved");
  }
  const name = serviceName(body);
  if (!name) return fail(400, "name");
  const { error } = await db().from("services").update({ name }).eq("id", id);
  if (error) return isUniqueViolation(error) ? fail(409, "duplicate") : Promise.reject(error);
  return ok("saved");
};

const moveService: Handler = async ({ params, body }) => {
  must(await db().rpc("move_service", { p_id: Number(params[0]), p_dir: str(body.dir) === "up" ? -1 : 1 }));
  return ok("moved");
};

// ---------- Availability ----------

type BlockRow = { date: string; time_slot: string | null; reason: string | null };

const getAvailabilitySettings: Handler = async () => {
  const today = istNow().date;
  const [hours, blocks] = await Promise.all([
    db().from("clinic_hours").select("weekday, opens_at, closes_at, is_closed").order("weekday"),
    db().from("blocked_slots").select("date, time_slot, reason").gte("date", today).order("date").order("time_slot"),
  ]);
  const blockRows = must(blocks) as BlockRow[];

  // Blocks are shown grouped by date + reason, with how many live bookings sit inside them.
  const dates = [...new Set(blockRows.map((b) => b.date))];
  const booked = dates.length
    ? (must(
        await db().from("appointments").select("appointment_date, time_slot").in("appointment_date", dates).in("status", ["confirmed", "pending_payment"]),
      ) as { appointment_date: string; time_slot: string }[])
    : [];

  const groups = new Map<string, { date: string; reason: string | null; wholeDay: boolean; slots: string[]; affected: number }>();
  for (const b of blockRows) {
    const key = `${b.date}|${b.reason ?? ""}`;
    const g = groups.get(key) ?? { date: b.date, reason: b.reason, wholeDay: false, slots: [], affected: 0 };
    if (b.time_slot === null) g.wholeDay = true;
    else g.slots.push(hhmm(b.time_slot));
    groups.set(key, g);
  }
  for (const g of groups.values()) {
    const slots = new Set(g.slots);
    g.affected = booked.filter((a) => a.appointment_date === g.date && (g.wholeDay || slots.has(hhmm(a.time_slot)))).length;
  }

  return json({
    today,
    hours: (must(hours) as { weekday: number; opens_at: string; closes_at: string; is_closed: boolean }[]).map((h) => ({
      weekday: h.weekday,
      opensAt: hhmm(h.opens_at),
      closesAt: hhmm(h.closes_at),
      isClosed: h.is_closed,
    })),
    blocks: [...groups.values()],
  });
};

const saveHours: Handler = async ({ body }) => {
  const input = Array.isArray(body.hours) ? (body.hours as Body[]) : [];
  const current = must(await db().from("clinic_hours").select("weekday, opens_at, closes_at")) as { weekday: number; opens_at: string; closes_at: string }[];
  const rows = [];
  for (let wd = 0; wd <= 6; wd++) {
    const h = input.find((x) => x.weekday === wd);
    const existing = current.find((c) => c.weekday === wd);
    if (!h) return fail(400, "hours");
    const closed = h.isClosed === true;
    const opens = str(h.opensAt);
    const closes = str(h.closesAt);
    const valid = isHhmm(opens) && isHhmm(closes) && toMinutes(closes) - toMinutes(opens) >= SLOT_MINUTES;
    if (!closed && !valid) return fail(400, "hours");
    // A closed day keeps its last times, so reopening it restores them.
    rows.push({
      weekday: wd,
      is_closed: closed,
      opens_at: valid ? opens : (existing?.opens_at ?? "10:00"),
      closes_at: valid ? closes : (existing?.closes_at ?? "20:00"),
    });
  }
  must(await db().from("clinic_hours").upsert(rows, { onConflict: "weekday" }));
  return ok("hours");
};

const addBlock: Handler = async ({ body }) => {
  const date = str(body.date);
  const reason = str(body.reason).slice(0, 200) || null;
  if (!isIsoDate(date)) return fail(400, "block_date");

  if (body.wholeDay === true) {
    must(await db().from("blocked_slots").insert({ date, time_slot: null, reason }));
    return ok("blocked");
  }
  const from = str(body.from);
  const to = str(body.to);
  if (!isHhmm(from) || !isHhmm(to) || toMinutes(to) <= toMinutes(from)) return fail(400, "block_range");
  // Round the start down to a slot boundary so a range like 13:15-14:00 still blocks the 13:00 slot.
  const rows = [];
  for (let t = Math.floor(toMinutes(from) / SLOT_MINUTES) * SLOT_MINUTES; t < toMinutes(to); t += SLOT_MINUTES) {
    rows.push({ date, time_slot: fromMinutes(t), reason });
  }
  must(await db().from("blocked_slots").insert(rows));
  return ok("blocked");
};

const deleteBlock: Handler = async ({ body }) => {
  const date = str(body.date);
  const reason = str(body.reason);
  if (!isIsoDate(date)) return fail(400, "block_date");
  // Blocks are shown grouped by date + reason; remove the whole group.
  const q = db().from("blocked_slots").delete().eq("date", date);
  must(await (reason ? q.eq("reason", reason) : q.is("reason", null)));
  return ok("unblocked");
};

// ---------- Settings ----------

const getSettings: Handler = async () =>
  json({ feePaise: await getConsultationFeePaise(), razorpay: razorpayMode(), webhook: isWebhookConfigured() });

const saveFee: Handler = async ({ body }) => {
  const rupees = Number(body.rupees);
  if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100000) return fail(400, "fee");
  await setConsultationFeePaise(Math.round(rupees * 100));
  return ok("fee");
};

const savePassword: Handler = async ({ req, admin, body }) => {
  const current = typeof body.current === "string" ? body.current : "";
  const next = typeof body.next === "string" ? body.next : "";
  if (next.length < 12) return fail(400, "pw_short");
  if (next !== body.confirm) return fail(400, "pw_match");
  if (!(await changePassword(req, admin.id, current, next))) return fail(400, "pw_current");
  return ok("pw");
};

// ---------- Routing ----------

const UUID = "([0-9a-fA-F-]{36})";
const routes: [string, RegExp, Handler][] = [
  ["GET", /^dashboard$/, dashboard],
  ["GET", /^appointments$/, listAppointments],
  ["GET", new RegExp(`^appointments/${UUID}$`), showAppointment],
  ["POST", new RegExp(`^appointments/${UUID}/status$`), setAppointmentStatus],
  ["POST", new RegExp(`^appointments/${UUID}/cancel$`), cancelAppointment],
  ["POST", new RegExp(`^appointments/${UUID}/refund$`), refundAppointment],
  ["GET", /^services$/, listServices],
  ["POST", /^services$/, addService],
  ["POST", /^services\/(\d+)$/, updateService],
  ["POST", /^services\/(\d+)\/move$/, moveService],
  ["GET", /^availability$/, getAvailabilitySettings],
  ["POST", /^hours$/, saveHours],
  ["POST", /^blocks$/, addBlock],
  ["POST", /^blocks\/delete$/, deleteBlock],
  ["GET", /^settings$/, getSettings],
  ["POST", /^settings\/fee$/, saveFee],
  ["POST", /^password$/, savePassword],
];

async function login(req: Request, context: Context) {
  const body = await readJsonBody(req);
  const username = str(body?.username);
  const password = typeof body?.password === "string" ? body.password : "";
  const allowed =
    (await rateLimit(`login:ip:${clientIp(req, context)}`, 10, 900)) && (await rateLimit(`login:user:${username.toLowerCase()}`, 10, 900));
  if (!allowed) return fail(429, "rate");
  const admin = username && password ? await verifyCredentials(username, password) : null;
  if (!admin) return fail(401, "invalid");
  const cookie = await startSession(req, admin.id);
  return json({ ok: "signed_in", admin }, { headers: { "Set-Cookie": cookie } });
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/admin\/?/, "").replace(/\/$/, "");
  const isWrite = req.method !== "GET";

  // Mutations must be same-origin JSON: with the SameSite=Strict cookie this
  // blocks cross-site request forgery.
  if (isWrite && (!isSameOrigin(req) || !(req.headers.get("content-type") ?? "").includes("application/json"))) {
    return fail(403, "forbidden");
  }

  try {
    if (path === "login" && req.method === "POST") return await login(req, context);
    if (path === "logout" && req.method === "POST") {
      return json({ ok: "signed_out" }, { headers: { "Set-Cookie": await endSession(req) } });
    }

    const admin = await getAdmin(req);
    if (!admin) return fail(401, "unauthenticated");
    if (path === "session" && req.method === "GET") return json({ admin });

    for (const [method, pattern, handler] of routes) {
      const m = pattern.exec(path);
      if (!m || method !== req.method) continue;
      const body = isWrite ? await readJsonBody(req) : {};
      if (!body) return fail(400, "bad_request");
      return await handler({ req, context, admin, body, params: m.slice(1), url });
    }
    return fail(404, "not_found");
  } catch (err) {
    console.error(`admin ${req.method} /${path} failed`, err);
    return fail(500, "server");
  }
};

export const config: Config = { path: ["/api/admin/*"] };

