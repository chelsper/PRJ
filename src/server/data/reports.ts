import { query } from "@/server/db";

export type DonorRecognitionRow = {
  donor_id: string;
  donor_name: string;
  primary_email: string | null;
  donor_recognition_cents: number;
  donor_hard_credit_cents: number;
  donor_soft_credit_cents: number;
};

export type PrjTotalSnapshot = {
  total_received_cents: number;
  total_pledged_cents: number;
};

export type PrjYearRow = {
  calendar_year: number;
  total_cents: number;
};

export type DashboardTotals = {
  visible_donors: number;
  recent_gifts: number;
  prj_total_received_cents: number;
  prj_total_pledged_cents: number;
};

export type AuditEventRow = {
  id: string;
  occurred_at: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  status: string;
  metadata_text: string;
};

export async function donorRecognitionLeaderboard(): Promise<DonorRecognitionRow[]> {
  const result = await query<DonorRecognitionRow>(
    `select
      donor_id::text,
      donor_name,
      primary_email,
      donor_recognition_cents,
      donor_hard_credit_cents,
      donor_soft_credit_cents
     from public.donor_giving_totals
     order by donor_recognition_cents desc, donor_name asc
     limit 100`
  );

  return result.rows;
}

export async function prjTotalSnapshot(): Promise<PrjTotalSnapshot> {
  const result = await query<PrjTotalSnapshot>(
    `select
      coalesce(sum(case when gift_bucket = 'RECEIVED' then total_cents else 0 end), 0)::int as total_received_cents,
      coalesce(sum(case when gift_bucket = 'PLEDGED' then total_cents else 0 end), 0)::int as total_pledged_cents
     from (
       select 'RECEIVED'::text as gift_bucket, total_received_cents as total_cents
       from public.prj_total_received_to_date
       union all
       select 'PLEDGED'::text as gift_bucket, total_pledged_cents as total_cents
       from public.prj_total_pledged_to_date
     ) totals`
  );

  return result.rows[0];
}

export async function prjReceivedByCalendarYear(): Promise<PrjYearRow[]> {
  const result = await query<PrjYearRow>(
    `select calendar_year, total_received_cents::int as total_cents
     from public.prj_total_received_by_calendar_year
     order by calendar_year desc`
  );

  return result.rows;
}

export async function prjPledgedByCalendarYear(): Promise<PrjYearRow[]> {
  const result = await query<PrjYearRow>(
    `select calendar_year, total_pledged_cents::int as total_cents
     from public.prj_total_pledged_by_calendar_year
     order by calendar_year desc`
  );

  return result.rows;
}

export async function dashboardTotals(): Promise<DashboardTotals> {
  const result = await query<DashboardTotals>(
    `select
      (select count(*)::int from public.donors where deleted_at is null) as visible_donors,
      (select count(*)::int from public.gifts where deleted_at is null) as recent_gifts,
      (select total_received_cents::int from public.prj_total_received_to_date) as prj_total_received_cents,
      (select total_pledged_cents::int from public.prj_total_pledged_to_date) as prj_total_pledged_cents`
  );

  return result.rows[0];
}

export async function recentAuditEvents(): Promise<AuditEventRow[]> {
  const result = await query<AuditEventRow>(
    `select
      l.id::text,
      l.occurred_at::text,
      u.email as actor_email,
      l.action,
      l.entity_type,
     l.entity_id,
      l.status,
      l.metadata::text as metadata_text
     from public.audit_log l
     left join public.users u on u.id = l.actor_user_id
     order by l.occurred_at desc
     limit 50`
  );

  return result.rows;
}
