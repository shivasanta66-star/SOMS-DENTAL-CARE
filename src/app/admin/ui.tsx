import Link from "next/link";
import type { Appointment } from "@/lib/appointments";
import { formatDateShort, formatRupees, formatTime12, hhmm } from "@/lib/time";

const statusLabels: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  unpaid: "Unpaid",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export function Badge({ value }: { value: string }) {
  return <span className={`badge badge--${value}`}>{statusLabels[value] ?? value}</span>;
}

const messages: Record<string, string> = {
  // ok
  completed: "Marked as completed.",
  no_show: "Marked as no-show.",
  cancelled: "Appointment cancelled.",
  cancelled_refunded: "Appointment cancelled and a full refund was started in Razorpay.",
  refunded: "Refund started in Razorpay. It usually reaches the patient in 5-7 working days.",
  added: "Service added.",
  saved: "Saved.",
  hours: "Weekly hours saved. The website updates within 5 minutes.",
  blocked: "Time blocked. Patients can no longer book it.",
  unblocked: "Block removed.",
  fee: "Consultation fee saved. New bookings will use it.",
  pw: "Password changed. Other devices have been signed out.",
  // errors
  bad_status: "That status change isn't allowed.",
  not_allowed: "That change isn't allowed for this appointment's current status.",
  not_found: "Appointment not found.",
  refund_failed: "The appointment was cancelled, but Razorpay refused the refund. Check the Razorpay dashboard, or try the refund button again.",
  refund_not_refundable: "This payment can't be refunded from here (it may already be refunded).",
  name: "Service names must be 2-100 characters.",
  duplicate: "A service with that name already exists.",
  block_date: "Choose a valid date to block.",
  block_range: "Choose a start and end time, with the end after the start.",
  pw_short: "The new password must be at least 12 characters.",
  pw_match: "The two new passwords don't match.",
  pw_current: "The current password is incorrect.",
};

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (error) {
    const text = error === "hours" ? "Each open day needs an opening time at least 30 minutes before closing." : error === "fee" ? "Enter a fee between ₹1 and ₹1,00,000." : messages[error];
    return text ? <div className="notice notice--error" role="alert"><p>{text}</p></div> : null;
  }
  if (ok && messages[ok]) return <div className="notice" role="status"><p>{messages[ok]}</p></div>;
  return null;
}

export function AppointmentTable({ rows, empty }: { rows: Appointment[]; empty: string }) {
  if (!rows.length) return <p className="caption">{empty}</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Time</th>
          <th scope="col">Patient</th>
          <th scope="col">Phone</th>
          <th scope="col">Service</th>
          <th scope="col">Status</th>
          <th scope="col">Payment</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td>{formatDateShort(a.appointment_date)}</td>
            <td>{formatTime12(hhmm(a.time_slot))}</td>
            <td><Link href={`/admin/appointments/${a.id}`}>{a.patient_name}</Link></td>
            <td><a href={`tel:+91${a.patient_phone}`}>{a.patient_phone}</a></td>
            <td className="wrap">{a.service}</td>
            <td><Badge value={a.status} /></td>
            <td><Badge value={a.payment_status} /> <span className="caption">{formatRupees(a.amount_paise)}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
