begin;
create table if not exists public.user_passkeys (
  id text primary key,
  user_id bigint not null references public.users(id),
  public_key bytea not null,
  counter bigint not null default 0 check (counter >= 0),
  transports text[] not null default '{}',
  label varchar(80) not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.user_passkeys add column if not exists revoked_at timestamptz;
create index if not exists user_passkeys_user_idx on public.user_passkeys(user_id);
create table if not exists public.passkey_challenges (
  id uuid primary key,
  user_id bigint not null references public.users(id),
  session_id uuid not null,
  purpose text not null check (purpose in ('register','activate','authenticate')),
  challenge text not null,
  credential_id text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  label varchar(80)
);
create table if not exists public.user_recovery_codes (
  code_hash text primary key,
  user_id bigint not null references public.users(id),
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists user_recovery_codes_user_idx on public.user_recovery_codes(user_id);
do $$ begin
  if exists (select 1 from pg_roles where rolname='crm_runtime') then
    grant select,insert,update on public.user_passkeys,public.passkey_challenges,
      public.user_recovery_codes to crm_runtime;
  end if;
end $$;
commit;
