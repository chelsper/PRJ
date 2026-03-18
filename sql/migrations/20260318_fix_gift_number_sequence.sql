select setval(
  'gift_number_seq',
  greatest(
    40000000,
    coalesce((select max(gift_number::bigint) from public.gifts where gift_number ~ '^[0-9]+$'), 40000000)
  ),
  true
);
