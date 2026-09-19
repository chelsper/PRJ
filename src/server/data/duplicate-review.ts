import { createHash } from "node:crypto";
import { query, transaction } from "@/server/db";
import { duplicatePairKey, duplicateReasons, type QualityDonor } from "./data-quality-rules";

export function pairFingerprint(donors: QualityDonor[]) {
  const values = [...donors].sort((a, b) => a.id.localeCompare(b.id)).map(donor => [
    donor.id, donor.donor_type, donor.full_name, donor.primary_email, donor.alternate_email,
    donor.primary_phone, donor.spouse_donor_id
  ]);
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

export type DuplicateReview = {
  entity_id: string; action: string; occurred_at: string; actor_email: string | null;
  metadata: { leftId: string; rightId: string; fingerprint: string; reason: string };
};

export async function duplicateReviews() {
  return (await query<DuplicateReview>(`select distinct on (l.entity_id)
    l.entity_id, l.action, l.occurred_at::text, u.email::text as actor_email, l.metadata
    from public.audit_log l left join public.users u on u.id = l.actor_user_id
    where l.action in ('quality.duplicate.dismissed', 'quality.duplicate.reopened') and l.status = 'success'
    order by l.entity_id, l.occurred_at desc, l.id desc`)).rows;
}

export async function recordDuplicateReview(input: {
  leftId: string; rightId: string; fingerprint: string; reason: string;
  decision: "dismiss" | "reopen"; userId: string;
}) {
  return transaction(async client => {
    // Serialize decisions for a pair and check the current records before recording one.
    const key = duplicatePairKey(input.leftId, input.rightId);
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`quality:${key}`]);
    const result = await client.query<QualityDonor>(`select id::text, donor_number::text, donor_type,
      case when donor_type = 'ORGANIZATION' then coalesce(organization_name, '')
      else trim(concat_ws(' ', first_name, last_name)) end as full_name,
      primary_email::text, alternate_email::text, primary_phone, spouse_donor_id::text
      from public.donors where id in ($1::bigint, $2::bigint) and deleted_at is null order by id for share`,
      [input.leftId, input.rightId]);
    if (result.rows.length !== 2) return { success: false, message: "One of these records is no longer available. Refresh the review." };
    const fingerprint = pairFingerprint(result.rows);
    if (fingerprint !== input.fingerprint) return { success: false, message: "Record details changed. Refresh and review the pair again before saving." };
    if (input.decision === "dismiss" && !duplicateReasons(result.rows[0], result.rows[1]).length) {
      return { success: false, message: "This pair no longer matches the duplicate rules. Refresh the review." };
    }
    await client.query(`insert into public.audit_log (actor_user_id, action, entity_type, entity_id, status, metadata)
      values ($1, $2, 'duplicate_pair', $3, 'success', $4::jsonb)`, [input.userId,
      input.decision === "dismiss" ? "quality.duplicate.dismissed" : "quality.duplicate.reopened", key,
      JSON.stringify({ leftId: input.leftId, rightId: input.rightId, fingerprint, reason: input.reason })]);
    return { success: true, message: input.decision === "dismiss" ? "Marked as different constituents. Both records are unchanged." : "Review reopened. The pair will appear if it still matches the rules." };
  });
}
