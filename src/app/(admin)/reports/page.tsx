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
        <table>
          <thead>
            <tr>
              <th>Donor Name</th>
              <th>Soft Credit Donor</th>
              <th>Total Amount Received</th>
              <th>Total Amount Pledged</th>
            </tr>
          </thead>
          <tbody>
            {donorsThisYear.map((row: DonorsThisYearRow) => (
              <tr key={row.donor_id}>
                <td>
                  <Link href={`/donors/${row.donor_id}`} className="table-link">
                    {row.donor_name}
                  </Link>
                </td>
                <td>{row.soft_credit_donors ?? "—"}</td>
                <td>${(row.total_received_cents / 100).toLocaleString()}</td>
                <td>${(row.total_pledged_cents / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="table-shell">
        <p className="eyebrow">Donor Recognition Totals</p>
        {selectedGivingLevelLabel ? (
          <p className="muted">
            Showing donors in current-year giving level: <strong>{selectedGivingLevelLabel}</strong>.{" "}
            <Link href="/reports" className="inline-link">
              Clear filter
            </Link>
          </p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>Donor</th>
              <th>Recognition total</th>
              <th>Hard-credit lifetime</th>
              <th>Soft-credit lifetime</th>
            </tr>
          </thead>
          <tbody>
            {donorTotals.map((row: DonorRecognitionRow) => (
              <tr key={row.donor_id}>
                <td>
                  <Link href={`/donors/${row.donor_id}`} className="table-link">
                    {row.donor_name}
                  </Link>
                </td>
                <td>${(row.donor_recognition_cents / 100).toLocaleString()}</td>
                <td>${(row.donor_hard_credit_cents / 100).toLocaleString()}</td>
                <td>${(row.donor_soft_credit_cents / 100).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
