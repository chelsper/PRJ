import { requireCapability } from "@/server/auth/permissions";
import { recentAuditEvents } from "@/server/data/reports";

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
            <th>Action</th>
            <th>Entity</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.occurred_at}-${row.action}`}>
              <td>{row.occurred_at.slice(0, 19).replace("T", " ")}</td>
              <td>{row.action}</td>
              <td>{row.entity_type}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
