create extension if not exists pgcrypto;

create table if not exists public.benefits (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('central', 'seoul_welfare', 'seoul_umppa', 'manual')),
  external_id text,
  name text not null,
  category text not null,
  region text not null,
  target_period text,
  summary text,
  detail text,
  apply_link text,
  apply_period text,
  image_url text,
  status text not null default 'staging' check (status in ('staging', 'published', 'archived')),
  has_pending_update boolean not null default false,
  pending_payload jsonb,
  raw_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists benefits_source_external_id_key
  on public.benefits (source, external_id)
  where external_id is not null;

create table if not exists public.ingest_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  source text not null,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  error_message text
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists benefits_set_updated_at on public.benefits;
create trigger benefits_set_updated_at
  before update on public.benefits
  for each row execute function public.set_updated_at();

alter table public.benefits enable row level security;
alter table public.ingest_logs enable row level security;

drop policy if exists "public can read published benefits" on public.benefits;
create policy "public can read published benefits"
  on public.benefits for select
  to anon
  using (status = 'published');

drop policy if exists "authenticated can manage all benefits" on public.benefits;
create policy "authenticated can manage all benefits"
  on public.benefits for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can read ingest logs" on public.ingest_logs;
create policy "authenticated can read ingest logs"
  on public.ingest_logs for select
  to authenticated
  using (true);
