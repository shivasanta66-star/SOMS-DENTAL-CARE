import { ToothIcon } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { clinic } from "@/lib/clinic";
import { logoutAction } from "../actions";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="container admin-bar__inner">
          <span className="brand"><span className="brand__mark"><ToothIcon size={18} /></span>{clinic.name}</span>
          <AdminNav />
          <div className="admin-bar__user">
            <span>Signed in as {admin.username}</span>
            <form action={logoutAction}><button type="submit">Sign out</button></form>
          </div>
        </div>
      </header>
      <main className="admin-main container">{children}</main>
    </div>
  );
}
