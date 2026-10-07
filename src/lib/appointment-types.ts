// Shape of an appointments row as the admin API returns it (shared by the
// Netlify Functions and the admin pages).

export type AppointmentStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentStatus = "unpaid" | "paid" | "failed" | "expired" | "refund_pending" | "refunded";

export type Appointment = {
  id: string;
  patient_name: string;
  patient_phone: string;
  service: string;
  appointment_date: string;
  time_slot: string;
  status: AppointmentStatus;
  payment_status: PaymentStatus;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  razorpay_refund_id: string | null;
  amount_paise: number;
  created_at: string;
  updated_at: string;
};
