import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppointment } from "@/lib/appointments";
import { requireAdmin } from "@/lib/auth";
import { formatDateLong, formatRupees, formatTime12, hhmm } from "@/lib/time";
import { cancelAppointmentAction, refundAppointmentAction, setAppointmentStatusAction } from "../../../actions";
import { Badge, Flash } from "../../../ui";

export default async function AppointmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const a = await getAppointment(id);
  if (!a) notFound();

  const isPaid = a.payment_status === "paid";
  const canMark = a.status === "confirmed" || a.status === "completed" || a.status === "no_show";
  const canCancel = a.status === "pending_payment" || a.status === "confirmed" || a.status === "no_show";
  const rzpDashboard = a.razorpay_payment_id ? `https://dashboard.razorpay.com/app/payments/${a.razorpay_payment_id}` : null;

  return (
    <>
      <p><Link href="/admin/appointments">← All appointments</Link></p>
      <h1>{a.patient_name}</h1>
      <Flash ok={sp.ok} error={sp.error} />

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
          <dt>Booked</dt><dd>{a.created_at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</dd>
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
          <form action={refundAppointmentAction} style={{ marginTop: 24 }}>
            <input type="hidden" name="id" value={a.id} />
            <button type="submit" className="btn btn--danger btn--small">Refund {formatRupees(a.amount_paise)} via Razorpay</button>
          </form>
        )}
      </div>

      {canMark && (
        <div className="admin-card">
          <h2 style={{ marginTop: 0 }}>After the visit</h2>
          <div className="actions">
            {a.status !== "completed" && (
              <form action={setAppointmentStatusAction} className="inline-form">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="completed" />
                <button type="submit" className="btn btn--primary btn--small">Mark completed</button>
              </form>
            )}
            {a.status !== "no_show" && (
              <form action={setAppointmentStatusAction} className="inline-form">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value="no_show" />
                <button type="submit" className="btn btn--outline btn--small">Mark no-show</button>
              </form>
            )}
          </div>
        </div>
      )}

      {canCancel && (
        <div className="admin-card">
          <h2 style={{ marginTop: 0 }}>Cancel appointment</h2>
          <form action={cancelAppointmentAction}>
            <input type="hidden" name="id" value={a.id} />
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
            <button type="submit" className="btn btn--danger btn--small">Cancel appointment</button>
          </form>
        </div>
      )}
    </>
  );
}
