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

alter table public.donors add column if not exists donor_number varchar(6);
alter table public.donors add column if not exists title varchar(20);
alter table public.donors add column if not exists middle_name varchar(100);
alter table public.donors add column if not exists preferred_name varchar(100);
alter table public.donors add column if not exists organization_contact_donor_id bigint references public.donors(id);
alter table public.donors add column if not exists organization_contact_name varchar(200);
alter table public.donors add column if not exists primary_email_type varchar(50);
alter table public.donors add column if not exists alternate_email citext;
alter table public.donors add column if not exists alternate_email_type varchar(50);
alter table public.donors add column if not exists spouse_donor_id bigint references public.donors(id);
alter table public.donors add column if not exists giving_level varchar(100);

update public.donors
set donor_number = lpad((500000 + id)::text, 6, '0')
where donor_number is null;

select setval(
  'donor_number_seq',
  greatest(
    500000,
    coalesce((select max(donor_number::bigint) from public.donors where donor_number ~ '^[0-9]+$'), 500000)
  ),
  true
);

create unique index if not exists donors_donor_number_idx on public.donors (donor_number) where deleted_at is null;

drop trigger if exists donors_set_donor_number on public.donors;
create trigger donors_set_donor_number before insert on public.donors for each row execute function set_donor_number();
