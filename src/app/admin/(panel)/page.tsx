"use client";

import Link from "next/link";
import type { Appointment } from "@/lib/appointment-types";
import { formatDateLong } from "@/lib/time";
import { useAdminData } from "../api";
import { AppointmentTable, Flash, Loading } from "../ui";

type Dashboard = {
  today: string;
  todayAppointments: Appointment[];
  upcomingThisWeek: number;
  refundDecisions: number;
  awaitingPayment: number;
};

export default function DashboardPage() {
  const { data, error } = useAdminData<Dashboard>("dashboard");
  if (error) return <Flash error={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <h1>Today, {formatDateLong(data.today)}</h1>
      <div className="stats">
        <div className="stat">
          <div className="stat__value">{data.todayAppointments.filter((a) => a.status === "confirmed").length}</div>
          <div className="stat__label">Confirmed today</div>
        </div>
        <div className="stat">
          <div className="stat__value">{data.upcomingThisWeek}</div>
          <div className="stat__label">Upcoming confirmed this week (to Sunday)</div>
        </div>
        <div className="stat">
          <div className="stat__value">{data.awaitingPayment}</div>
          <div className="stat__label">Awaiting payment (held 30 min)</div>
        </div>
        {data.refundDecisions > 0 && (
          <Link href="/admin/appointments?view=refunds" className="stat stat--alert" style={{ textDecoration: "none" }}>
            <div className="stat__value">{data.refundDecisions}</div>
            <div className="stat__label">Cancelled but still paid: decide on refund</div>
          </Link>
        )}
      </div>

      <section className="admin-card" aria-labelledby="today-title">
        <h2 id="today-title" style={{ marginTop: 0 }}>Today's appointments</h2>
        <AppointmentTable rows={data.todayAppointments} empty="No appointments booked for today yet." />
      </section>
      <p><Link href="/admin/appointments">See all upcoming appointments</Link></p>
    </>
  );
}
