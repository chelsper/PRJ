alter table public.notes add column if not exists category varchar(50) not null default 'GENERAL';

create table if not exists public.donor_organization_relationships (
  id bigint generated always as identity primary key,
  donor_id bigint not null references public.donors(id) on delete cascade,
  organization_donor_id bigint references public.donors(id) on delete restrict,
  organization_name varchar(200),
  relationship_type varchar(50) not null check (relationship_type in ('EMPLOYER', 'FOUNDATION', 'DONOR_ADVISED_FUND', 'OTHER')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references public.users(id),
  updated_by bigint references public.users(id),
  constraint donor_org_relationship_target_required check (
    organization_donor_id is not null or organization_name is not null
  )
);

create index if not exists donor_org_relationships_donor_idx
  on public.donor_organization_relationships (donor_id, relationship_type);

drop trigger if exists donor_organization_relationships_set_updated_at on public.donor_organization_relationships;
create trigger donor_organization_relationships_set_updated_at
before update on public.donor_organization_relationships
for each row execute function set_updated_at();
