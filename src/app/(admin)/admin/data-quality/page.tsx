import Link from "next/link";
import { AdminSectionNav } from "@/components/admin/admin-section-nav";
import { requireCapability } from "@/server/auth/permissions";
import { qualityDonors, importHistory } from "@/server/data/data-quality";
import { contactIssues, findDuplicatePairs, type QualityDonor } from "@/server/data/data-quality-rules";

function RecordSummary({ donor }: { donor: QualityDonor }) {
  return <div><Link href={`/donors/${donor.id}`}>{donor.full_name || "Unnamed constituent"}</Link>
    <p>ID {donor.donor_number} · {donor.donor_type}</p>
    <p>{donor.primary_email || "No primary email"}<br />{donor.alternate_email || ""}<br />{donor.primary_phone || "No phone"}</p></div>;
}

export default async function DataQualityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireCapability("users:manage");
  const { tab } = await searchParams;
  const active = tab === "contacts" || tab === "imports" ? tab : "duplicates";
  const { rows, truncated } = await qualityDonors();
  const pairs = findDuplicatePairs(rows, 101);
  const issues = rows.map(donor => ({ donor, reasons: contactIssues(donor) })).filter(item => item.reasons.length);
  const history = active === "imports" ? await importHistory() : [];
  return <div className="grid">
    <section className="hero"><p className="eyebrow">Admin</p><h1>Data Quality</h1>
      <p>Review potential duplicates and contact details before making changes. No records are automatically merged or deleted.</p></section>
    <AdminSectionNav active="data-quality" />
    <section className="card"><p>{rows.length.toLocaleString()} active constituent records checked. Deleted records and patient cases are excluded.</p>
      {truncated && <p role="alert">This review is limited to the first 10,000 active records by ID. It is not a complete database scan.</p>}
      <nav className="tab-row" aria-label="Data quality checks">
        <Link className={`tab-link${active === "duplicates" ? " active" : ""}`} href="/admin/data-quality" aria-current={active === "duplicates" ? "page" : undefined}>Possible duplicates ({pairs.length > 100 ? "100+" : pairs.length})</Link>
        <Link className={`tab-link${active === "contacts" ? " active" : ""}`} href="/admin/data-quality?tab=contacts" aria-current={active === "contacts" ? "page" : undefined}>Contact review ({issues.length})</Link>
        <Link className={`tab-link${active === "imports" ? " active" : ""}`} href="/admin/data-quality?tab=imports" aria-current={active === "imports" ? "page" : undefined}>Import history</Link>
      </nav>
    </section>
    {active === "duplicates" && <section className="card"><h2>Possible Duplicates</h2>
      <p>Flags matching name plus email or phone, or matching email plus phone. Email matching includes alternate email. Linked spouses and different record types are excluded. Shared addresses alone are not used.</p>
      <p>These are suggestions, not confirmed duplicates. Open each profile to investigate; merging is not available in this first release.</p>
      {!pairs.length && <p>No matches found using these rules. This does not rule out duplicates with different or missing contact details.</p>}
      {pairs.length > 100 && <p>Showing the first 100 matching pairs.</p>}
      <div className="grid">{pairs.slice(0, 100).map(pair => <article className="card" key={`${pair.left.id}-${pair.right.id}`}><h3>{pair.reasons.join(" · ")}</h3><div className="form-grid"><RecordSummary donor={pair.left} /><RecordSummary donor={pair.right} /></div></article>)}</div>
    </section>}
    {active === "contacts" && <section className="card"><h2>Contact Details to Review</h2><p>Missing details are not necessarily errors. Only add information you have a legitimate reason to keep. Format checks do not verify deliverability.</p>
      {!issues.length && <p>No contact issues found using these checks.</p>}
      {issues.length > 200 && <p>Showing the first 200 records with issues. Correct records and refresh to see more.</p>}
      <div className="grid">{issues.slice(0, 200).map(({ donor, reasons }) => <article className="card" key={donor.id}><RecordSummary donor={donor} /><p>{reasons.join(" · ")}</p><Link href={`/donors/${donor.id}`}>Review profile</Link></article>)}</div>
    </section>}
    {active === "imports" && <section className="table-shell"><h2>Constituent Import History</h2><p>Most recent 50 import events. History starts with this update; earlier imports are not reconstructed. A started event without a completion event does not confirm success. Check existing records before retrying.</p><Link href="/imports?type=constituents">Open constituent import</Link>
      {!history.length ? <p>No import events recorded yet.</p> : <div className="table-scroll"><table><thead><tr><th>When (UTC)</th><th>File / batch</th><th>Event</th><th>Rows</th><th>Created</th><th>Skipped or failed</th></tr></thead><tbody>{history.map(event => <tr key={event.id}><td>{event.occurred_at}</td><td>{event.metadata.fileName}<br />{event.metadata.batchId}</td><td>{event.action.split(".").pop()}</td><td>{event.metadata.rowCount ?? "—"}</td><td>{event.metadata.createdCount ?? "—"}</td><td>{event.metadata.skippedCount ?? "—"}</td></tr>)}</tbody></table></div>}
    </section>}
  </div>;
}
