alter table public.benefits
  add column if not exists wizard_stages text;

comment on column public.benefits.wizard_stages is
  '쉼표구분 위저드 생애주기 태그. 관리자가 /admin/review에서 지정. 값은 정확히 이 어휘 중 복수선택: 임신 준비, 임신 초기, 임신 중기, 임신 후기, 출산 후. null이면 홈페이지에 노출되지 않음.';
