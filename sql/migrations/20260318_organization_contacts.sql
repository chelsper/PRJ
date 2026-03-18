alter table public.donors add column if not exists organization_website varchar(255);
alter table public.donors add column if not exists organization_email citext;
alter table public.donors add column if not exists organization_contact_title varchar(20);
alter table public.donors add column if not exists organization_contact_first_name varchar(100);
alter table public.donors add column if not exists organization_contact_middle_name varchar(100);
alter table public.donors add column if not exists organization_contact_last_name varchar(100);
alter table public.donors add column if not exists organization_contact_email citext;
alter table public.donors add column if not exists organization_contact_phone varchar(30);

create table if not exists public.donor_organization_contacts (
  id bigint generated always as identity primary key,
  donor_id bigint not null references public.donors(id) on delete cascade,
  contact_type varchar(50) not null check (contact_type in ('MAIN_CONTACT', 'ADDITIONAL_CONTACT', 'STEWARDSHIP_CONTACT', 'ACKNOWLEDGMENT_CONTACT')),
  contact_donor_id bigint references public.donors(id) on delete restrict,
  title varchar(20),
  first_name varchar(100),
  middle_name varchar(100),
  last_name varchar(100),
  email citext,
  primary_phone varchar(30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references public.users(id),
  updated_by bigint references public.users(id)
);

create index if not exists donor_org_contacts_donor_idx
  on public.donor_organization_contacts (donor_id, contact_type, id);

drop trigger if exists donor_organization_contacts_set_updated_at on public.donor_organization_contacts;
create trigger donor_organization_contacts_set_updated_at
before update on public.donor_organization_contacts
for each row execute function set_updated_at();
