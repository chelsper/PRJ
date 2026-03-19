create table if not exists public.appeals (
  id bigint generated always as identity primary key,
  name varchar(150) not null unique,
  code varchar(50),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gifts add column if not exists appeal_id bigint references public.appeals(id) on delete restrict;

drop trigger if exists appeals_set_updated_at on public.appeals;
create trigger appeals_set_updated_at
before update on public.appeals
for each row execute function set_updated_at();
