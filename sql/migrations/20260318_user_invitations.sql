create table if not exists public.user_invitations (
  id bigint generated always as identity primary key,
  email citext not null,
  role text not null check (role in ('admin', 'staff', 'read_only')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  invited_by bigint references public.users(id),
  accepted_by bigint references public.users(id),
  created_at timestamptz not null default now()
);

create index if not exists user_invitations_email_idx
  on public.user_invitations (email, created_at desc);

create index if not exists user_invitations_expires_idx
  on public.user_invitations (expires_at desc);
