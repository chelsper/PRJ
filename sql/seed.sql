insert into funds (name, code)
values
  ('General Fund', 'GEN'),
  ('Programs', 'PRG')
on conflict do nothing;

insert into campaigns (name, code, starts_on, ends_on)
values
  ('Spring Appeal', 'SPRING', '2026-03-01', '2026-05-31'),
  ('Year End', 'YEAREND', '2026-11-01', '2026-12-31')
on conflict do nothing;

insert into users (email, password_hash, role)
values
  ('admin@example.org', '4e738ca5563c06cf...replace_me...', 'admin')
on conflict (email) do nothing;
