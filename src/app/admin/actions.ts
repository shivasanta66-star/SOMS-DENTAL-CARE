"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { changePassword, endSession, requireAdmin, startSession, verifyCredentials } from "@/lib/auth";
import { getAppointment } from "@/lib/appointments";
import { isUniqueViolation, query, withTransaction } from "@/lib/db";
import { refundPayment } from "@/lib/razorpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { setConsultationFeePaise } from "@/lib/settings";
import { SLOT_MINUTES } from "@/lib/slots";
import { fromMinutes, isHhmm, isIsoDate, toMinutes } from "@/lib/time";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function back(path: string, params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`${path}${qs ? `?${qs}` : ""}`);
}

// ---------- Auth ----------

export async function loginAction(formData: FormData) {
  const username = str(formData, "username");
  const password = String(formData.get("password") ?? "");
  const ip = clientIp(await headers());
  const allowed = (await rateLimit(`login:ip:${ip}`, 10, 900)) && (await rateLimit(`login:user:${username.toLowerCase()}`, 10, 900));
  if (!allowed) back("/admin/login", { error: "rate" });
  const admin = username && password ? await verifyCredentials(username, password) : null;
  if (!admin) back("/admin/login", { error: "invalid" });
  await startSession(admin.id);
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

// ---------- Appointments ----------

export async function setAppointmentStatusAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const status = str(formData, "status");
  if (status !== "completed" && status !== "no_show") back(`/admin/appointments/${id}`, { error: "bad_status" });
  const res = await query(
    `UPDATE appointments SET status = $2, updated_at = now() WHERE id = $1 AND status IN ('confirmed', 'completed', 'no_show')`,
    [id, status],
  );
  revalidatePath("/admin", "layout");
  back(`/admin/appointments/${id}`, res.rowCount ? { ok: status } : { error: "not_allowed" });
}

async function issueRefund(id: string): Promise<"refunded" | "refund_pending" | "failed" | "not_refundable"> {
  // Flip to refund_pending first so a double-click can't refund twice.
  const claimed = await query<{ razorpay_payment_id: string }>(
    `UPDATE appointments SET payment_status = 'refund_pending', updated_at = now()
      WHERE id = $1 AND payment_status = 'paid' AND razorpay_payment_id IS NOT NULL
      RETURNING razorpay_payment_id`,
    [id],
  );
  const paymentId = claimed.rows[0]?.razorpay_payment_id;
  if (!paymentId) return "not_refundable";
  try {
    const refund = await refundPayment(paymentId, { appointment_id: id, reason: "Cancelled by clinic" });
    const status = refund.status === "processed" ? "refunded" : "refund_pending";
    await query(`UPDATE appointments SET payment_status = $2, razorpay_refund_id = $3, updated_at = now() WHERE id = $1`, [id, status, refund.id]);
    return status;
  } catch (err) {
    console.error(`Refund failed for appointment ${id}`, err);
    await query(`UPDATE appointments SET payment_status = 'paid', updated_at = now() WHERE id = $1 AND payment_status = 'refund_pending'`, [id]);
    return "failed";
  }
}

export async function cancelAppointmentAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const refund = str(formData, "refund") === "yes";
  const appt = await getAppointment(id);
  if (!appt) back("/admin/appointments", { error: "not_found" });
  if (appt.status === "cancelled" || appt.status === "completed") back(`/admin/appointments/${id}`, { error: "not_allowed" });

  await query(`UPDATE appointments SET status = 'cancelled', updated_at = now() WHERE id = $1`, [id]);
  revalidatePath("/admin", "layout");

  if (appt.payment_status === "paid" && refund) {
    const result = await issueRefund(id);
    back(`/admin/appointments/${id}`, result === "failed" ? { error: "refund_failed" } : { ok: "cancelled_refunded" });
  }
  back(`/admin/appointments/${id}`, { ok: "cancelled" });
}

export async function refundAppointmentAction(formData: FormData) {
  await requireAdmin();
  const id = str(formData, "id");
  const result = await issueRefund(id);
  revalidatePath("/admin", "layout");
  back(`/admin/appointments/${id}`, result === "failed" || result === "not_refundable" ? { error: `refund_${result}` } : { ok: "refunded" });
}

// ---------- Services ----------

export async function addServiceAction(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  if (name.length < 2 || name.length > 100) back("/admin/services", { error: "name" });
  try {
    await query(
      `INSERT INTO services (name, display_order) VALUES ($1, COALESCE((SELECT max(display_order) FROM services), 0) + 1)`,
      [name],
    );
  } catch (err) {
    if (isUniqueViolation(err)) back("/admin/services", { error: "duplicate" });
    throw err;
  }
  back("/admin/services", { ok: "added" });
}

