"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { Appointment } from "@/lib/appointment-types";
import { formatDateLong, formatRupees, formatTime12, hhmm } from "@/lib/time";
import { submitChange, useAdminData, type FlashState } from "../../../api";
import { Badge, Flash, Loading } from "../../../ui";

function AppointmentDetail() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, reload } = useAdminData<{ appointment: Appointment }>(id ? `appointments/${encodeURIComponent(id)}` : null);
  const [flash, setFlash] = useState<FlashState>({});
  const [busy, setBusy] = useState(false);

  async function change(action: string, body: unknown = {}) {
    setBusy(true);
    await submitChange(`appointments/${encodeURIComponent(id)}/${action}`, body, setFlash, reload);
    setBusy(false);
  }

  if (!id || error) {
    return (
      <>
        <p><Link href="/admin/appointments">← All appointments</Link></p>
        <Flash error={error ?? "not_found"} />
      </>
    );
  }
  if (!data) return <Loading />;

  const a = data.appointment;
  const isPaid = a.payment_status === "paid";
  const canMark = a.status === "confirmed" || a.status === "completed" || a.status === "no_show";
  const canCancel = a.status === "pending_payment" || a.status === "confirmed" || a.status === "no_show";
  const rzpDashboard = a.razorpay_payment_id ? `https://dashboard.razorpay.com/app/payments/${a.razorpay_payment_id}` : null;

  function onCancel(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const refund = new FormData(e.currentTarget).get("refund") === "yes";
    const question = isPaid
      ? refund
        ? `Cancel this appointment and refund ${formatRupees(a.amount_paise)} to the patient through Razorpay?`
        : "Cancel this appointment and keep the payment on record (no refund now)?"
      : "Cancel this appointment? The time slot will open up for other patients.";
    if (window.confirm(question)) void change("cancel", { refund });
  }

  return (
    <>
      <p><Link href="/admin/appointments">← All appointments</Link></p>
      <h1>{a.patient_name}</h1>
      <Flash ok={flash.ok} error={flash.error} />

      {a.status === "cancelled" && isPaid && (
        <div className="notice notice--error" role="alert">
          <p>
            <strong>This appointment is cancelled but the patient's payment of {formatRupees(a.amount_paise)} is still held.</strong>{" "}
            Refund it below, or call the patient to rebook (then record the new booking separately).
          </p>
        </div>
      )}

      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Appointment</h2>
        <dl className="dl">
          <dt>Date</dt><dd>{formatDateLong(a.appointment_date)}</dd>
          <dt>Time</dt><dd>{formatTime12(hhmm(a.time_slot))}</dd>
          <dt>Service</dt><dd>{a.service}</dd>
          <dt>Patient</dt><dd>{a.patient_name}</dd>
          <dt>Phone</dt><dd><a href={`tel:+91${a.patient_phone}`}>{a.patient_phone}</a></dd>
          <dt>Status</dt><dd><Badge value={a.status} /></dd>
          <dt>Booked</dt><dd>{new Date(a.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
        </dl>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Payment</h2>
        <dl className="dl">
          <dt>Payment status</dt><dd><Badge value={a.payment_status} /></dd>
          <dt>Amount</dt><dd>{formatRupees(a.amount_paise)}</dd>
          <dt>Razorpay order</dt><dd>{a.razorpay_order_id ?? "-"}</dd>
          <dt>Razorpay payment</dt>
          <dd>{rzpDashboard ? <a href={rzpDashboard} target="_blank" rel="noopener noreferrer">{a.razorpay_payment_id}</a> : "-"}</dd>
          <dt>Razorpay refund</dt><dd>{a.razorpay_refund_id ?? "-"}</dd>
        </dl>
        {a.status === "cancelled" && isPaid && (
          <button
            type="button"
            className="btn btn--danger btn--small"
            style={{ marginTop: 24 }}
            disabled={busy}
            onClick={() => window.confirm(`Refund ${formatRupees(a.amount_paise)} to the patient through Razorpay?`) && void change("refund")}
          >
            Refund {formatRupees(a.amount_paise)} via Razorpay
          </button>
        )}
      </div>

      {canMark && (
        <div className="admin-card">
          <h2 style={{ marginTop: 0 }}>After the visit</h2>
          <div className="actions">
            {a.status !== "completed" && (
              <button type="button" className="btn btn--primary btn--small" disabled={busy} onClick={() => change("status", { status: "completed" })}>
                Mark completed
              </button>
            )}
            {a.status !== "no_show" && (
              <button type="button" className="btn btn--outline btn--small" disabled={busy} onClick={() => change("status", { status: "no_show" })}>
                Mark no-show
              </button>
            )}
          </div>
        </div>
      )}

      {canCancel && (
        <div className="admin-card">
          <h2 style={{ marginTop: 0 }}>Cancel appointment</h2>
          <form onSubmit={onCancel}>
            {isPaid ? (
              <>
                <p>The patient paid {formatRupees(a.amount_paise)} online. What should happen to the payment?</p>
                <div className="radio-list" role="radiogroup" aria-label="Payment on cancellation">
                  <label>
                    <input type="radio" name="refund" value="yes" defaultChecked />
                    <span>Cancel and refund {formatRupees(a.amount_paise)} in full through Razorpay (reaches the patient in about 5-7 working days)</span>
                  </label>
                  <label>
                    <input type="radio" name="refund" value="no" />
                    <span>Cancel without refunding now. The payment stays on record and you can refund it later from this page.</span>
                  </label>
                </div>
              </>
            ) : (
              <p>This booking hasn't been paid, so there's nothing to refund. The time slot will open up for other patients.</p>
            )}
            <button type="submit" className="btn btn--danger btn--small" disabled={busy}>Cancel appointment</button>
          </form>
        </div>
      )}
    </>
  );
}

export default function AppointmentDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AppointmentDetail />
    </Suspense>
  );
}
