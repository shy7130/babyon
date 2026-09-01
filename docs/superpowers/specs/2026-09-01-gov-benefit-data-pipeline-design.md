# 베이비온 — 정부/지자체 복지 혜택 데이터 수집 파이프라인 설계

- 작성일: 2026-09-01
- 관련 프로젝트: 베이비온(BABY ON) — 임신·출산 혜택 정보 서비스 (기존 프로젝트 개요는 별도 관리)
- 상태: 브레인스토밍 승인 완료, writing-plans로 이관 예정

## 배경 및 목표

베이비온 MVP는 정부 지원금 + 지자체 지원금(서울·경기) + 민간 혜택 데이터를 사이트에 노출한다. 이 문서는 그중 **정부/지자체 공공 API로 수집 가능한 데이터**(중앙부처, 서울)를 자동으로 가져와 사이트 콘텐츠로 반영하는 파이프라인을 설계한다. 경기·민간 혜택은 이번 스펙 범위 밖이며, 향후 동일 구조에 어댑터를 추가하는 방식으로 확장한다.

이 스펙은 베이비온의 실제 코드 개발(Next.js + Supabase) 착수의 첫 단계이며, 다음 두 가지를 함께 다룬다.

1. 공공 API 수집 → 정규화 → DB 적재 파이프라인
2. 관리자가 수집된 데이터를 검수·게시하는 승인 UI

## 목표 (Goals)

- 매일 1회, 중앙부처복지서비스 API와 서울 지자체복지서비스 API(+서울 몽땅정보 만능키 API)에서 데이터를 가져와 정규화한다.
- 신규 항목은 반드시 관리자 승인을 거친 뒤에만 사이트에 공개한다.
- 이미 게시된 항목의 원본 내용이 나중에 바뀌면, 라이브 콘텐츠를 자동으로 덮어쓰지 않고 관리자 검수 대기로 표시한다.
- API에 없는 필드(대표이미지, 신청링크)는 기본값으로 자동 채우되, 관리자가 언제든 직접 수정할 수 있다.
- 소스 하나가 실패해도 나머지 소스 수집은 계속된다.

## 비목표 (Non-goals)

- 경기도 전용 API 연동 (소스 미확정, 후속 작업으로 분리)
- 민간 혜택 자동 수집 (애초에 공식 API가 없어 수동 등록 대상)
- 실시간 반영 (배치 주기는 하루 1회로 충분, 원본 데이터도 비정기 갱신)
- 알림(이메일/슬랙) 연동 (1인 운영 규모에서는 관리자 화면 확인으로 충분)

## 전체 아키텍처

```
Vercel Cron (매일 1회, KST 새벽)
   └─ POST /api/cron/ingest-benefits  (Authorization: Bearer {CRON_SECRET})
        ├─ centralAdapter       (한국사회보장정보원_중앙부처복지서비스, data.go.kr)
        ├─ seoulWelfareAdapter  (한국사회보장정보원_지자체복지서비스, 시도코드=서울)
        └─ seoulUmppaAdapter    (서울시 몽땅정보 만능키 사업정보, data.seoul.go.kr)
              │  각 어댑터: 원본 API 응답 → 공통 BenefitRecord[] 로 정규화
              ▼
        upsertBenefits() — Supabase `benefits` 테이블에 (source, external_id) 기준 upsert
              │
        `ingest_logs` 테이블에 소스별 실행 결과 기록
              ▼
   관리자 /admin/review (Supabase Auth 로그인 필요)
        └─ 신규 승인 대기 / 업데이트 대기 / 게시중 / 보관 탭에서 검수 및 게시
```

핵심 원칙: 어댑터 하나가 실패해도 나머지는 계속 진행되는 **부분 실패 허용** 구조이며, 실행 결과는 매번 로그로 남아 관리자가 언제든 확인할 수 있다.

## 데이터 모델

