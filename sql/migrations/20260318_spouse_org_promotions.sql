alter table public.donors add column if not exists spouse_title varchar(20);
alter table public.donors add column if not exists spouse_first_name varchar(100);
alter table public.donors add column if not exists spouse_middle_name varchar(100);
alter table public.donors add column if not exists spouse_last_name varchar(100);
alter table public.donors add column if not exists spouse_preferred_email citext;
alter table public.donors add column if not exists spouse_alternate_email citext;
alter table public.donors add column if not exists spouse_primary_phone varchar(30);
alter table public.donors add column if not exists spouse_same_address boolean not null default false;

alter table public.donor_organization_relationships add column if not exists contact_name varchar(200);
alter table public.donor_organization_relationships add column if not exists primary_email citext;
alter table public.donor_organization_relationships add column if not exists alternate_email citext;
alter table public.donor_organization_relationships add column if not exists primary_phone varchar(30);
alter table public.donor_organization_relationships add column if not exists same_address boolean not null default false;
