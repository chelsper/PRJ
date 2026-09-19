"use client";
import Link from "next/link";
import { useState } from "react";
import type { ProfileQuery } from "@/lib/profile-query";
import { reviewProfileAudience } from "@/app/(admin)/reports/queries/actions";

export function AudienceReview({ query }: { query: ProfileQuery }) {
  const [result, setResult] = useState<Awaited<ReturnType<typeof reviewProfileAudience>> | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return <section className="card">
    <h2>Review Texting Audience</h2>
    <p>Recheck current query matches and saved texting permissions. This review does not send or schedule messages.</p>
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true); setResult(null); setSelected([]);
      try { const response = await reviewProfileAudience(query); setResult(response); setSelected(response.rows?.filter(row => row.eligible).map(row => row.id) ?? []); }
      catch { setResult({ error: "Unable to review. Check your connection and permissions, then try again." }); }
      finally { setBusy(false); }
    }}>{busy ? "Checking permissions..." : "Review audience"}</button>
    {result?.error && <p role="alert" className="danger">{result.error}</p>}
    {result?.rows && <>
      <p role="status">{selected.length} selected / {result.rows.filter(row => row.eligible).length} eligible. {result.rows.filter(row => !row.eligible).length} excluded.</p>
      <div className="button-row"><button type="button" onClick={() => setSelected(result.rows.filter(row => row.eligible).map(row => row.id))}>Select eligible</button><button type="button" onClick={() => setSelected([])}>Clear selection</button></div>
      <div className="table-scroll"><table><thead><tr><th>Select</th><th>Profile</th><th>Texting number</th><th>Eligibility</th></tr></thead><tbody>
        {result.rows.map(row => <tr key={row.id}><td><input type="checkbox" aria-label={`Select ${row.name}`} disabled={!row.eligible} checked={selected.includes(row.id)} onChange={event => setSelected(event.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))} /></td><td><Link href={`/donors/${row.id}?tab=communications`}>{row.name}</Link></td><td>{row.phone || "Not saved"}</td><td>{row.reason}</td></tr>)}
      </tbody></table></div>
      <p className="muted">Selection is temporary and is cleared when filters change. Group sending is not enabled yet. Consent must be checked again at submission; this review is not a delivery guarantee.</p>
    </>}
  </section>;
}
