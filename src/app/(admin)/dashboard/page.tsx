import Link from "next/link";

import { requireCapability } from "@/server/auth/permissions";
import { dashboardTotals } from "@/server/data/reports";

export default async function DashboardPage() {
  await requireCapability("reports:read");

  const totals = await dashboardTotals();

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Dashboard</p>
        <h1>Pink Ribbon Jax donor workspace</h1>
        <p className="muted">
          Start with the core tasks staff use most: find a donor, enter a gift, review reporting, or manage imports.
        </p>
        <div className="button-row">
          <Link href="/donors" className="button-link">
            Find Donors
          </Link>
          <Link href="/gifts" className="button-link secondary-link">
            Add Gift
          </Link>
          <Link href="/reports" className="inline-link">
            Open reports
          </Link>
        </div>
      </section>

      <section className="stats">
        <article className="stat">
          <span className="muted">Active donors</span>
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
        <article className="card">
          <p className="eyebrow">Start Here</p>
          <div className="grid">
            <div className="stat">
              <span className="muted">Donors</span>
              <strong>Search, review, and update constituent records.</strong>
              <div className="button-row">
                <Link href="/donors" className="inline-link">
                  Open donor lookup
                </Link>
              </div>
            </div>
            <div className="stat">
              <span className="muted">Gifts</span>
              <strong>Enter gifts, manage pledges, and send receipts.</strong>
              <div className="button-row">
                <Link href="/gifts" className="inline-link">
                  Open gifts
                </Link>
              </div>
            </div>
          </div>
        </article>

        <article className="card">
          <p className="eyebrow">Reporting Focus</p>
          <div className="grid">
            <div className="stat">
              <span className="muted">Recognition reporting</span>
              <strong>Use donor totals and giving levels for stewardship and sponsor visibility.</strong>
            </div>
            <div className="stat">
              <span className="muted">Organization totals</span>
              <strong>Keep received and pledged reporting separate from donor recognition totals.</strong>
            </div>
            <div className="button-row">
              <Link href="/reports" className="button-link secondary-link">
                Review reports
              </Link>
              <Link href="/imports" className="inline-link">
                Prepare imports
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
