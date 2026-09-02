-- 0005는 컬럼만 추가했다 — 이미 수집돼 있던 기존 행들(central/seoul_welfare 50여 건)의 요약문에는
-- 이미 "OOO만원" 패턴이 있는 경우가 많으므로, lib/benefits/amountParser.ts의 정규식과 동일한 로직을
-- SQL로 재현해 한 번만 백필한다. 콤마 포함 숫자(예: "1,000만원")도 처리한다.
update public.benefits
set amount_manwon = replace((regexp_match(summary, '(\d[\d,]*)\s*만\s*원'))[1], ',', '')::integer
where amount_manwon is null
  and summary ~ '\d[\d,]*\s*만\s*원';
