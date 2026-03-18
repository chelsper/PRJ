import { query } from "@/server/db";

export type LifetimeGivingRow = {
  donor_id: string;
  donor_name: string;
  lifetime_giving_cents: number;
};

export type AuditEventRow = {
  occurred_at: string;
  action: string;
  entity_type: string;
  status: string;
};

export async function lifetimeGivingLeaderboard(): Promise<LifetimeGivingRow[]> {
  const result = await query<LifetimeGivingRow>(
    `select donor_id::text, donor_name, lifetime_giving_cents
     from lifetime_giving_by_donor
     order by lifetime_giving_cents desc
     limit 25`
  );

  return result.rows;
}

export async function recentAuditEvents(): Promise<AuditEventRow[]> {
  const result = await query<AuditEventRow>(
    `select occurred_at::text, action, entity_type, status
     from audit_log
     order by occurred_at desc
     limit 50`
  );

  return result.rows;
}
