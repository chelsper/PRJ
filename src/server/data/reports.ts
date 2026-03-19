import { query } from "@/server/db";

export type DonorRecognitionRow = {
  donor_id: string;
  donor_name: string;
  primary_email: string | null;
  giving_level_internal: string | null;
  giving_level_display: string | null;
  donor_recognition_cents: number;
  donor_hard_credit_cents: number;
  donor_soft_credit_cents: number;
};

export type GivingLevelSnapshotRow = {
  giving_level_internal: string;
  giving_level_display: string;
  donor_count: number;
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

export type DonorsThisYearRow = {
  donor_id: string;
  donor_name: string;
  soft_credit_donors: string | null;
  total_received_cents: number;
  total_pledged_cents: number;
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

export async function donorRecognitionLeaderboard(givingLevel?: string): Promise<DonorRecognitionRow[]> {
  const result = await query<DonorRecognitionRow>(
    `select
      t.donor_id::text,
      t.donor_name,
      t.primary_email,
      gl.giving_level_internal,
      gl.giving_level_display,
      t.donor_recognition_cents,
      t.donor_hard_credit_cents,
      t.donor_soft_credit_cents
     from public.donor_giving_totals t
     left join public.donor_current_year_giving_levels gl on gl.donor_id = t.donor_id
     where ($1::text is null or gl.giving_level_internal = $1)
     order by t.donor_recognition_cents desc, t.donor_name asc
     limit 100`,
    [givingLevel ?? null]
  );

  return result.rows;
}

export async function givingLevelSnapshot(): Promise<GivingLevelSnapshotRow[]> {
  const result = await query<GivingLevelSnapshotRow>(
    `select
      gl.giving_level_internal,
      gl.giving_level_display,
      count(*)::int as donor_count
     from public.donor_current_year_giving_levels gl
     where gl.giving_level_internal is not null
     group by gl.giving_level_internal, gl.giving_level_display
     order by case gl.giving_level_internal
       when 'TITLE_SPONSOR' then 1
       when 'PREEMINENT_SPONSOR' then 2
       when 'PINK_ADVOCATE_SPONSOR' then 3
       when 'PINK_WARRIOR_SPONSOR' then 4
       when 'PREMIER_SPONSOR' then 5
       when 'CHAMPION_SPONSOR' then 6
       when 'HOPE_SPONSOR' then 7
       when 'PINK_HERO_SPONSOR' then 8
       when 'PINK_HEART_SPONSOR' then 9
       when 'PINK_RIBBON_FRIEND' then 10
       else 999
     end asc`
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

export async function donorsThisYearSummary(limit?: number): Promise<DonorsThisYearRow[]> {
  const result = await query<DonorsThisYearRow>(
    `with current_year_gifts as (
        select
          g.id,
          g.donor_id,
          g.gift_type,
          g.amount_cents
        from public.gifts g
        where g.deleted_at is null
          and extract(year from g.gift_date) = extract(year from current_date)
      )
      select
        d.id::text as donor_id,
        coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
        nullif(
          string_agg(
            distinct coalesce(sd.organization_name, concat_ws(' ', sd.first_name, sd.last_name)),
            ', '
          ) filter (
            where sd.id is not null
              and coalesce(sd.organization_name, concat_ws(' ', sd.first_name, sd.last_name)) <> ''
          ),
          ''
        ) as soft_credit_donors,
        coalesce(sum(
          case
            when g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT')
              then g.amount_cents
            else 0
          end
        ), 0)::int as total_received_cents,
        coalesce(sum(
          case
            when g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE')
              then g.amount_cents
            else 0
          end
        ), 0)::int as total_pledged_cents
      from current_year_gifts g
      inner join public.donors d on d.id = g.donor_id
      left join public.soft_credits sc on sc.gift_id = g.id
      left join public.donors sd on sd.id = sc.donor_id
      group by d.id
      order by (coalesce(sum(
        case
          when g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT', 'PLEDGE', 'MATCHING_GIFT_PLEDGE')
            then g.amount_cents
          else 0
        end
      ), 0)) desc, donor_name asc
      limit coalesce($1::int, 1000)`,
    [limit ?? null]
  );

  return result.rows;
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
