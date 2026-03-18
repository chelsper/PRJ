alter table public.gifts add column if not exists receipt_sent boolean not null default false;
alter table public.gifts add column if not exists receipt_sent_at timestamptz;
alter table public.gifts add column if not exists receipt_sent_by_user_id bigint references public.users(id);
