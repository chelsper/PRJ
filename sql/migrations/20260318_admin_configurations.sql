create table if not exists public.field_options (
  id bigint generated always as identity primary key,
  set_key varchar(100) not null,
  value varchar(100) not null,
  label varchar(150) not null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_options_set_value_unique unique (set_key, value)
);

create index if not exists field_options_set_idx
  on public.field_options (set_key, is_active, sort_order, label);

drop trigger if exists field_options_set_updated_at on public.field_options;
create trigger field_options_set_updated_at
before update on public.field_options
for each row execute function set_updated_at();

insert into public.field_options (set_key, value, label, sort_order)
values
  ('titles', 'Mr.', 'Mr.', 10),
  ('titles', 'Mrs.', 'Mrs.', 20),
  ('titles', 'Ms.', 'Ms.', 30),
  ('titles', 'Dr.', 'Dr.', 40),
  ('email_types', 'PERSONAL', 'Personal', 10),
  ('email_types', 'WORK', 'Work', 20),
  ('email_types', 'OTHER', 'Other', 30),
  ('address_types', 'PRIMARY', 'Primary', 10),
  ('address_types', 'HOME', 'Home', 20),
  ('address_types', 'WORK', 'Work', 30),
  ('address_types', 'BILLING', 'Billing', 40),
  ('address_types', 'SEASONAL', 'Seasonal', 50),
  ('address_types', 'OTHER', 'Other', 60),
  ('note_categories', 'GENERAL', 'General', 10),
  ('note_categories', 'COMMUNICATION', 'Communication', 20),
  ('note_categories', 'STEWARDSHIP', 'Stewardship', 30),
  ('note_categories', 'FOLLOW_UP', 'Follow Up', 40),
  ('donor_relationship_types', 'EMPLOYER', 'Employer', 10),
  ('donor_relationship_types', 'FOUNDATION', 'Foundation', 20),
  ('donor_relationship_types', 'DONOR_ADVISED_FUND', 'Donor Advised Fund', 30),
  ('donor_relationship_types', 'OTHER', 'Other', 40),
  ('organization_contact_types', 'MAIN_CONTACT', 'Main Contact', 10),
  ('organization_contact_types', 'ADDITIONAL_CONTACT', 'Additional Contact', 20),
  ('organization_contact_types', 'STEWARDSHIP_CONTACT', 'Stewardship Contact', 30),
  ('organization_contact_types', 'ACKNOWLEDGMENT_CONTACT', 'Acknowledgment Contact', 40)
on conflict (set_key, value) do update
set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;
