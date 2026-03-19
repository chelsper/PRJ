alter table public.donors add column if not exists gender varchar(30);

insert into public.field_options (set_key, value, label, sort_order)
values
  ('genders', 'MALE', 'Male', 10),
  ('genders', 'FEMALE', 'Female', 20),
  ('genders', 'UNASSIGNED', 'Unassigned', 30)
on conflict (set_key, value) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;
