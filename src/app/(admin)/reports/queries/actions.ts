"use server";
import { requireCapability } from "@/server/auth/permissions";
import { assertSameOrigin } from "@/server/security/csrf";
import { profileQuerySchema, ruleLabel } from "@/lib/profile-query";
import { compileProfileQuery } from "@/server/data/profile-query";
import { transaction } from "@/server/db";

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
