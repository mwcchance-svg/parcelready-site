-- ParcelReady store schema (Supabase). Paste into the SQL editor once.
-- The Edge Function reaches these tables with the service role key,
-- which bypasses RLS. RLS is enabled with no public policies, so the
-- anon and authenticated roles can read or write nothing directly.

create table if not exists public.delivery_tokens (
  token text primary key,
  pack_id text not null,
  email text not null,
  kind text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

create table if not exists public.store_config (
  key text primary key,
  value text not null
);

create table if not exists public.price_map (
  price_id text primary key,
  pack_id text not null
);

alter table public.delivery_tokens enable row level security;
alter table public.leads enable row level security;
alter table public.store_config enable row level security;
alter table public.price_map enable row level security;

-- Private storage bucket for pack and sample files.
insert into storage.buckets (id, name, public)
values ('parcelready-files', 'parcelready-files', false)
on conflict (id) do nothing;
