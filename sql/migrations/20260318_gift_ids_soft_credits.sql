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

alter table public.gifts add column if not exists gift_number varchar(8);
alter table public.soft_credits add column if not exists credit_type varchar(20);

update public.soft_credits
set credit_type = 'MANUAL'
where credit_type is null;

alter table public.soft_credits alter column credit_type set default 'MANUAL';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'soft_credits_credit_type_check'
  ) then
    alter table public.soft_credits
      add constraint soft_credits_credit_type_check
      check (credit_type in ('MANUAL', 'AUTO_SPOUSE'));
  end if;
end $$;

update public.gifts
set gift_number = lpad((40000000 + id)::text, 8, '0')
where gift_number is null;

select setval(
  'gift_number_seq',
  greatest(
    40000000,
    coalesce((select max(gift_number::bigint) from public.gifts where gift_number ~ '^[0-9]+$'), 40000000)
  ),
  true
);

create unique index if not exists gifts_gift_number_idx on public.gifts (gift_number) where deleted_at is null;

drop trigger if exists gifts_set_gift_number on public.gifts;
create trigger gifts_set_gift_number before insert on public.gifts for each row execute function set_gift_number();
