# 베이비온 — 실제 홈페이지(위저드+결과)를 데이터 파이프라인과 연동

- 작성일: 2026-09-01
- 관련 프로젝트: 베이비온(BABY ON) — 임신·출산 혜택 정보 서비스
- 상태: 브레인스토밍 승인 완료, writing-plans로 이관 예정
- 참고 원본: `docs/superpowers/reference-mockup-2026-09-01.html` — 여러 세션에 걸쳐 확정된 Claude Artifact 목업의 전체 HTML/CSS/JS 스냅샷. 이 스펙이 정의하는 것은 "그 디자인을 실제 코드/데이터에 어떻게 연결할지"이며, 정확한 카피·색상·CSS 값은 이 파일에서 그대로 가져와 이식한다(이 문서에 다시 옮겨적지 않는다).

## 배경 및 목표

지금까지 두 가지가 각각 따로 완성되어 있다.

1. **디자인**: Claude Artifact 목업 — 히어로 위저드(지역→상태→임신기간/자녀수→결과), 카테고리 그리드, 결과 페이지 등. 하지만 결과 카드 11개는 전부 **하드코딩된 예시**이고 필터링도 카드에 박힌 `data-region`/`data-stage` 속성을 비교하는 순수 클라이언트 로직이다.
2. **데이터 파이프라인**: 정부 API에서 수집→관리자 승인→`benefits` 테이블(Supabase)에 `status='published'`로 저장. 실제로 21건이 살아있다.

이 스펙은 이 둘을 연결해서, 위저드가 하드코딩된 카드 대신 **실제 DB의 게시중 데이터**를 필터링해 보여주도록 만든다.

## 핵심 문제: 데이터 정밀도 불일치

목업의 필터 어휘(지역: all/서울/경기, 생애주기: 임신 준비/임신 초기/임신 중기/임신 후기/출산 후)는 정부 API가 실제로 주는 값(생애주기가 "임신 · 출산" 하나로 뭉뚱그려짐, 지역 없음)보다 훨씬 세밀하다. **관리자가 수동으로 이 두 값을 지정**하는 방식으로 해결하기로 확정함(브레인스토밍에서 합의).

## 목표 (Goals)

- 관리자 승인 화면에서 각 혜택에 카테고리(6종 중 택1)와 생애주기 태그(5종 중 복수선택)를 지정할 수 있다.
- 이 두 값이 모두 지정된 `published` 혜택만 실제 홈페이지에 노출된다.
- 홈페이지의 위저드(지역→생애주기 선택)가 이 실제 데이터를 기준으로 매칭 결과를 보여준다.
- 목업의 위저드/카테고리그리드/결과 화면의 시각 디자인·인터랙션을 최대한 그대로 이식한다.

## 비목표 (Non-goals) — 이번 스펙 범위 밖

- 목업의 나머지 4개 섹션(갈림길 장면 `#lounge`, 여행지 미리보기 `#travel`, 인기 혜택 `#popular`, 신뢰 배지 `#trust`)은 실제 데이터와 무관한 장식/마케팅 섹션이라 이번엔 다루지 않는다. 후속 작업으로 분리.
- 서울 지자체복지서비스 API는 아직 미해결(활용신청 대기 중)이라, 이번 구현 시점 결과는 중앙부처 데이터(전국 단위)만으로 채워진다. 서울 소스가 나중에 붙어도 이 스펙의 구조는 그대로 유지된다(지역 매칭 로직이 이미 서울/경기를 다루도록 설계됨).
- 목업의 애니메이션·마이크로인터랙션 100% 동일 재현은 목표로 하지 않는다(핵심 기능 동작이 우선).
- 카테고리별 실제 아이콘/일러스트 디자인 변경은 다루지 않는다(기존 카테고리 그리드 디자인 그대로 사용).

## 데이터 모델 변경

`benefits` 테이블에 컬럼 추가 (새 마이그레이션 `0003_add_wizard_tags.sql`):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `wizard_stages` | text, nullable | 쉼표구분 문자열. 목업이 이미 쓰는 정확한 어휘: `임신 준비`, `임신 초기`, `임신 중기`, `임신 후기`, `출산 후` 중 해당하는 것 복수 선택. 관리자가 설정하기 전까지 `null`. |

`category` 컬럼(기존)의 의미가 바뀐다: 어댑터가 채우는 값은 더 이상 "확정값"이 아니라 "참고용 초기 추정값"이며, **관리자가 승인 화면에서 6종(지원금/의료·검사/교통/출산·육아/생활지원/민간혜택) 중 하나로 최종 확정**한다.

**홈페이지 노출 조건**: `status = 'published' AND wizard_stages IS NOT NULL`. 카테고리 지정 여부는 별도 플래그 없이, "관리자가 태그 지정 폼을 저장했다"는 사실 자체가 `wizard_stages`를 채우는 것으로 확인된다(카테고리와 생애주기를 한 폼에서 같이 저장하므로 `wizard_stages`가 채워졌다는 건 카테고리도 같이 확정됐다는 뜻).

**태그 지정은 승인(approve)과 분리된 별도 동작이다** — 승인 시점에 강제하지 않는다. 관리자는 승인을 먼저 처리하고 나중에 태그를 붙여도 되고, 이미 게시중인 항목의 태그를 나중에 바꿔도 된다.

## 관리자 UI 변경

`/admin/review`의 각 혜택 카드에 새 폼(기존 "대표이미지/신청링크 저장" 폼 옆 또는 아래)을 추가:
- 카테고리: `<select>` 6개 옵션 (현재 `category` 값을 기본 선택값으로).
- 생애주기: 체크박스 5개 (현재 `wizard_stages`를 파싱해 기본 체크 상태로).
- "분류 저장" 버튼 → 새 Server Action `updateBenefitTagsAction(formData)`이 `category`와 `wizard_stages`(체크된 값들을 쉼표로 join, 하나도 없으면 `null`)를 업데이트.