### `benefits` 테이블 (공개 콘텐츠 + 수집 메타데이터를 한 테이블에서 관리)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid, PK | |
| `source` | text | `central` \| `seoul_welfare` \| `seoul_umppa` \| `manual` |
| `external_id` | text, nullable | 원본 API의 서비스ID. `manual` 항목은 null |
| `name` | text | 혜택명 |
| `category` | text | 분류 (지원금/의료·검사/교통/출산·육아/생활지원/민간혜택) |
| `region` | text | 지역 (전국/서울/경기 등) |
| `target_period` | text | 대상 시기 |
| `summary` | text | 한줄요약 |
| `detail` | text | 상세내용 |
| `apply_link` | text | 신청링크 (기본값: 원본 상세페이지 URL) |
| `apply_period` | text | 신청기간 |
| `image_url` | text | 대표이미지 (기본값: 카테고리별 기본 일러스트) |
| `status` | text | `staging` \| `published` \| `archived` |
| `has_pending_update` | boolean, default false | published 항목에 새 원본 데이터가 도착했는지 여부 |
| `pending_payload` | jsonb, nullable | `has_pending_update=true`일 때 관리자 승인 전 새 내용을 보관 |
| `raw_payload` | jsonb | 최근 수집 원본 그대로 (디버깅용) |
| `last_synced_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

- 유니크 제약: `(source, external_id)` — `external_id is not null`인 행에만 적용 (partial unique index). `manual` 항목은 이 제약에서 자유롭다.

### `ingest_logs` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid, PK | |
| `run_at` | timestamptz | |
| `source` | text | |
| `fetched_count` | int | |
| `inserted_count` | int | |
| `updated_count` | int | |
| `error_count` | int | |
| `error_message` | text, nullable | |

## 수집 플로우

1. Vercel Cron이 지정 시각에 `/api/cron/ingest-benefits`를 호출한다. 라우트는 `Authorization` 헤더의 `CRON_SECRET`을 검증해 외부 임의 호출을 차단한다.
2. 소스 어댑터 배열(`[centralAdapter, seoulWelfareAdapter, seoulUmppaAdapter]`)을 순회한다. 각 어댑터는 "원본 API 호출"과 "`BenefitRecord[]`로 정규화"만 담당하는 순수 함수로 분리한다 (실제 fetch와 매핑 로직을 나눠 테스트 가능하게 함).
3. 매핑 시 API에 없는 값은 기본값으로 채운다: `image_url`은 `category`별 기본 일러스트, `apply_link`는 원본 상세페이지 URL(복지로/몽땅정보 만능키 링크).
4. 각 레코드를 `(source, external_id)` 기준으로 다음 규칙에 따라 upsert한다.
   - 신규 항목 → `status='staging'`으로 insert.
   - 기존 `staging`(아직 미승인) 항목 → 최신 내용으로 덮어쓴다.
   - 기존 `published` 항목인데 원본 내용이 이전 수집(`raw_payload`)과 다름 → 라이브 필드는 그대로 두고 `pending_payload`에 새 내용을 저장, `has_pending_update=true`로 설정.
   - 기존 `published` 항목인데 원본 내용이 동일함 → `last_synced_at`만 갱신.
5. 소스별 처리 결과(수집/신규/갱신/에러 건수)를 `ingest_logs`에 기록한다. 한 소스가 API 다운·인증키 만료로 실패해도 예외를 삼키고 다음 소스로 계속 진행한다.

## 관리자 승인 UI

- `/admin/login` — Supabase Auth 이메일/비밀번호 로그인. 관리자 계정은 사장님 1개만 사전에 생성해둔다 (별도 회원가입 플로우 없음).
- `/admin/review` — 탭 구성:
  - **신규 승인 대기** (`status=staging`)
  - **업데이트 대기** (`has_pending_update=true`, 기존 값과 `pending_payload` 값을 나란히 비교해 변경된 필드를 하이라이트)
  - **게시중** (`status=published`)
  - **보관** (`status=archived`)
- 카드별 액션:
  - **승인**: `staging`→`published`, 또는 `pending_payload`를 실제 필드에 반영하고 `has_pending_update=false`, `pending_payload=null`로 초기화.
  - **반려/보관**: `status=archived`.
  - **직접 수정**: 대표이미지는 Supabase Storage 업로드로 교체, 신청링크·요약 등은 자유롭게 수정 가능 (자동채움 기본값을 덮어쓸 수 있음). 이 필드들은 이후 자동 수집 로직이 덮어쓰지 않는다(라이브 필드는 관리자 승인 없이는 갱신되지 않으므로 자연히 보호됨).
  - **직접 추가**: `source='manual'`인 새 항목을 즉시 `published` 상태로 등록 (API가 없는 민간 혜택 등록용).

## 에러 처리

- 개별 어댑터 실패(API 다운, 인증키 만료, 응답 스키마 변경 등)는 해당 소스만 건너뛰고 `ingest_logs`에 에러 메시지를 기록한다. 크론 실행 자체는 계속된다.
- 일시적 실패(네트워크 오류, 레이트리밋 응답)는 지수 백오프로 1회 재시도 후 포기한다.
- 알림(이메일/슬랙)은 이번 스코프에서 제외한다. 관리자가 `/admin/review`에서 `ingest_logs`를 확인하는 것으로 충분하다고 판단했으며, 필요해지면 후속 작업으로 추가한다.

## 테스트 전략

- 각 어댑터의 "원본 JSON → `BenefitRecord[]`" 매핑 함수는 실제 API 호출 없이 샘플 응답 fixture로 유닛 테스트한다.
- upsert 판단 로직(신규/유지/업데이트 대기 분기)도 순수 함수로 분리해 별도로 유닛 테스트한다.
- `/api/cron/ingest-benefits` 라우트 자체는 어댑터 호출과 upsert 함수를 조합만 하는 얇은 wrapper로 유지하고, 통합 테스트는 최소화한다.
- 관리자 승인 플로우(로그인 → 승인 → 게시 확인)는 필요 시 Playwright e2e로 검증한다 (선택 사항, MVP 필수는 아님).

## 사전 준비 사항 (구현 착수 전 필요)

- 공공데이터포털(data.go.kr) 회원가입 및 인증키 발급 — **2026-09-01 기준 아직 미완료**, 실제 어댑터 구현 전에 발급 필요.
- 위 인증키로 각 API의 Swagger 문서/코드표를 내려받아 실제 응답 필드명과 서울 시도코드 값을 확정 (현재는 웹서치로 확인한 개략적 스펙만 있음).
- 경기도 전용 데이터 소스 재검색 (이번 스펙 범위 밖, 후속 작업).
