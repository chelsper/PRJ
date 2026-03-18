import Link from "next/link";

import { requireCapability } from "@/server/auth/permissions";
import { recentAuditEvents, dashboardTotals, type AuditEventRow } from "@/server/data/reports";

export default async function DashboardPage() {
  await requireCapability("reports:read");

  const [totals, auditEvents] = await Promise.all([dashboardTotals(), recentAuditEvents()]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Dashboard</p>
        <h1>Admin workspace for donor operations</h1>
        <p className="muted">
          Server-rendered pages, centralized data access, and audit-aware workflows for sensitive donor records.
        </p>
      </section>

      <section className="stats">
        <article className="stat">
          <span className="muted">Visible donors</span>
          <strong>{totals.visible_donors}</strong>
        </article>
        <article className="stat">
          <span className="muted">Gift records</span>
          <strong>{totals.recent_gifts}</strong>
        </article>
        <article className="stat">
          <span className="muted">PRJ total received</span>
          <strong>${(totals.prj_total_received_cents / 100).toLocaleString()}</strong>
        </article>
        <article className="stat">
          <span className="muted">PRJ total pledged</span>
          <strong>${(totals.prj_total_pledged_cents / 100).toLocaleString()}</strong>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="table-shell">
          <p className="eyebrow">Quick Access</p>
          <table>
            <tbody>
              <tr>
                <td>
                  <Link href="/donors">Donor lookup</Link>
                </td>
                <td className="muted">Search donors and add records</td>
              </tr>
              <tr>
                <td>
                  <Link href="/gifts">Gift entry</Link>
                </td>
                <td className="muted">Record gifts against funds and campaigns</td>
              </tr>
              <tr>
                <td>
                  <Link href="/reports">Reports</Link>
                </td>
                <td className="muted">Recognition totals, received totals, pledged totals</td>
              </tr>
            </tbody>
          </table>
        </article>

        <article className="table-shell">
          <p className="eyebrow">Recent Audit Events</p>
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.map((event: AuditEventRow) => (
                <tr key={`${event.occurred_at}-${event.action}`}>
                  <td>{event.occurred_at.slice(0, 19).replace("T", " ")}</td>
                  <td>{event.action}</td>
                  <td>{event.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
