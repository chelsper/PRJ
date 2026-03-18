alter table public.gifts add column if not exists receipt_amount_cents integer;

update public.gifts
set receipt_amount_cents = amount_cents
where receipt_amount_cents is null;
