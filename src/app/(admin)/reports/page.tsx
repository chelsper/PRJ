import Link from "next/link";

import { ReportsExportBuilder } from "@/components/reports/reports-export-builder";
import { getSessionWithCapability, requireCapability } from "@/server/auth/permissions";
import { donorsThisYearExportColumns } from "@/server/data/report-export-columns";
import {
  donorRecognitionLeaderboard,
  donorsThisYearSummary,
  givingLevelSnapshot,
  prjPledgedByCalendarYear,
  prjReceivedByCalendarYear,
  prjTotalSnapshot,
  type DonorRecognitionRow,
  type DonorsThisYearRow,
  type GivingLevelSnapshotRow,
  type PrjYearRow
} from "@/server/data/reports";

function reportGivingLevelLabel(level: string | null, snapshot: GivingLevelSnapshotRow[]) {
  if (!level) {
    return null;
  }

  return snapshot.find((row: GivingLevelSnapshotRow) => row.giving_level_internal === level)?.giving_level_display ?? level;
}

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ givingLevel?: string; tab?: string; report?: string }>;
}) {
  await requireCapability("reports:read");
  const { givingLevel, tab, report } = await searchParams;
  const exportSession = await getSessionWithCapability("exports:run");
  const activeTab = tab === "exports" ? "exports" : "overview";

  const [donorTotals, prjTotals, receivedByYear, pledgedByYear, levelSnapshot, donorsThisYear] = await Promise.all([
    donorRecognitionLeaderboard(givingLevel),
    prjTotalSnapshot(),
    prjReceivedByCalendarYear(),
    prjPledgedByCalendarYear(),
    givingLevelSnapshot(),
    donorsThisYearSummary(15)
  ]);
  const selectedGivingLevelLabel = reportGivingLevelLabel(givingLevel ?? null, levelSnapshot);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Reports</p>
        <h1>Recognition totals and organizational totals</h1>
        <p className="muted">
          Donor recognition totals include eligible hard and soft credits. PRJ totals use hard-credit gift records only.
        </p>
      </section>

      <nav className="tab-row">
        <Link href="/reports" className={activeTab === "overview" ? "tab-link active" : "tab-link"}>
          Overview
        </Link>
        {exportSession ? (
          <Link
            href={`/reports?tab=exports${report ? `&report=${encodeURIComponent(report)}` : ""}`}
            className={activeTab === "exports" ? "tab-link active" : "tab-link"}
          >
            Exports
          </Link>
        ) : null}
      </nav>

      {activeTab === "exports" ? (
        exportSession ? (
          <section className="card">
            <p className="eyebrow">Exports</p>
            <h2>Donors This Year CSV</h2>
            <p className="muted">Choose which columns to include, then download the full current-year donor export.</p>
            <ReportsExportBuilder
              report="donors_this_year"
              columns={[...donorsThisYearExportColumns]}
            />
          </section>
        ) : null
      ) : (
        <>
      <section className="stats">
        <article className="stat">
          <span className="muted">PRJ total received to date</span>
          <strong>${(prjTotals.total_received_cents / 100).toLocaleString()}</strong>
        </article>
        <article className="stat">
          <span className="muted">PRJ total pledged to date</span>
          <strong>${(prjTotals.total_pledged_cents / 100).toLocaleString()}</strong>
        </article>
      </section>

      <section className="table-shell">
        <div className="section-header">
          <div>
            <p className="eyebrow">Top 15 Donors This Calendar Year</p>
            <p className="muted">Current-year hard-credit donors with associated soft-credit donors, received totals, and pledged totals.</p>
          </div>
          {exportSession ? (
            <Link href="/reports?tab=exports&report=donors_this_year" className="button-link secondary-link">
              Download donors this year CSV
            </Link>
          ) : null}
        </div>
        <div className="table-workspace-summary"><span>{donorsThisYear.length} {donorsThisYear.length === 1 ? "donor" : "donors"} shown</span><span>Calendar year {new Date().getFullYear()}</span></div>
        <div className="table-scroll"><table>
          <thead>
            <tr>
              <th>Donor Name</th>
              <th>Soft Credit Donor</th>
              <th>Total Amount Received</th>
              <th>Total Amount Pledged</th>
              <th><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {donorsThisYear.length ? donorsThisYear.map((row: DonorsThisYearRow) => (
              <tr key={row.donor_id} className="table-row-actionable">
                <td>
                  <Link href={`/donors/${row.donor_id}`} className="table-link">
                    {row.donor_name}
                  </Link>
                </td>
                <td>{row.soft_credit_donors ?? "—"}</td>
                <td>${(row.total_received_cents / 100).toLocaleString()}</td>
                <td>${(row.total_pledged_cents / 100).toLocaleString()}</td>
                <td><Link href={`/donors/${row.donor_id}`} className="table-open-link">Open</Link></td>
              </tr>
            )) : <tr><td colSpan={5} className="table-empty-state">No donors have qualifying gifts this calendar year.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="table-shell">
        <div className="section-header"><div><p className="eyebrow">Donor Recognition Totals</p><h2>{donorTotals.length} {donorTotals.length === 1 ? "donor" : "donors"}</h2></div></div>
        <form action="/reports" className="table-workspace-toolbar report-filter-toolbar">
          <label className="table-workspace-search">Current-year giving level<select name="givingLevel" defaultValue={givingLevel ?? ""}><option value="">All giving levels</option>{levelSnapshot.map((level) => <option key={level.giving_level_internal} value={level.giving_level_internal}>{level.giving_level_display}</option>)}</select></label>
          <div className="table-workspace-actions"><button type="submit">Apply filter</button><Link href="/reports" className="button-link secondary-link">Clear</Link></div>
        </form>
        {selectedGivingLevelLabel ? <p className="active-filter-note">Showing current-year giving level: <strong>{selectedGivingLevelLabel}</strong></p> : null}
        <div className="table-scroll"><table>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Recognition total</th>
              <th>Hard-credit lifetime</th>
              <th>Soft-credit lifetime</th>
              <th><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {donorTotals.length ? donorTotals.map((row: DonorRecognitionRow) => (
              <tr key={row.donor_id} className="table-row-actionable">
                <td>
                  <Link href={`/donors/${row.donor_id}`} className="table-link">
                    {row.donor_name}
                  </Link>
                </td>
                <td>${(row.donor_recognition_cents / 100).toLocaleString()}</td>
                <td>${(row.donor_hard_credit_cents / 100).toLocaleString()}</td>
                <td>${(row.donor_soft_credit_cents / 100).toLocaleString()}</td>
                <td><Link href={`/donors/${row.donor_id}`} className="table-open-link">Open</Link></td>
              </tr>
            )) : <tr><td colSpan={5} className="table-empty-state">No donors match this giving-level filter.</td></tr>}
          </tbody>
        </table></div>
      </section>

      <section className="grid grid-2">
        <article className="table-shell">
          <p className="eyebrow">PRJ Total Received By Calendar Year</p>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Hard-credit received</th>
              </tr>
            </thead>
            <tbody>
              {receivedByYear.map((row: PrjYearRow) => (
                <tr key={row.calendar_year}>
                  <td>{row.calendar_year}</td>
                  <td>${(row.total_cents / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="table-shell">
          <p className="eyebrow">PRJ Total Pledged By Calendar Year</p>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Hard-credit pledged</th>
              </tr>
            </thead>
            <tbody>
              {pledgedByYear.map((row: PrjYearRow) => (
                <tr key={row.calendar_year}>
                  <td>{row.calendar_year}</td>
                  <td>${(row.total_cents / 100).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </section>
        </>
      )}
    </div>
  );
}
