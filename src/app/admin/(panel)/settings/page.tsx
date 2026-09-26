import { requireAdmin } from "@/lib/auth";
import { isRazorpayConfigured } from "@/lib/razorpay";
import { getConsultationFeePaise } from "@/lib/settings";
import { changePasswordAction, saveFeeAction } from "../../actions";
import { Flash } from "../../ui";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const feePaise = await getConsultationFeePaise();
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const mode = !isRazorpayConfigured() ? "Not configured" : keyId.startsWith("rzp_live_") ? "Live" : "Test mode (no real money)";

  return (
    <>
      <h1>Settings</h1>
      <Flash ok={sp.ok} error={sp.error} />

      <section className="admin-card" aria-labelledby="fee-title">
        <h2 id="fee-title" style={{ marginTop: 0 }}>Consultation fee</h2>
        <p className="caption">One flat fee, paid online when a patient books. Shown on the website before they pay. Existing bookings keep the fee they paid.</p>
        <form action={saveFeeAction} className="filters">
          <label>
            Fee (₹)
            <input name="fee" type="number" min={1} max={100000} step="0.01" className="input" defaultValue={feePaise / 100} required />
          </label>
          <button type="submit" className="btn btn--primary btn--small">Save fee</button>
        </form>
      </section>

      <section className="admin-card" aria-labelledby="pay-title">
        <h2 id="pay-title" style={{ marginTop: 0 }}>Online payments</h2>
        <dl className="dl">
          <dt>Razorpay</dt><dd>{mode}</dd>
          <dt>Webhook</dt><dd>{process.env.RAZORPAY_WEBHOOK_SECRET ? "Secret set" : "Not set - add RAZORPAY_WEBHOOK_SECRET"}</dd>
        </dl>
        <p className="caption" style={{ marginTop: 16 }}>Keys are set as environment variables on the hosting provider, never in this panel.</p>
      </section>

      <section className="admin-card" aria-labelledby="pw-title">
        <h2 id="pw-title" style={{ marginTop: 0 }}>Change password</h2>
        <form action={changePasswordAction} style={{ maxWidth: 400 }}>
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
          <button type="submit" className="btn btn--primary btn--small">Change password</button>
        </form>
      </section>
    </>
  );
}
