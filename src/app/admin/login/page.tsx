import { redirect } from "next/navigation";
import { ToothIcon } from "@/components/icons";
import { getAdmin } from "@/lib/auth";
import { clinic } from "@/lib/clinic";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  invalid: "Incorrect username or password.",
  rate: "Too many sign-in attempts. Please wait 15 minutes and try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="login-wrap">
      <div className="card login-card">
        <p className="brand" style={{ marginBottom: 24 }}>
          <span className="brand__mark"><ToothIcon size={20} /></span>
          {clinic.name}
        </p>
        <h1 style={{ fontSize: 24 }}>Admin sign in</h1>
        {error && errors[error] && (
          <div className="notice notice--error" role="alert"><p>{errors[error]}</p></div>
        )}
        <form action={loginAction}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" className="input" autoComplete="username" required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          <button className="btn btn--primary btn--block" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
