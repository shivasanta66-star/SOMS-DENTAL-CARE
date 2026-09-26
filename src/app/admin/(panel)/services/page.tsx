import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { addServiceAction, moveServiceAction, renameServiceAction, toggleServiceAction } from "../../actions";
import { Badge, Flash } from "../../ui";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const { rows } = await query<{ id: number; name: string; is_active: boolean }>(
    "SELECT id, name, is_active FROM services ORDER BY display_order, id",
  );

  return (
    <>
      <h1>Services</h1>
      <p className="caption">These appear in the booking form, in this order. Hidden services can't be booked online.</p>
      <Flash ok={sp.ok} error={sp.error} />
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
                    <form action={moveServiceAction} className="inline-form">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button className="btn btn--outline btn--small" disabled={i === 0} aria-label={`Move ${s.name} up`}>↑</button>
                    </form>
                    <form action={moveServiceAction} className="inline-form">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button className="btn btn--outline btn--small" disabled={i === rows.length - 1} aria-label={`Move ${s.name} down`}>↓</button>
                    </form>
                  </div>
                </td>
                <td>
                  <form action={renameServiceAction} className="inline-form">
                    <input type="hidden" name="id" value={s.id} />
                    <label className="sr-only" htmlFor={`svc-${s.id}`}>Service name</label>
                    <input id={`svc-${s.id}`} name="name" className="input" defaultValue={s.name} style={{ minWidth: 280 }} required minLength={2} maxLength={100} />
                    <button className="btn btn--outline btn--small">Save</button>
                  </form>
                </td>
                <td><Badge value={s.is_active ? "confirmed" : "cancelled"} /> {s.is_active ? "Shown" : "Hidden"}</td>
                <td>
                  <form action={toggleServiceAction} className="inline-form">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="btn btn--outline btn--small">{s.is_active ? "Hide" : "Show"}</button>
                  </form>
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
        <form action={addServiceAction} className="inline-form">
          <label className="sr-only" htmlFor="new-service">New service name</label>
          <input id="new-service" name="name" className="input" placeholder="e.g. Teeth Whitening" required minLength={2} maxLength={100} style={{ minWidth: 280 }} />
          <button className="btn btn--primary btn--small">Add service</button>
        </form>
      </div>
    </>
  );
}
