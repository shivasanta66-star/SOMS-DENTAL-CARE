"use client";

import { useState } from "react";
import { formValues, submitChange, useAdminData, type FlashState } from "../../api";
import { Badge, Flash, Loading } from "../../ui";

type Service = { id: number; name: string; is_active: boolean };

export default function ServicesPage() {
  const { data, error, reload } = useAdminData<{ services: Service[] }>("services");
  const [flash, setFlash] = useState<FlashState>({});
  const [busy, setBusy] = useState(false);

  async function change(path: string, body: unknown) {
    setBusy(true);
    const ok = await submitChange(path, body, setFlash, reload);
    setBusy(false);
    return ok;
  }

  if (error) return <Flash error={error} />;
  if (!data) return <Loading />;
  const rows = data.services;

  return (
    <>
      <h1>Services</h1>
      <p className="caption">These appear in the booking form, in this order. Hidden services can't be booked online.</p>
      <Flash ok={flash.ok === "moved" ? undefined : flash.ok} error={flash.error} />
      <div className="admin-card">
        <table className="table">
          <thead>
            <tr><th scope="col">Order</th><th scope="col">Name</th><th scope="col">Online booking</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr key={s.id}>
                <td>
                  <div className="actions">
                    <button className="btn btn--outline btn--small" disabled={busy || i === 0} aria-label={`Move ${s.name} up`} onClick={() => change(`services/${s.id}/move`, { dir: "up" })}>↑</button>
                    <button className="btn btn--outline btn--small" disabled={busy || i === rows.length - 1} aria-label={`Move ${s.name} down`} onClick={() => change(`services/${s.id}/move`, { dir: "down" })}>↓</button>
                  </div>
                </td>
                <td>
                  <form
                    className="inline-form"
                    key={s.name}
                    onSubmit={(e) => {
                      e.preventDefault();
                      void change(`services/${s.id}`, { name: formValues(e.currentTarget).name });
                    }}
                  >
                    <label className="sr-only" htmlFor={`svc-${s.id}`}>Service name</label>
                    <input id={`svc-${s.id}`} name="name" className="input" defaultValue={s.name} style={{ minWidth: 280 }} required minLength={2} maxLength={100} />
                    <button className="btn btn--outline btn--small" disabled={busy}>Save</button>
                  </form>
                </td>
                <td><Badge value={s.is_active ? "confirmed" : "cancelled"} /> {s.is_active ? "Shown" : "Hidden"}</td>
                <td>
                  <button className="btn btn--outline btn--small" disabled={busy} onClick={() => change(`services/${s.id}`, { toggle: true })}>
                    {s.is_active ? "Hide" : "Show"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="caption" style={{ marginTop: 16 }}>
          Tip: the website's service cards match on the exact name. If you rename one of the original seven, its "Book This" button
          will still scroll to the form but won't pre-select it.
        </p>
      </div>

      <div className="admin-card">
        <h2 style={{ marginTop: 0 }}>Add a service</h2>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (await change("services", { name: formValues(form).name })) form.reset();
          }}
        >
          <label className="sr-only" htmlFor="new-service">New service name</label>
          <input id="new-service" name="name" className="input" placeholder="e.g. Teeth Whitening" required minLength={2} maxLength={100} style={{ minWidth: 280 }} />
          <button className="btn btn--primary btn--small" disabled={busy}>Add service</button>
        </form>
      </div>
    </>
  );
}
