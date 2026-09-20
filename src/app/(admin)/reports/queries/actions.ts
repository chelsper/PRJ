"use server";
import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { profileQuerySchema, ruleLabel } from "@/lib/profile-query";
import { compileProfileQuery } from "@/server/data/profile-query";
import { transaction } from "@/server/db";
import { reviewSmsAudience } from "@/lib/sms-audience";
import { queryResultsCsv } from "@/lib/query-export";
import { writeAuditLog } from "@/server/audit";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { headers } from "next/headers";

export async function exportProfileQuery(raw: unknown, expectedCount: number) {
  await assertSameOrigin();
  const session = await requireCapability("exports:run");
  await consumeRateLimit({ key: `query-export:${session.userId}`, action: "query_export", maxAttempts: 10, windowSeconds: 900 });
  const result = await previewProfileQuery(raw);
  if (!result.rows) return { error: result.error ?? "Run the query again." };
  if (!Number.isInteger(expectedCount) || result.count !== expectedCount) return { error: "The matching count has changed. Run the query again and review the updated results before exporting." };
  const ipAddress = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  try {
    const csv = queryResultsCsv(result.rows, result.count);
    await writeAuditLog({ actorUserId: session.userId, action: "export.query", entityType: "report", entityId: "profile_query", status: "success", ipAddress, metadata: { rowCount: result.count } });
    return { csv, count: result.count };
  } catch (error) {
    return { error: result.count > 200 ? "Narrow your query to 200 profiles or fewer; no partial export will be downloaded." : result.count === 0 ? "No profiles match." : "Export could not complete. Run the query again before retrying." };
  }
}

export async function reviewProfileAudience(raw: unknown) {
  await assertSameOrigin();
  await requireCapability("donors:write");
  const preview = await previewProfileQuery(raw);
  if (!preview.rows) return { error: preview.error ?? "Run the query again." };
  if (preview.count > 200) return { error: "More than 200 profiles match. Narrow your query before reviewing an audience; no partial audience will be selected." };
  try {
    const rows = await transaction(async client => {
      await client.query("set local statement_timeout = '10s'");
      const result = await client.query<{ id: string; phone: string | null; consent: string | null }>(
        `select d.id::text, p.phone, case when exists (
           select 1 from public.donor_sms_preferences blocked
           where blocked.phone = p.phone and blocked.consent_status = 'OPTED_OUT'
         ) then 'OPTED_OUT' else p.consent_status end as consent
         from public.donors d left join public.donor_sms_preferences p on p.donor_id = d.id
         where d.id = any($1::bigint[]) and d.deleted_at is null order by d.id`,
        [preview.rows.map(row => row.id)]
      );
      return result.rows;
    });
    return { rows: reviewSmsAudience(rows.map(row => ({ ...row, name: preview.rows.find(profile => profile.id === row.id)?.name ?? "Constituent" }))) };
  } catch { return { error: "Audience review could not complete. No messages were sent." }; }
}

export async function previewProfileQuery(raw: unknown) {
  await assertSameOrigin();
  await requireCapability("reports:read");
  await requireCapability("donors:read");
  await requireCapability("gifts:read");
  const parsed = profileQuerySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const compiled = compileProfileQuery(parsed.data);
  try {
    const result = await transaction(async client => {
      await client.query("set local statement_timeout = '10s'");
      return client.query(compiled.sql, compiled.params);
    });
    return { count: Number(result.rows[0]?.match_count ?? 0), rows: result.rows.map(row => ({
      id: String(row.id), name: String(row.full_name), number: String(row.donor_number),
      total: (Number(row.total_cents) / 100).toFixed(2),
      credit: row.has_hard && row.has_soft ? "Hard and soft credits" : row.has_hard ? "Hard credit" : row.has_soft ? "Soft credit" : "No eligible gifts",
      reasons: parsed.data.rules.filter((_, index) => row[`rule_${index}`]).map(ruleLabel)
    })) };
  } catch { return { error: "The query could not complete. Try fewer conditions or a narrower gift period." }; }
}
