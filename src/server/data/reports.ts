import { query } from "@/src/server/db";

export async function lifetimeGivingLeaderboard() {
  const result = await query<{
    donor_id: string;
    donor_name: string;
    lifetime_giving_cents: number;
  }>(
    `select donor_id::text, donor_name, lifetime_giving_cents
     from lifetime_giving_by_donor
     order by lifetime_giving_cents desc
     limit 25`
  );

  return result.rows;
}

export async function recentAuditEvents() {
  const result = await query<{
    occurred_at: string;
    action: string;
    entity_type: string;
    status: string;
  }>(
    `select occurred_at::text, action, entity_type, status
     from audit_log
     order by occurred_at desc
     limit 50`
  );

  return result.rows;
}
