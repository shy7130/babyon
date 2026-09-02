-- wizard_stages was added in 0003, but 0002's anon column grant predates it, so anon never
-- got SELECT on it. app/page.tsx filters on wizard_stages (.not('wizard_stages', 'is', null)),
-- so every homepage query has been failing for anon with a 42501 permission error, which
-- page.tsx silently swallows into an empty benefits list. Fix: grant it now.
grant select (wizard_stages) on public.benefits to anon;

alter table public.benefits
  add column if not exists has_direct_apply_link boolean not null default false;

comment on column public.benefits.has_direct_apply_link is
  '정부 API가 실제 상세페이지 링크(servDtlLink 등)를 제공했는지 여부. false면 apply_link는
   우리가 생성한 bokjiro 대체 링크일 뿐 진짜 신청/상세 페이지가 아닐 수 있음 -- 홈페이지에서
   "신청하기" 대신 "자세히 보기" 버튼을 보여주는 기준으로 사용.';

grant select (has_direct_apply_link) on public.benefits to anon;

-- backfill existing rows from their already-stored raw_payload
update public.benefits
set has_direct_apply_link = (raw_payload ->> 'servDtlLink') is not null;
