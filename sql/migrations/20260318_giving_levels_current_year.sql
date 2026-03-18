create or replace view public.donor_current_year_giving_levels as
with current_year_hard as (
  select
    g.donor_id,
    sum(g.amount_cents) as current_year_hard_credit_cents
  from public.gifts g
  where g.deleted_at is null
    and extract(year from g.gift_date) = extract(year from current_date)
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by g.donor_id
),
current_year_soft as (
  select
    sc.donor_id,
    sum(sc.amount_cents) as current_year_soft_credit_cents
  from public.soft_credits sc
  inner join public.gifts g on g.id = sc.gift_id
  where g.deleted_at is null
    and extract(year from g.gift_date) = extract(year from current_date)
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by sc.donor_id
),
current_year_totals as (
  select
    d.id as donor_id,
    coalesce(h.current_year_hard_credit_cents, 0) as current_year_hard_credit_cents,
    coalesce(s.current_year_soft_credit_cents, 0) as current_year_soft_credit_cents,
    coalesce(h.current_year_hard_credit_cents, 0) + coalesce(s.current_year_soft_credit_cents, 0) as current_year_recognition_cents
  from public.donors d
  left join current_year_hard h on h.donor_id = d.id
  left join current_year_soft s on s.donor_id = d.id
  where d.deleted_at is null
)
select
  donor_id,
  current_year_hard_credit_cents,
  current_year_soft_credit_cents,
  current_year_recognition_cents,
  case
    when current_year_recognition_cents >= 10000000 then 'TITLE_SPONSOR'
    when current_year_recognition_cents >= 7500000 then 'PREEMINENT_SPONSOR'
    when current_year_recognition_cents >= 5010000 then 'PINK_ADVOCATE_SPONSOR'
    when current_year_recognition_cents >= 2550000 then 'PINK_WARRIOR_SPONSOR'
    when current_year_recognition_cents >= 1500000 then 'PREMIER_SPONSOR'
    when current_year_recognition_cents >= 1050000 then 'CHAMPION_SPONSOR'
    when current_year_recognition_cents >= 510000 then 'HOPE_SPONSOR'
    when current_year_recognition_cents >= 300000 then 'PINK_HERO_SPONSOR'
    when current_year_recognition_cents >= 120000 then 'PINK_HEART_SPONSOR'
    when current_year_recognition_cents >= 30000 then 'PINK_RIBBON_FRIEND'
    else null
  end as giving_level_internal,
  case
    when current_year_recognition_cents >= 10000000 then 'Title Sponsor'
    when current_year_recognition_cents >= 7500000 then 'Preeminent Sponsor'
    when current_year_recognition_cents >= 5010000 then 'Pink Advocate Sponsor'
    when current_year_recognition_cents >= 2550000 then 'Pink Warrior Sponsor'
    when current_year_recognition_cents >= 1500000 then 'Premier Sponsor'
    when current_year_recognition_cents >= 1050000 then 'Champion Sponsor'
    when current_year_recognition_cents >= 510000 then 'Hope Sponsor'
    when current_year_recognition_cents >= 300000 then 'Pink Hero Sponsor'
    when current_year_recognition_cents >= 120000 then 'Pink Heart Sponsor'
    when current_year_recognition_cents >= 30000 then 'Pink Ribbon Friend'
    else null
  end as giving_level_display
from current_year_totals;
