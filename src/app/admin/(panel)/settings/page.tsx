"use client";

import { useState } from "react";
import { formValues, submitChange, useAdminData, type FlashState } from "../../api";
import { Flash, Loading } from "../../ui";

type Settings = { feePaise: number; bookingWindowDays: number; razorpay: "live" | "test" | "not_configured"; webhook: boolean };

const modes = { live: "Live", test: "Test mode (no real money)", not_configured: "Not configured" };

export default function SettingsPage() {
  const { data, error, reload } = useAdminData<Settings>("settings");
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

  return (
    <>
      <h1>Settings</h1>
      <Flash ok={flash.ok} error={flash.error} />

      <section className="admin-card" aria-labelledby="fee-title">
        <h2 id="fee-title" style={{ marginTop: 0 }}>Consultation fee</h2>
        <p className="caption">One flat fee, paid online when a patient books. Shown on the website before they pay. Existing bookings keep the fee they paid.</p>
        <form
          className="filters"
          key={data.feePaise}
          onSubmit={(e) => {
            e.preventDefault();
            void change("settings/fee", { rupees: Number(formValues(e.currentTarget).fee) });
          }}
        >
          <label>
            Fee (₹)
            <input name="fee" type="number" min={1} max={100000} step="0.01" className="input" defaultValue={data.feePaise / 100} required />
          </label>
          <button type="submit" className="btn btn--primary btn--small" disabled={busy}>Save fee</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="window-title">
        <h2 id="window-title" style={{ marginTop: 0 }}>Booking window</h2>
        <p className="caption">
          How many days ahead patients can book online, counting today. Bookings already made further out are kept.
        </p>
        <form
          className="filters"
          key={data.bookingWindowDays}
          onSubmit={(e) => {
            e.preventDefault();
            void change("settings/booking-window", { days: Number(formValues(e.currentTarget).days) });
          }}
        >
          <label>
            Days ahead
            <input name="days" type="number" min={1} max={90} step={1} className="input" defaultValue={data.bookingWindowDays} required />
          </label>
          <button type="submit" className="btn btn--primary btn--small" disabled={busy}>Save booking window</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="pay-title">
        <h2 id="pay-title" style={{ marginTop: 0 }}>Online payments</h2>
        <dl className="dl">
          <dt>Razorpay</dt><dd>{modes[data.razorpay]}</dd>
          <dt>Webhook</dt>
          <dd>{data.webhook ? "Secret set" : "Not set (optional). Unconfirmed payments are still checked with Razorpay every 10 minutes."}</dd>
        </dl>
        <p className="caption" style={{ marginTop: 16 }}>Keys are set as environment variables in Netlify, never in this panel.</p>
      </section>

      <section className="admin-card" aria-labelledby="pw-title">
        <h2 id="pw-title" style={{ marginTop: 0 }}>Change password</h2>
        <form
          style={{ maxWidth: 400 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            if (await change("password", formValues(form))) form.reset();
          }}
        >
          <div className="field">
            <label htmlFor="current">Current password</label>
            <input id="current" name="current" type="password" className="input" autoComplete="current-password" required />
          </div>
          <div className="field">
            <label htmlFor="next">New password (at least 12 characters)</label>
            <input id="next" name="next" type="password" className="input" autoComplete="new-password" minLength={12} required />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm new password</label>
            <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" minLength={12} required />
          </div>
          <button type="submit" className="btn btn--primary btn--small" disabled={busy}>Change password</button>
        </form>
      </section>
    </>
  );
}
