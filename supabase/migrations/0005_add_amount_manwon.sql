alter table public.benefits
  add column if not exists amount_manwon integer;

comment on column public.benefits.amount_manwon is
  '지원금액(만원 단위). 정부 API 요약문에서 "OOO만원" 패턴을 자동 파싱 시도하고, 실패하면 null로
   남아 관리자가 /admin/review에서 직접 입력해서 채운다. 홈페이지의 "지금 챙기면 좋은 혜택" 추천
   카드 선정(금액 내림차순 상위 3개)과 "예상 지원금액" 합계 계산에 쓰인다.';

grant select (amount_manwon) on public.benefits to anon;
