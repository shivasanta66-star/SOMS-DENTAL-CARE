"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ToothIcon } from "@/components/icons";
import { clinic } from "@/lib/clinic";
import { adminPost, formValues } from "../api";

const errors: Record<string, string> = {
  invalid: "Incorrect username or password.",
  rate: "Too many sign-in attempts. Please wait 15 minutes and try again.",
  network: "Couldn't reach the server. Check the internet connection and try again.",
};

type Health = { database: string; adminAccount: boolean };

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    // Already signed in? Go straight to the dashboard.
    fetch("/api/admin/session", { cache: "no-store" })
      .then((res) => res.ok && router.replace("/admin"))
      .catch(() => undefined);
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json())
      .then((h: Health) => setHealth(h))
      .catch(() => undefined);
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await adminPost("login", formValues(e.currentTarget));
    if (r.ok) {
      router.replace("/admin");
      return;
    }
    setError(r.error);
    setBusy(false);
  }

  const setupHint =
    health?.database === "not_configured"
      ? "The database isn't connected: SUPABASE_URL and SUPABASE_SECRET_KEY are missing from the Netlify environment."
      : health?.database === "schema_missing"
        ? "The database tables don't exist yet. Run db/schema.sql in the Supabase SQL Editor, then reload this page."
        : health?.database === "ok" && !health.adminAccount
          ? "No admin account exists yet. In the Supabase SQL Editor run: SELECT public.set_admin_password('reception', 'a long passphrase');"
          : null;

  return (
    <main className="login-wrap">
      <div className="card login-card">
        <p className="brand" style={{ marginBottom: 24 }}>
          <span className="brand__mark"><ToothIcon size={20} /></span>
          {clinic.name}
        </p>
        <h1 style={{ fontSize: 24 }}>Admin sign in</h1>
        {setupHint && (
          <div className="notice" role="status"><p><strong>Setup needed.</strong> {setupHint}</p></div>
        )}
        {error && (
          <div className="notice notice--error" role="alert"><p>{errors[error] ?? "Something went wrong. Please try again."}</p></div>
        )}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" className="input" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          <button className="btn btn--primary btn--block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}
