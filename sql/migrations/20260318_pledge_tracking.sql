alter table public.gifts add column if not exists parent_pledge_gift_id bigint references public.gifts(id);
alter table public.gifts add column if not exists pledge_start_date date;
alter table public.gifts add column if not exists expected_fulfillment_date date;
alter table public.gifts add column if not exists installment_count integer;
alter table public.gifts add column if not exists installment_frequency varchar(20);
alter table public.gifts add column if not exists pledge_status varchar(20);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gifts_installment_frequency_check'
  ) then
    alter table public.gifts
      add constraint gifts_installment_frequency_check
      check (installment_frequency in ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'gifts_pledge_status_check'
  ) then
    alter table public.gifts
      add constraint gifts_pledge_status_check
      check (pledge_status in ('ACTIVE', 'PARTIALLY_PAID', 'FULFILLED', 'WRITTEN_OFF', 'CANCELLED'));
  end if;
end $$;

create table if not exists public.pledge_installments (
  id bigint generated always as identity primary key,
  pledge_gift_id bigint not null references public.gifts(id) on delete cascade,
  installment_number integer not null,
  due_date date not null,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint references public.users(id),
  updated_by bigint references public.users(id)
);

create index if not exists gifts_parent_pledge_idx
  on public.gifts (parent_pledge_gift_id)
  where deleted_at is null;

create index if not exists pledge_installments_pledge_idx
  on public.pledge_installments (pledge_gift_id, installment_number);

drop trigger if exists pledge_installments_set_updated_at on public.pledge_installments;
create trigger pledge_installments_set_updated_at
before update on public.pledge_installments
for each row execute function set_updated_at();
