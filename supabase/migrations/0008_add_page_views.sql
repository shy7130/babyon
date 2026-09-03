create table if not exists public.page_views (
  day date primary key,
  count integer not null default 0
);

alter table public.page_views enable row level security;

drop policy if exists "authenticated can read page views" on public.page_views;
create policy "authenticated can read page views"
  on public.page_views for select
  to authenticated
  using (true);

-- anon has no select/insert/update policy on this table -- the only way to write to it
-- is through increment_page_view() below, which runs as SECURITY DEFINER (bypassing RLS)
-- so a visitor can never read or tamper with raw rows, only trigger a +1.
create or replace function public.increment_page_view()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.page_views (day, count)
  values (current_date, 1)
  on conflict (day) do update set count = public.page_views.count + 1;
end;
$$;

grant execute on function public.increment_page_view() to anon;

notify pgrst, 'reload schema';
