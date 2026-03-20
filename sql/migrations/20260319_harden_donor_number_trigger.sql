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

select setval(
  'donor_number_seq',
  greatest(
    500000,
    coalesce((select max(donor_number::bigint) from public.donors where donor_number ~ '^[0-9]+$'), 500000)
  ),
  true
);

drop trigger if exists donors_set_donor_number on public.donors;
create trigger donors_set_donor_number
before insert on public.donors
for each row
execute function set_donor_number();