## 홈페이지 아키텍처

```
app/page.tsx (Server Component)
   └─ createServerSupabaseClient()로 published+wizard_stages 있는 혜택 전체 조회 (건수 적어서 페이지네이션 불필요)
        │  DB row(snake_case) → HomeBenefit(camelCase) 매핑
        ▼
   <HomeWizard benefits={homeBenefits} /> (Client Component, 'use client')
        └─ 지역/생애주기 선택 상태를 들고 있다가, 선택이 바뀔 때마다 이미 받은 benefits 배열을
           그 자리에서 필터링해서 결과를 렌더링 (재요청 없음 — 목업의 기존 클라이언트 필터링
           패턴을 그대로 재사용, 데이터 소스만 하드코딩 카드 → 서버에서 받은 실제 배열로 교체)
```

**지역 매칭**: DB의 `region`은 `전국`/`서울`/`서울 OO구`/`경기` 형태다. 위저드가 쓰는 3버킷(전국/서울/경기)으로 정규화하는 순수 함수 `normalizeRegion(dbRegion: string): 'nationwide' | 'seoul' | 'gyeonggi'`을 만든다(`전국` → nationwide, `서울`로 시작 → seoul, `경기`로 시작 → gyeonggi). 매칭 규칙은 목업의 기존 로직과 동일: 혜택의 지역이 `nationwide`이거나, 사용자가 고른 지역과 일치하면 매칭.

**생애주기 매칭**: 사용자가 고른 값(목업과 동일한 5개 어휘 중 하나)이 혜택의 `wizard_stages`를 쉼표로 split한 배열에 포함되어 있으면 매칭. `wizard_stages`가 `null`인 행은애초에 조회 쿼리에서 제외되므로 이 단계에서 걱정할 필요 없음.

## 컴포넌트/파일 구조 (이번 범위: 위저드 + 카테고리 그리드 + 결과만)

- `app/page.tsx` — 서버 컴포넌트, 데이터 조회 + `<HomeWizard>` 렌더.
- `lib/home/types.ts` — `HomeBenefit` 타입, `WizardRegion`/`WizardStage` 유니온 타입.
- `lib/home/mappers.ts` — DB row → `HomeBenefit` 매퍼 (기존 `lib/benefits/mappers.ts` 패턴과 동일한 스타일).
- `lib/home/matching.ts` — `normalizeRegion`, `matchesRegion`, `matchesStage`, `filterBenefits(benefits, selection)` 순수 함수들. **가장 중요하게 테스트해야 할 파일.**
- `components/home/HomeWizard.tsx` — `'use client'`, 위저드 상태(스텝/지역/생애주기) + 결과 렌더링. 목업의 마크업/CSS 클래스를 그대로 이식.
- `components/home/CategoryGrid.tsx` — 정적 카테고리 6종 그리드(목업 그대로, 클릭 시 위저드로 스크롤/포커스 정도만).
- `app/globals.css` 또는 `components/home/home.css` — 목업의 관련 CSS 이식.
- `public/images/home/` — 목업에서 추출한 마스코트·배경 이미지 실 파일.
- `public/fonts/` — Pretendard Variable 폰트 실 파일(현재 base64 임베드 → `@font-face`의 `url()`을 실 파일 경로로).

## 자산(이미지·폰트) 추출

`docs/superpowers/reference-mockup-2026-09-01.html`에서 `data:image/...;base64,...` / `data:font/woff2;base64,...` 패턴을 찾아 디코딩해서 `public/` 밑에 실제 파일로 저장한다. 정확히 몇 개의 이미지가 있는지는 구현 시점에 그 파일을 직접 열어 확인한다(마스코트 1장, 히어로 배경 1장, 폰트 1개로 알려져 있음 — [[babyon_design_decisions]] 메모 참고).

## 에러 처리

- Supabase 조회 실패 시 홈페이지는 빈 결과 배열로 폴백하고 콘솔에 에러를 남긴다(공개 페이지에서 에러 메시지를 노출하지 않음 — 관리자 페이지와 다른 요구사항).
- 매칭 결과가 0건이면 목업에 이미 있는 "결과 없음" 상태를 그대로 사용.

## 테스트 전략

- `lib/home/matching.ts`의 모든 함수(특히 `normalizeRegion`, `filterBenefits`)는 순수 함수이므로 fixture 기반 유닛 테스트로 전체 분기를 검증한다.
- `lib/home/mappers.ts`도 기존 `lib/benefits/mappers.ts`와 동일하게 필드 매핑 유닛 테스트.
- `HomeWizard` 컴포넌트 자체의 인터랙션(클릭 흐름)은 기존 관리자 UI와 동일한 이유로 자동 테스트 대상에서 제외하고 수동 QA로 검증한다(프로젝트에 React 컴포넌트 테스트 도구가 아직 없음 — 이번에 새로 들이지 않는다, YAGNI).
- `updateBenefitTagsAction`은 기존 `updateBenefitFieldsAction`과 동일한 패턴(수동 QA).

## 사전 준비 사항

- 없음 — 이번 스펙은 기존 스택(Next.js/Supabase/Tailwind) 안에서만 작업하며, 새 인증키나 외부 계정이 필요하지 않다. 서울 데이터가 없어도 중앙부처 데이터만으로 위저드가 정상 동작한다(경기/서울 선택 시 "전국" 항목만 나오는 것은 정상 — 서울 API 연동 후 자동으로 채워짐).
