import Link from "next/link";
import { requireCapability } from "@/server/auth/permissions";
import { ProfileQueryBuilder } from "@/components/reports/profile-query-builder";
import { profileQueryOptions } from "@/server/data/profile-query-options";

export default async function QueriesPage() {
  const session = await requireCapability("reports:read");
  const options = await profileQueryOptions();
  return <div className="grid"><section className="hero"><p className="eyebrow">Reports</p><h1>Find Matching Profiles</h1><p>Simple constituent and giving queries. Impact and patient data are kept separate. This page does not send messages.</p></section>
    <nav className="tab-row"><Link className="tab-link" href="/reports">Overview</Link><Link className="tab-link active" aria-current="page" href="/reports/queries">Queries</Link></nav>
    <ProfileQueryBuilder userId={session.userId} options={options} /></div>;
}
