import Link from "next/link";

import { requireCapability } from "@/server/auth/permissions";
import { listDonors } from "@/server/data/donors";
import { listRecentGifts } from "@/server/data/gifts";
import { recentAuditEvents } from "@/server/data/reports";

export default async function DashboardPage() {
  await requireCapability("reports:read");

  const [donors, gifts, auditEvents] = await Promise.all([listDonors(), listRecentGifts(), recentAuditEvents()]);
  const givingTotal = gifts.reduce((sum, gift) => sum + Number(gift.amount_cents), 0) / 100;

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
          <strong>{donors.length}</strong>
        </article>
        <article className="stat">
          <span className="muted">Recent gifts</span>
          <strong>{gifts.length}</strong>
        </article>
        <article className="stat">
          <span className="muted">Recent total</span>
          <strong>${givingTotal.toLocaleString()}</strong>
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
                <td className="muted">Leaderboard, yearly giving, recent activity</td>
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
              {auditEvents.map((event) => (
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
