create extension if not exists citext;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists users (
  id bigint generated always as identity primary key,
  email citext not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff', 'read_only')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_invitations (
  id bigint generated always as identity primary key,
  email citext not null,
  role text not null check (role in ('admin', 'staff', 'read_only')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  invited_by bigint references users(id),
  accepted_by bigint references users(id),
  created_at timestamptz not null default now()
);

create table if not exists funds (
  id bigint generated always as identity primary key,
  name varchar(150) not null unique,
  code varchar(50),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id bigint generated always as identity primary key,
  name varchar(150) not null unique,
  code varchar(50),
  starts_on date,
  ends_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appeals (
  id bigint generated always as identity primary key,
  name varchar(150) not null unique,
  code varchar(50),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists donors (
  id bigint generated always as identity primary key,
  donor_number varchar(6) unique,
  donor_type text not null check (donor_type in ('INDIVIDUAL', 'ORGANIZATION')),
  title varchar(20),
  gender varchar(30),
  first_name varchar(100),
  middle_name varchar(100),
  last_name varchar(100),
  preferred_name varchar(100),
  organization_name varchar(200),
  organization_website varchar(255),
  organization_email citext,
  organization_contact_donor_id bigint references donors(id),
  organization_contact_title varchar(20),
  organization_contact_first_name varchar(100),
  organization_contact_middle_name varchar(100),
  organization_contact_last_name varchar(100),
  organization_contact_name varchar(200),
  organization_contact_email citext,
  organization_contact_phone varchar(30),
  primary_email citext,
  primary_email_type varchar(50),
  alternate_email citext,
  alternate_email_type varchar(50),
  primary_phone varchar(30),
  spouse_donor_id bigint references donors(id),
  spouse_gender varchar(30),
  spouse_title varchar(20),
  spouse_first_name varchar(100),
  spouse_middle_name varchar(100),
  spouse_last_name varchar(100),
  spouse_preferred_email citext,
  spouse_alternate_email citext,
  spouse_primary_phone varchar(30),
  spouse_same_address boolean not null default false,
  giving_level varchar(100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id),
  deleted_at timestamptz,
  constraint donors_name_required check (
    (donor_type = 'INDIVIDUAL' and first_name is not null and last_name is not null)
    or
    (donor_type = 'ORGANIZATION' and organization_name is not null)
  )
);

create table if not exists donor_addresses (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete restrict,
  address_type varchar(50) not null default 'primary',
  street1 varchar(200) not null,
  street2 varchar(200),
  city varchar(100) not null,
  state_region varchar(100),
  postal_code varchar(20),
  country varchar(100) not null default 'United States',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create sequence if not exists donor_number_seq start 500000;

create or replace function set_donor_number()
returns trigger
language plpgsql
as $$
begin
  if new.donor_number is null then
    loop
      new.donor_number := nextval('donor_number_seq')::text;
      exit when not exists (
        select 1
        from public.donors
        where donor_number = new.donor_number
      );
    end loop;
  end if;

  return new;
end;
$$;

create table if not exists donor_contacts (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete restrict,
  contact_type varchar(50) not null check (contact_type in ('email', 'phone')),
  contact_value varchar(255) not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists gifts (
  id bigint generated always as identity primary key,
  gift_number varchar(8) unique,
  donor_id bigint not null references donors(id) on delete restrict,
  fund_id bigint not null references funds(id) on delete restrict,
  campaign_id bigint references campaigns(id) on delete restrict,
  appeal_id bigint references appeals(id) on delete restrict,
  parent_pledge_gift_id bigint references gifts(id) on delete restrict,
  gift_type varchar(30) not null check (gift_type in (
    'PLEDGE',
    'PLEDGE_PAYMENT',
    'CASH',
    'STOCK_PROPERTY',
    'GIFT_IN_KIND',
    'MATCHING_GIFT_PLEDGE',
    'MATCHING_GIFT_PAYMENT'
  )),
  amount_cents integer not null check (amount_cents > 0),
  gift_date date not null,
  pledge_start_date date,
  expected_fulfillment_date date,
  installment_count integer,
  installment_frequency varchar(20) check (installment_frequency in ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM')),
  pledge_status varchar(20) check (pledge_status in ('ACTIVE', 'PARTIALLY_PAID', 'FULFILLED', 'WRITTEN_OFF', 'CANCELLED')),
  payment_method text check (payment_method in ('ACH', 'CARD', 'CHECK', 'CASH', 'WIRE', 'OTHER')),
  reference_number varchar(100),
  receipt_amount_cents integer,
  fair_market_value_cents integer,
  receipt_sent boolean not null default false,
  receipt_sent_at timestamptz,
  receipt_sent_by_user_id bigint references users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id),
  deleted_at timestamptz
);

create sequence if not exists gift_number_seq start 40000000;

create or replace function set_gift_number()
returns trigger
language plpgsql
as $$
begin
  if new.gift_number is null then
    new.gift_number := nextval('gift_number_seq')::text;
  end if;

  return new;
end;
$$;

create table if not exists gift_allocations (
  id bigint generated always as identity primary key,
  gift_id bigint not null references gifts(id) on delete restrict,
  fund_id bigint not null references funds(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

select setval(
  'gift_number_seq',
  greatest(
    40000000,
    coalesce((select max(gift_number::bigint) from gifts where gift_number ~ '^[0-9]+$'), 40000000)
  ),
  true
);

create table if not exists pledges (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete restrict,
  fund_id bigint not null references funds(id) on delete restrict,
  campaign_id bigint references campaigns(id) on delete restrict,
  pledge_amount_cents integer not null check (pledge_amount_cents > 0),
  pledged_on date not null,
  due_on date,
  status text not null default 'open' check (status in ('open', 'fulfilled', 'written_off')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists pledge_installments (
  id bigint generated always as identity primary key,
  pledge_gift_id bigint not null references gifts(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists soft_credits (
  id bigint generated always as identity primary key,
  gift_id bigint not null references gifts(id) on delete restrict,
  donor_id bigint not null references donors(id) on delete restrict,
  credit_type varchar(20) not null default 'MANUAL' check (credit_type in ('MANUAL', 'AUTO_SPOUSE')),
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists notes (
  id bigint generated always as identity primary key,
  donor_id bigint references donors(id) on delete restrict,
  gift_id bigint references gifts(id) on delete restrict,
  category varchar(50) not null default 'GENERAL',
  note_body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists donor_organization_relationships (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete cascade,
  organization_donor_id bigint references donors(id) on delete restrict,
  organization_name varchar(200),
  relationship_type varchar(50) not null check (relationship_type in ('EMPLOYER', 'FOUNDATION', 'DONOR_ADVISED_FUND', 'OTHER')),
  contact_name varchar(200),
  primary_email citext,
  alternate_email citext,
  primary_phone varchar(30),
  same_address boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id),
  constraint donor_org_relationship_target_required check (
    organization_donor_id is not null or organization_name is not null
  )
);

create table if not exists donor_organization_contacts (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete cascade,
  contact_type varchar(50) not null check (contact_type in ('MAIN_CONTACT', 'ADDITIONAL_CONTACT', 'STEWARDSHIP_CONTACT', 'ACKNOWLEDGMENT_CONTACT')),
  contact_donor_id bigint references donors(id) on delete restrict,
  title varchar(20),
  first_name varchar(100),
  middle_name varchar(100),
  last_name varchar(100),
  email citext,
  primary_phone varchar(30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references users(id),
  updated_by bigint references users(id)
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_user_id bigint references users(id),
  action varchar(100) not null,
  entity_type varchar(100) not null,
  entity_id varchar(100),
  status varchar(20) not null check (status in ('success', 'denied', 'failed')),
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists rate_limit_events (
  id bigint generated always as identity primary key,
  limiter_key varchar(255) not null,
  action varchar(100) not null,
  created_at timestamptz not null default now()
);

create index if not exists donors_last_name_idx on donors (last_name) where deleted_at is null;
create index if not exists user_invitations_email_idx on user_invitations (email, created_at desc);
create index if not exists user_invitations_expires_idx on user_invitations (expires_at desc);
create unique index if not exists donors_donor_number_idx on donors (donor_number) where deleted_at is null;
create unique index if not exists donors_primary_email_idx on donors (primary_email) where primary_email is not null and deleted_at is null;
create index if not exists gifts_gift_date_idx on gifts (gift_date desc) where deleted_at is null;
create unique index if not exists gifts_gift_number_idx on gifts (gift_number) where deleted_at is null;
create index if not exists gifts_parent_pledge_idx on gifts (parent_pledge_gift_id) where deleted_at is null;
create index if not exists gifts_donor_date_idx on gifts (donor_id, gift_date desc) where deleted_at is null;
create index if not exists gifts_campaign_idx on gifts (campaign_id) where deleted_at is null;
create index if not exists gifts_fund_idx on gifts (fund_id) where deleted_at is null;
create index if not exists pledge_installments_pledge_idx on pledge_installments (pledge_gift_id, installment_number);
create index if not exists donor_org_relationships_donor_idx on donor_organization_relationships (donor_id, relationship_type);
create index if not exists donor_org_contacts_donor_idx on donor_organization_contacts (donor_id, contact_type, id);
create index if not exists audit_log_occurred_at_idx on audit_log (occurred_at desc);
create index if not exists audit_log_action_idx on audit_log (action, occurred_at desc);
create index if not exists rate_limit_events_lookup_idx on rate_limit_events (limiter_key, action, created_at desc);

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists funds_set_updated_at on funds;
create trigger funds_set_updated_at before update on funds for each row execute function set_updated_at();
drop trigger if exists campaigns_set_updated_at on campaigns;
create trigger campaigns_set_updated_at before update on campaigns for each row execute function set_updated_at();
drop trigger if exists appeals_set_updated_at on appeals;
create trigger appeals_set_updated_at before update on appeals for each row execute function set_updated_at();
drop trigger if exists donors_set_updated_at on donors;
create trigger donors_set_updated_at before update on donors for each row execute function set_updated_at();
drop trigger if exists donors_set_donor_number on donors;
create trigger donors_set_donor_number before insert on donors for each row execute function set_donor_number();
drop trigger if exists donor_addresses_set_updated_at on donor_addresses;
create trigger donor_addresses_set_updated_at before update on donor_addresses for each row execute function set_updated_at();
drop trigger if exists donor_contacts_set_updated_at on donor_contacts;
create trigger donor_contacts_set_updated_at before update on donor_contacts for each row execute function set_updated_at();
drop trigger if exists gifts_set_updated_at on gifts;
create trigger gifts_set_updated_at before update on gifts for each row execute function set_updated_at();
drop trigger if exists gifts_set_gift_number on gifts;
create trigger gifts_set_gift_number before insert on gifts for each row execute function set_gift_number();
drop trigger if exists gift_allocations_set_updated_at on gift_allocations;
create trigger gift_allocations_set_updated_at before update on gift_allocations for each row execute function set_updated_at();
drop trigger if exists pledges_set_updated_at on pledges;
create trigger pledges_set_updated_at before update on pledges for each row execute function set_updated_at();
drop trigger if exists pledge_installments_set_updated_at on pledge_installments;
create trigger pledge_installments_set_updated_at before update on pledge_installments for each row execute function set_updated_at();
drop trigger if exists soft_credits_set_updated_at on soft_credits;
create trigger soft_credits_set_updated_at before update on soft_credits for each row execute function set_updated_at();
drop trigger if exists notes_set_updated_at on notes;
create trigger notes_set_updated_at before update on notes for each row execute function set_updated_at();
drop trigger if exists donor_organization_relationships_set_updated_at on donor_organization_relationships;
create trigger donor_organization_relationships_set_updated_at before update on donor_organization_relationships for each row execute function set_updated_at();
drop trigger if exists donor_organization_contacts_set_updated_at on donor_organization_contacts;
create trigger donor_organization_contacts_set_updated_at before update on donor_organization_contacts for each row execute function set_updated_at();

create or replace view donor_giving_totals as
select
  d.id as donor_id,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  d.primary_email,
  coalesce(h.donor_hard_credit_cents, 0) as donor_hard_credit_cents,
  coalesce(s.donor_soft_credit_cents, 0) as donor_soft_credit_cents,
  coalesce(h.donor_hard_credit_cents, 0) + coalesce(s.donor_soft_credit_cents, 0) as donor_recognition_cents
from donors d
left join (
  select
    g.donor_id,
    sum(g.amount_cents) as donor_hard_credit_cents
  from gifts g
  where g.deleted_at is null
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by g.donor_id
) h on h.donor_id = d.id
left join (
  select
    sc.donor_id,
    sum(sc.amount_cents) as donor_soft_credit_cents
  from soft_credits sc
  inner join gifts g on g.id = sc.gift_id
  where g.deleted_at is null
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by sc.donor_id
) s on s.donor_id = d.id
where d.deleted_at is null;

create or replace view donor_current_year_giving_levels as
with current_year_hard as (
  select
    g.donor_id,
    sum(g.amount_cents) as current_year_hard_credit_cents
  from gifts g
  where g.deleted_at is null
    and extract(year from g.gift_date) = extract(year from current_date)
    and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
  group by g.donor_id
),
current_year_soft as (
  select
    sc.donor_id,
    sum(sc.amount_cents) as current_year_soft_credit_cents
  from soft_credits sc
  inner join gifts g on g.id = sc.gift_id
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
  from donors d
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

create or replace view lifetime_giving_by_donor as
select
  donor_id,
  donor_name,
  primary_email,
  donor_recognition_cents as lifetime_giving_cents
from donor_giving_totals;

create or replace view prj_total_received_to_date as
select
  coalesce(sum(g.amount_cents), 0) as total_received_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT');

create or replace view prj_total_pledged_to_date as
select
  coalesce(sum(g.amount_cents), 0) as total_pledged_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE');

create or replace view prj_total_received_by_calendar_year as
select
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_received_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'PLEDGE_PAYMENT', 'MATCHING_GIFT_PAYMENT')
group by extract(year from g.gift_date);

create or replace view prj_total_pledged_by_calendar_year as
select
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_pledged_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'MATCHING_GIFT_PLEDGE')
group by extract(year from g.gift_date);

create or replace view giving_by_calendar_year as
select
  g.donor_id,
  extract(year from g.gift_date)::int as calendar_year,
  sum(g.amount_cents) as total_giving_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
group by g.donor_id, extract(year from g.gift_date);

create or replace view giving_by_fiscal_year as
select
  g.donor_id,
  case
    when extract(month from g.gift_date) >= 7 then extract(year from g.gift_date)::int + 1
    else extract(year from g.gift_date)::int
  end as fiscal_year,
  sum(g.amount_cents) as total_giving_cents
from gifts g
where g.deleted_at is null
  and g.gift_type in ('PLEDGE', 'CASH', 'STOCK_PROPERTY', 'GIFT_IN_KIND', 'MATCHING_GIFT_PLEDGE')
group by g.donor_id, case
  when extract(month from g.gift_date) >= 7 then extract(year from g.gift_date)::int + 1
  else extract(year from g.gift_date)::int
end;

create or replace view largest_gifts as
select
  g.id as gift_id,
  g.gift_number,
  g.gift_date,
  g.gift_type,
  g.amount_cents,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  f.name as fund_name
from gifts g
inner join donors d on d.id = g.donor_id
inner join funds f on f.id = g.fund_id
where g.deleted_at is null
order by g.amount_cents desc, g.gift_date desc;

create or replace view recent_gifts as
select
  g.id as gift_id,
  g.gift_number,
  g.gift_date,
  g.gift_type,
  g.amount_cents,
  coalesce(d.organization_name, concat_ws(' ', d.first_name, d.last_name)) as donor_name,
  f.name as fund_name,
  c.name as campaign_name
from gifts g
inner join donors d on d.id = g.donor_id
inner join funds f on f.id = g.fund_id
left join campaigns c on c.id = g.campaign_id
where g.deleted_at is null
order by g.gift_date desc, g.created_at desc;
