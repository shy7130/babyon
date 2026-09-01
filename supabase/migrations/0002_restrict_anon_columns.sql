-- anon must never see pending_payload/raw_payload: those can hold unapproved draft
-- content before an admin approves it. The existing RLS policy on public.benefits
-- ("public can read published benefits") only restricts which ROWS anon can see
-- (status = 'published') — it does not restrict which COLUMNS are visible, so
-- pending_payload/raw_payload (and other internal metadata) were readable by
-- anyone with the public anon key. This grant restricts anon's column access to
-- the public-safe subset; the row-level policy still governs which rows apply.
revoke select on public.benefits from anon;
grant select (
  id,
  source,
  name,
  category,
  region,
  target_period,
  summary,
  detail,
  apply_link,
  apply_period,
  image_url,
  status,
  created_at,
  updated_at
) on public.benefits to anon;