export async function renameServiceAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const name = str(formData, "name");
  if (name.length < 2 || name.length > 100) back("/admin/services", { error: "name" });
  try {
    await query("UPDATE services SET name = $2 WHERE id = $1", [id, name]);
  } catch (err) {
    if (isUniqueViolation(err)) back("/admin/services", { error: "duplicate" });
    throw err;
  }
  back("/admin/services", { ok: "saved" });
}

export async function toggleServiceAction(formData: FormData) {
  await requireAdmin();
  await query("UPDATE services SET is_active = NOT is_active WHERE id = $1", [Number(formData.get("id"))]);
  back("/admin/services", { ok: "saved" });
}

export async function moveServiceAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const dir = str(formData, "dir") === "up" ? -1 : 1;
  await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: number }>("SELECT id FROM services ORDER BY display_order, id FOR UPDATE");
    const ids = rows.map((r) => r.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    for (const [order, sid] of ids.entries()) {
      await client.query("UPDATE services SET display_order = $2 WHERE id = $1", [sid, order + 1]);
    }
  });
  back("/admin/services", {});
}

// ---------- Availability ----------

export async function saveHoursAction(formData: FormData) {
  await requireAdmin();
  const rows = [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
    wd,
    opens: str(formData, `opens_${wd}`),
    closes: str(formData, `closes_${wd}`),
    closed: formData.get(`closed_${wd}`) === "on",
  }));
  for (const r of rows) {
    if (r.closed) continue;
    if (!isHhmm(r.opens) || !isHhmm(r.closes) || toMinutes(r.closes) - toMinutes(r.opens) < SLOT_MINUTES) {
      back("/admin/availability", { error: "hours" });
    }
  }
  await withTransaction(async (client) => {
    for (const r of rows) {
      await client.query(
        `UPDATE clinic_hours SET is_closed = $2,
                opens_at = CASE WHEN $2 THEN opens_at ELSE $3::time END,
                closes_at = CASE WHEN $2 THEN closes_at ELSE $4::time END
          WHERE weekday = $1`,
        [r.wd, r.closed, r.closed ? null : r.opens, r.closed ? null : r.closes],
      );
    }
  });
  revalidatePath("/");
  back("/admin/availability", { ok: "hours" });
}

export async function addBlockAction(formData: FormData) {
  await requireAdmin();
  const date = str(formData, "date");
  const wholeDay = formData.get("whole_day") === "on";
  const from = str(formData, "from");
  const to = str(formData, "to");
  const reason = str(formData, "reason").slice(0, 200) || null;
  if (!isIsoDate(date)) back("/admin/availability", { error: "block_date" });

  if (wholeDay) {
    await query("INSERT INTO blocked_slots (date, time_slot, reason) VALUES ($1, NULL, $2)", [date, reason]);
  } else {
    if (!isHhmm(from) || !isHhmm(to) || toMinutes(to) <= toMinutes(from)) back("/admin/availability", { error: "block_range" });
    // Round the start down to a slot boundary so a range like 13:15-14:00 still blocks the 13:00 slot.
    const start = Math.floor(toMinutes(from) / SLOT_MINUTES) * SLOT_MINUTES;
    const values: string[] = [];
    for (let t = start; t < toMinutes(to); t += SLOT_MINUTES) values.push(fromMinutes(t));
    await withTransaction(async (client) => {
      for (const slot of values) {
        await client.query("INSERT INTO blocked_slots (date, time_slot, reason) VALUES ($1, $2, $3)", [date, slot, reason]);
      }
    });
  }
  back("/admin/availability", { ok: "blocked" });
}

export async function deleteBlockAction(formData: FormData) {
  await requireAdmin();
  const date = str(formData, "date");
  const reason = str(formData, "reason");
  // Blocks are shown grouped by date + reason; remove the whole group.
  await query("DELETE FROM blocked_slots WHERE date = $1 AND COALESCE(reason, '') = $2", [date, reason]);
  back("/admin/availability", { ok: "unblocked" });
}

// ---------- Settings ----------

export async function saveFeeAction(formData: FormData) {
  await requireAdmin();
  const rupees = Number(str(formData, "fee"));
  if (!Number.isFinite(rupees) || rupees < 1 || rupees > 100000) back("/admin/settings", { error: "fee" });
  await setConsultationFeePaise(Math.round(rupees * 100));
  back("/admin/settings", { ok: "fee" });
}

export async function changePasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 12) back("/admin/settings", { error: "pw_short" });
  if (next !== confirm) back("/admin/settings", { error: "pw_match" });
  if (!(await changePassword(admin.id, current, next))) back("/admin/settings", { error: "pw_current" });
  back("/admin/settings", { ok: "pw" });
}
