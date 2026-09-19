import { query } from "@/server/db";
import type { QualityDonor } from "./data-quality-rules";

export async function qualityDonors() {
  const result = await query<QualityDonor>(`select id::text, donor_number::text, donor_type,
    case when donor_type = 'ORGANIZATION' then coalesce(organization_name, '')
    else trim(concat_ws(' ', first_name, last_name)) end as full_name,
    primary_email::text, alternate_email::text, primary_phone, spouse_donor_id::text
    from public.donors where deleted_at is null order by id limit 10001`);
  return { rows: result.rows.slice(0, 10000), truncated: result.rows.length > 10000 };
}

export async function importHistory() {
  return (await query<{ id: string; occurred_at: string; status: string; action: string;
    metadata: { batchId?: string; fileName?: string; rowCount?: number; createdCount?: number; skippedCount?: number } }>(
    `select id::text, occurred_at::text, status, action, metadata
     from public.audit_log where action in ('import.constituents.started', 'import.constituents.completed', 'import.constituents.failed')
     order by occurred_at desc, id desc limit 50`
  )).rows;
}
