import Link from "next/link";

import { DonorPageSearch } from "@/components/donors/donor-page-search";
import { requireCapability } from "@/server/auth/permissions";
import { dashboardTotals, givingLevelSnapshot, type GivingLevelSnapshotRow } from "@/server/data/reports";

function dashboardGivingLevelLabel(level: GivingLevelSnapshotRow) {
  switch (level.giving_level_internal) {
    case "PINK_HEART_SPONSOR":
      return "Pink Heart";
    case "HOPE_SPONSOR":
      return "Hope";
    case "PINK_RIBBON_FRIEND":
      return "Friends";
    default:
      return level.giving_level_display.replace(/ Sponsor$/, "");
  }
}

export default async function DashboardPage() {
  await requireCapability("reports:read");

  const [totals, levelSnapshot] = await Promise.all([dashboardTotals(), givingLevelSnapshot()]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Dashboard</p>
        <h1>Pink Ribbon Jax Workspace</h1>
        <p className="muted">
          Quickly find donors, add gifts, send receipts, and track your impact.
        </p>
        <DonorPageSearch compact />
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
          <p className="eyebrow">Giving Level Snapshot</p>
          <h2>Giving Levels (This Year)</h2>
          {levelSnapshot.length === 0 ? (
            <p className="muted">No donors currently qualify for a giving level this year.</p>
          ) : (
            <div className="grid">
              {levelSnapshot.map((level: GivingLevelSnapshotRow) => (
                <div key={level.giving_level_internal} className="stat stat-row">
                  <Link href={`/reports?givingLevel=${encodeURIComponent(level.giving_level_internal)}`} className="inline-link stat-inline-link">
                    {level.donor_count}
                  </Link>
                  <strong>{dashboardGivingLevelLabel(level)}</strong>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <p className="eyebrow">Quick Actions</p>
          <div className="grid">
            <Link href="/donors" className="stat">
              <span className="muted">🔍 Find Donor</span>
              <strong>Search and open donor records.</strong>
            </Link>
            <Link href="/gifts" className="stat">
              <span className="muted">➕ Add Gift</span>
              <strong>Record a new contribution or pledge.</strong>
            </Link>
            <Link href="/receipts" className="stat">
              <span className="muted">🧾 Send Receipt</span>
              <strong>Search a donor, pick a recent gift, and generate a receipt.</strong>
            </Link>
            <Link href="/imports" className="stat">
              <span className="muted">📥 Import Gifts</span>
              <strong>Prepare batch gift imports.</strong>
            </Link>
            <Link href="/reports" className="stat">
              <span className="muted">📊 Run Report</span>
              <strong>Open reporting and exports.</strong>
            </Link>
          </div>
        </article>
      </section>

    </div>
  );
}
