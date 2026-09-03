alter table public.benefits
  add column if not exists special_situations text;

comment on column public.benefits.special_situations is
  '해당 혜택이 특별히 겨냥하는 상황(콤마 구분, 예: "다자녀,장애인가정"). 정부 API의
   trgterIndvdlArray 필드는 항목이 적고(중앙부처만 제공, 서울 구 단위 API는 없음) 데이터 품질도
   낮아 신뢰할 수 없어(예: 보편사업인 표준모자보건수첩이 "저소득"으로 오분류) 채택하지 않았다.
   대신 category/wizard_stages와 같은 방식으로 이름·요약 키워드 기반 1차 태깅 후 관리자가
   /admin/review에서 검수·수정한다. 위저드의 선택적 "해당되는 상황" 스텝과 매칭해 해당 혜택을
   추천 카드에 우선 노출하는 가산 방식으로만 쓰이며, 태그가 없거나 불일치해도 결과에서 제외되지
   않는다(정부 태깅 신뢰도가 낮아 잘못 걸러내는 위험을 피하기 위함).';

grant select (special_situations) on public.benefits to anon;
