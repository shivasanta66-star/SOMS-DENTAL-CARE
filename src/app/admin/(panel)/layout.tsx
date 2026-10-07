"use client";

import { useEffect, useState } from "react";
import { ToothIcon } from "@/components/icons";
import { clinic } from "@/lib/clinic";
import { AdminNav } from "../AdminNav";
import { adminGet, adminPost } from "../api";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Redirects to /admin/login when there's no valid session.
    adminGet<{ admin: { username: string } }>("session").then((r) => r.ok && setUsername(r.data.admin.username));
  }, []);

  async function signOut() {
    await adminPost("logout");
    window.location.assign("/admin/login");
  }

  if (!username) {
    return (
      <div className="admin">
        <main className="admin-main container"><p className="caption" role="status">Checking your sign-in…</p></main>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="container admin-bar__inner">
          <span className="brand"><span className="brand__mark"><ToothIcon size={18} /></span>{clinic.name}</span>
          <AdminNav />
          <div className="admin-bar__user">
            <span>Signed in as {username}</span>
            <button type="button" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="admin-main container">{children}</main>
    </div>
  );
}
