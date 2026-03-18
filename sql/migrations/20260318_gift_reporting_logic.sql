alter table public.gifts add column if not exists gift_type varchar(30);

update public.gifts
set gift_type = 'CASH'
where gift_type is null;

alter table public.gifts alter column gift_type set not null;
alter table public.gifts alter column payment_method drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gifts_gift_type_check'
  ) then
    alter table public.gifts
      add constraint gifts_gift_type_check
      check (gift_type in (
        'PLEDGE',
        'PLEDGE_PAYMENT',
        'CASH',
        'STOCK_PROPERTY',
        'GIFT_IN_KIND',
        'MATCHING_GIFT_PLEDGE',
        'MATCHING_GIFT_PAYMENT'
      ));
  end if;
end $$;

create or replace view public.donor_giving_totals as
select
  d.id as donor_id,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  d.primary_email,
  coalesce(h.donor_hard_credit_cents, 0) as donor_hard_credit_cents,
  coalesce(s.donor_soft_credit_cents, 0) as donor_soft_credit_cents,
  coalesce(h.donor_hard_credit_cents, 0) + coalesce(s.donor_soft_credit_cents, 0) as donor_recognition_cents
from public.donors d
left join (
  select
    g.donor_id,
    sum(g.amount_cents) as donor_hard_credit_cents
  from public.gifts g
  where g.deleted_at is null
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by g.donor_id
) h on h.donor_id = d.id
left join (
  select
    sc.donor_id,
    sum(sc.amount_cents) as donor_soft_credit_cents
  from public.soft_credits sc
  inner join public.gifts g on g.id = sc.gift_id
  where g.deleted_at is null
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by sc.donor_id
) s on s.donor_id = d.id
where d.deleted_at is null;

create or replace view public.lifetime_giving_by_donor as
select
  donor_id,
  donor_name,
  primary_email,
  donor_recognition_cents as lifetime_giving_cents
from public.donor_giving_totals;

create or replace view public.prj_total_received_to_date as
select
  coalesce(sum(g.amount_cents), 0) as total_received_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT');

create or replace view public.prj_total_pledged_to_date as
select
  coalesce(sum(g.amount_cents), 0) as total_pledged_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE');

create or replace view public.prj_total_received_by_calendar_year as
select
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_received_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT')
group by extract(year from g.gift_date);

create or replace view public.prj_total_pledged_by_calendar_year as
select
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_pledged_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE')
group by extract(year from g.gift_date);

create or replace view public.giving_by_calendar_year as
select
  g.donor_id,
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_giving_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
group by g.donor_id, extract(year from g.gift_date);

create or replace view public.giving_by_fiscal_year as
select
  g.donor_id,
  case
    when extract(month from g.gift_date) >= 7 then extract(year from g.gift_date)::int + 1
    else extract(year from g.gift_date)::int
  end as fiscal_year,
  sum(g.amount_cents) as total_giving_cents
from public.gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
group by g.donor_id, case
  when extract(month from g.gift_date) >= 7 then extract(year from g.gift_date)::int + 1
  else extract(year from g.gift_date)::int
end;

create or replace view public.largest_gifts as
select
  g.id as gift_id,
  g.gift_number,
  g.gift_date,
  g.gift_type,
  g.amount_cents,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  f.name as fund_name
from public.gifts g
inner join public.donors d on d.id = g.donor_id
inner join public.funds f on f.id = g.fund_id
where g.deleted_at is null
order by g.amount_cents desc, g.gift_date desc;

create or replace view public.recent_gifts as
select
  g.id as gift_id,
  g.gift_number,
  g.gift_date,
  g.gift_type,
  g.amount_cents,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  f.name as fund_name,
  c.name as campaign_name
from public.gifts g
inner join public.donors d on d.id = g.donor_id
inner join public.funds f on f.id = g.fund_id
left join public.campaigns c on c.id = g.campaign_id
where g.deleted_at is null
order by g.gift_date desc, g.created_at desc;
