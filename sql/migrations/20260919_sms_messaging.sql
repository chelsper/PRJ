create table if not exists public.donor_sms_preferences (
  donor_id bigint primary key references public.donors(id) on delete restrict,
  phone varchar(20) not null,
  consent_status varchar(20) not null default 'UNKNOWN'
    check (consent_status in ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT')),
  consent_source varchar(50),
  consent_note text,
  consent_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by bigint references public.users(id),
  constraint donor_sms_preferences_phone_e164 check (phone ~ '^\+[1-9][0-9]{7,14}$')
);

create table if not exists public.sms_messages (
  id bigint generated always as identity primary key,
  donor_id bigint not null references public.donors(id) on delete restrict,
  direction varchar(10) not null check (direction in ('OUTBOUND', 'INBOUND')),
  category varchar(40) not null default 'GENERAL',
  to_phone varchar(20),
  from_phone varchar(20),
  body text not null,
  status varchar(20) not null
    check (status in ('QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'RECEIVED', 'FAILED', 'CANCELED', 'SUPPRESSED')),
  provider_message_sid varchar(80) unique,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_code varchar(30),
  error_message text,
  created_by bigint references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_messages_outbound_phone check (
    direction <> 'OUTBOUND' or to_phone ~ '^\+[1-9][0-9]{7,14}$'
  )
);

create index if not exists sms_messages_donor_created_idx
  on public.sms_messages (donor_id, created_at desc);

create index if not exists sms_messages_scheduled_idx
  on public.sms_messages (scheduled_for)
  where status = 'SCHEDULED';

drop trigger if exists donor_sms_preferences_set_updated_at on public.donor_sms_preferences;
create trigger donor_sms_preferences_set_updated_at
before update on public.donor_sms_preferences
for each row execute function set_updated_at();

drop trigger if exists sms_messages_set_updated_at on public.sms_messages;
create trigger sms_messages_set_updated_at
before update on public.sms_messages
for each row execute function set_updated_at();
