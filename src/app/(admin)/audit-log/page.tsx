import { requireCapability } from "@/server/auth/permissions";
import { recentAuditEvents, type AuditEventRow } from "@/server/data/reports";

export default async function AuditLogPage() {
  await requireCapability("audit:read");
  const rows = await recentAuditEvents();

  return (
    <section className="table-shell">
      <p className="eyebrow">Audit Log</p>
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
    </section>
  );
}
