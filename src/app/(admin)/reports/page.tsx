import { requireCapability } from "@/server/auth/permissions";
import {
  donorRecognitionLeaderboard,
  prjPledgedByCalendarYear,
  prjReceivedByCalendarYear,
  prjTotalSnapshot,
  type DonorRecognitionRow,
  type PrjYearRow
} from "@/server/data/reports";

export default async function ReportsPage() {
  await requireCapability("reports:read");

  const [donorTotals, prjTotals, receivedByYear, pledgedByYear] = await Promise.all([
    donorRecognitionLeaderboard(),
    prjTotalSnapshot(),
    prjReceivedByCalendarYear(),
    prjPledgedByCalendarYear()
  ]);

  return (
    <div className="grid">
      <section className="hero">
        <p className="eyebrow">Reports</p>
        <h1>Recognition totals and organizational totals</h1>
        <p className="muted">
          Donor recognition totals include eligible hard and soft credits. PRJ totals use hard-credit gift records only.
        </p>
      </section>

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
        <p className="eyebrow">Donor Recognition Totals</p>
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
                <td>{row.donor_name}</td>
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
    </div>
  );
}
