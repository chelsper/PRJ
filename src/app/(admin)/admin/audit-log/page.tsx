import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireCapability } from "@/server/auth/permissions";
import { recentAuditEvents, type AuditEventRow } from "@/server/data/reports";

export default async function AdminAuditLogPage() {
  await requireCapability("audit:read");
  const rows = await recentAuditEvents();

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Admin</p>
        <h1>Audit Log</h1>
        <p className="muted">Review authentication events, data changes, exports, and permission denials.</p>
      </section>

      <AdminSectionNav active="audit-log" />

      <section className="table-shell">
        <p className="eyebrow">Audit Events</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: AuditEventRow) => (
                <tr key={row.id}>
                  <td>{row.occurred_at.slice(0, 19).replace("T", " ")}</td>
                  <td>{row.actor_email ?? "System"}</td>
                  <td>{row.action}</td>
                  <td>
                    {row.entity_type}
                    {row.entity_id ? ` · ${row.entity_id}` : ""}
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <details>
                      <summary>View</summary>
                      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{row.metadata_text}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
