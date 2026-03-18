import { requireCapability } from "@/server/auth/permissions";
import { lifetimeGivingLeaderboard, type LifetimeGivingRow } from "@/server/data/reports";

export default async function ReportsPage() {
  await requireCapability("reports:read");
  const leaderboard = await lifetimeGivingLeaderboard();

  return (
    <section className="table-shell">
      <p className="eyebrow">Reports</p>
      <h1>Lifetime giving leaderboard</h1>
      <table>
        <thead>
          <tr>
            <th>Donor</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((row: LifetimeGivingRow) => (
            <tr key={row.donor_id}>
              <td>{row.donor_name}</td>
              <td>${(row.lifetime_giving_cents / 100).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
