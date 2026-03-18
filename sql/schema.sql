create extension if not exists citext;

create table if not exists donors (
  id bigint generated always as identity primary key,
  donor_type text not null check (donor_type in ('INDIVIDUAL', 'ORGANIZATION')),
  first_name varchar(100),
  last_name varchar(100),
  organization_name varchar(200),
  email citext,
  phone varchar(30),
  street1 varchar(200),
  street2 varchar(200),
  city varchar(100),
  state_province varchar(100),
  postal_code varchar(20),
  country varchar(100) not null default 'United States',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint donors_name_required check (
    (donor_type = 'INDIVIDUAL' and first_name is not null and last_name is not null)
    or
    (donor_type = 'ORGANIZATION' and organization_name is not null)
  )
);

create unique index if not exists donors_email_unique
  on donors (email)
  where email is not null;

create index if not exists donors_last_name_idx on donors (last_name);
create index if not exists donors_org_name_idx on donors (organization_name);

create table if not exists gifts (
  id bigint generated always as identity primary key,
  donor_id bigint not null references donors(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency_code char(3) not null default 'USD',
  gift_date date not null,
  gift_type text not null check (gift_type in ('ONE_TIME', 'PLEDGE', 'RECURRING', 'IN_KIND')),
  payment_method text not null check (payment_method in ('CASH', 'CHECK', 'CARD', 'ACH', 'WIRE', 'OTHER')),
  campaign varchar(150),
  fund varchar(150),
  appeal varchar(150),
  receipt_number varchar(100),
  is_anonymous boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gifts_donor_id_idx on gifts (donor_id);
create index if not exists gifts_gift_date_idx on gifts (gift_date desc);
create index if not exists gifts_campaign_idx on gifts (campaign);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists donors_set_updated_at on donors;
create trigger donors_set_updated_at
before update on donors
for each row
execute function set_updated_at();

drop trigger if exists gifts_set_updated_at on gifts;
create trigger gifts_set_updated_at
before update on gifts
for each row
execute function set_updated_at();
