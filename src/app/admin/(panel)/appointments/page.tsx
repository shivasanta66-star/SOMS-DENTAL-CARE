"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { Appointment } from "@/lib/appointment-types";
import { isIsoDate } from "@/lib/time";
import { formValues, useAdminData } from "../../api";
import { AppointmentTable, Flash, Loading } from "../../ui";

const VIEWS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "today", label: "Today" },
  { key: "past", label: "Past" },
  { key: "refunds", label: "Refund decisions" },
  { key: "all", label: "All" },
] as const;

function AppointmentsList() {
  const router = useRouter();
  const sp = useSearchParams();
  const query = sp.toString();
  const { data, error } = useAdminData<{ view: string; appointments: Appointment[] }>(`appointments${query ? `?${query}` : ""}`);
  const from = sp.get("from");
  const to = sp.get("to");

  function onFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams(Object.entries(formValues(e.currentTarget)).filter(([, v]) => v));
    router.push(`/admin/appointments${params.size ? `?${params}` : ""}`);
  }

  return (
    <>
      <h1>Appointments</h1>
      <Flash error={error} />
      <div className="chips" role="navigation" aria-label="Quick views">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/admin/appointments?view=${v.key}`} aria-current={data?.view === v.key ? "true" : undefined}>{v.label}</Link>
        ))}
      </div>
      <form className="filters" onSubmit={onFilter} key={query}>
        <label>From<input type="date" name="from" className="input" defaultValue={isIsoDate(from) ? from : ""} /></label>
        <label>To<input type="date" name="to" className="input" defaultValue={isIsoDate(to) ? to : ""} /></label>
        <label>
          Status
          <select name="status" className="select" defaultValue={sp.get("status") ?? ""}>
            <option value="">Any status</option>
            <option value="pending_payment">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </label>
        <button type="submit" className="btn btn--primary btn--small">Filter</button>
        {data?.view === "custom" && <Link href="/admin/appointments">Clear</Link>}
      </form>
      <div className="admin-card">
        {!data ? (
          <Loading />
        ) : (
          <>
            <AppointmentTable rows={data.appointments} empty="No appointments match." />
            {data.appointments.length === 500 && <p className="caption">Showing the first 500. Narrow the dates to see more.</p>}
          </>
        )}
      </div>
    </>
  );
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AppointmentsList />
    </Suspense>
  );
}
