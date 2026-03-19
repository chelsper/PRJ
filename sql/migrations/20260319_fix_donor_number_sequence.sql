select setval(
  'donor_number_seq',
  greatest(
    500000,
    coalesce((select max(donor_number::bigint) from public.donors where donor_number ~ '^[0-9]+$'), 500000)
  ),
  true
);
