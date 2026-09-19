"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewDuplicateAction } from "@/app/(admin)/admin/data-quality/actions";

export function DuplicateReviewForm({ leftId, rightId, fingerprint, reopen = false }: {
  leftId: string; rightId: string; fingerprint: string; reopen?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  return <details><summary>{reopen ? "Reopen review" : "These are different constituents"}</summary>
    <form className="grid" onSubmit={async event => {
      event.preventDefault();
      if (busy || !confirmed) return;
      setBusy(true); setMessage("");
      try {
        const result = await reviewDuplicateAction({ leftId, rightId, fingerprint, reason, decision: reopen ? "reopen" : "dismiss" });
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch { setMessage("The review could not be confirmed. Refresh to check its status."); }
      finally { setBusy(false); }
    }}>
      <p>{reopen ? "Reopening removes the previous dismissal." : "This hides this pair from the review queue until its matching details change. It does not alter either profile or change import duplicate checks."}</p>
      <label>Reason<textarea required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} placeholder="Explain your review decision" /></label>
      <label className="toggle-row"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />{reopen ? "I want this pair reviewed again." : "I reviewed both profiles and confirm they are different constituents."}</label>
      <div className="button-row"><button type="submit" disabled={busy || !confirmed || reason.trim().length < 5}>{busy ? "Saving review..." : reopen ? "Reopen review" : "Mark as different"}</button></div>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </details>;
}
