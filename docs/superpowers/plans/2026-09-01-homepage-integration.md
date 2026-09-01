# 홈페이지-데이터 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 베이비온 홈페이지의 위저드(지역→상태→시기)와 결과 화면(여정 타임라인+카드 그리드)이 하드코딩된 예시 대신 Supabase의 실제 게시중 혜택 데이터를 보여주도록 만든다.

**Architecture:** `app/page.tsx`(서버 컴포넌트)가 `status='published' AND wizard_stages IS NOT NULL`인 혜택을 한 번에 조회해 `HomeWizard`(클라이언트 컴포넌트)에 배열로 넘긴다. 위저드는 이미 받은 배열을 지역/생애주기/카테고리 선택에 따라 그 자리에서 필터링한다(재요청 없음) — 기존 Artifact 목업의 순수 클라이언트 필터링 로직을 거의 그대로 이식하되 데이터 소스만 하드코딩 카드에서 실제 배열로 바꾼다. 관리자 화면에는 카테고리·생애주기를 지정하는 태깅 UI를 추가한다.

**Tech Stack:** Next.js 14(App Router, TS) + Supabase + Tailwind(관리자 UI) + 순수 CSS(홈페이지, 목업 그대로) + Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-homepage-integration-design.md`

**참고 원본**: `docs/superpowers/reference-mockup-2026-09-01.html` — 정확한 마크업/CSS/카피는 이 파일에서 그대로 가져온다. 이 파일은 거대한 base64 이미지/폰트가 몇 줄에 몰려있어 절대 통째로 열지 말 것 — 반드시 아래 각 태스크가 지정하는 정확한 줄 범위만 `sed -n 'START,ENDp' 파일` 또는 Read 툴의 offset/limit으로 열어서 참고한다.

## Global Constraints

- 홈페이지 노출 조건: `benefits.status = 'published' AND benefits.wizard_stages IS NOT NULL`.
- `wizard_stages` 값 어휘(정확히 이 5개, 쉼표구분 복수선택): `임신 준비`, `임신 초기`, `임신 중기`, `임신 후기`, `출산 후`.
- 카테고리 값 어휘(정확히 이 6개): `지원금`, `의료·검사`, `교통`, `출산·육아`, `생활지원`, `민간혜택`.
- 지역 매칭: DB `region`이 `서울`로 시작하면 위저드의 `서울`과, `경기`로 시작하면 `경기`와 매칭. 그 외(`전국` 포함)는 지역 무관(항상 매칭).
- 카테고리·생애주기 태깅은 승인(approve)과 별개의 동작이다 — 승인을 막지 않는다.
- 이번 범위는 위저드+카테고리그리드+결과(여정 타임라인+카드 그리드)만. `#lounge`/`#travel`/`#popular`/`#trust` 섹션은 범위 밖.
- 새 UI 컴포넌트 테스트는 이 프로젝트의 기존 컨벤션을 따른다 — 순수 로직(매칭/매퍼)은 유닛 테스트, React 컴포넌트 자체는 수동 QA(React 컴포넌트 테스트 도구를 새로 들이지 않는다).

---

### Task 1: DB 마이그레이션 — wizard_stages 컬럼 추가

**Files:**
- Create: `supabase/migrations/0003_add_wizard_tags.sql`

**Interfaces:**
- Produces: `public.benefits.wizard_stages` 컬럼 (Task 2, 4, 9에서 사용)

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0003_add_wizard_tags.sql`:
```sql
alter table public.benefits
  add column if not exists wizard_stages text;

comment on column public.benefits.wizard_stages is
  '쉼표구분 위저드 생애주기 태그. 관리자가 /admin/review에서 지정. 값은 정확히 이 어휘 중 복수선택: 임신 준비, 임신 초기, 임신 중기, 임신 후기, 출산 후. null이면 홈페이지에 노출되지 않음.';
```

- [ ] **Step 2: 로컬 환경에 적용 (실제 Supabase 프로젝트가 이미 연결되어 있음)**

`babyon/.env.local`에 이미 유효한 `SUPABASE_SERVICE_ROLE_KEY`/`NEXT_PUBLIC_SUPABASE_URL`이 설정되어 있는지 확인 후, Supabase 대시보드 SQL Editor에 위 SQL을 붙여넣어 실행. (`.env.local`이 없거나 값이 비어 있으면 이 스텝은 사람이 나중에 처리하도록 보고만 하고 넘어갈 것 — Step 3부터는 코드 작업이라 계속 진행 가능.)

- [ ] **Step 3: 적용 확인**

가능하면 다음 curl로 확인 (환경변수는 `.env.local`에서 직접 읽어 대입):
```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/benefits?select=id,wizard_stages&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `wizard_stages` 필드가 응답에 포함됨 (값은 null이어도 무방).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_add_wizard_tags.sql
git commit -m "feat: add wizard_stages column for homepage life-stage tagging"
```

---

### Task 2: 관리자 태깅 UI — 카테고리·생애주기 지정

**Files:**
- Modify: `app/admin/review/actions.ts`
- Modify: `app/admin/review/page.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (기존), `requireAdminSession` (기존)
- Produces: `updateBenefitTagsAction(formData: FormData)` Server Action

**전제조건**: Task 1의 마이그레이션이 실제 DB에 적용되어 있어야 이 태스크의 저장이 실제로 동작한다(코드 자체는 마이그레이션 없이도 작성 가능).

- [ ] **Step 1: Server Action 추가**

`app/admin/review/actions.ts`에 기존 함수들 다음에 추가:
```ts
const WIZARD_STAGE_OPTIONS = ['임신 준비', '임신 초기', '임신 중기', '임신 후기', '출산 후'] as const

export async function updateBenefitTagsAction(formData: FormData) {
  await requireAdminSession()
  const id = formData.get('id') as string
  const category = formData.get('category') as string
  const selectedStages = WIZARD_STAGE_OPTIONS.filter((stage) => formData.get(`stage_${stage}`) === 'on')
  const wizardStages = selectedStages.length > 0 ? selectedStages.join(',') : null

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('benefits')
    .update({ category, wizard_stages: wizardStages })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}
```

`WIZARD_STAGE_OPTIONS`를 다른 곳(Task 9)에서도 그대로 재사용할 수 있게, 이 배열을 `app/admin/review/actions.ts`에서 `export`한다 (위 코드에 이미 `export`는 없으므로 `export const WIZARD_STAGE_OPTIONS = ...`로 고쳐서 작성할 것 — 아래 코드가 최종본).

```ts
export const WIZARD_STAGE_OPTIONS = ['임신 준비', '임신 초기', '임신 중기', '임신 후기', '출산 후'] as const

export async function updateBenefitTagsAction(formData: FormData) {
  await requireAdminSession()
  const id = formData.get('id') as string
  const category = formData.get('category') as string
  const selectedStages = WIZARD_STAGE_OPTIONS.filter((stage) => formData.get(`stage_${stage}`) === 'on')
  const wizardStages = selectedStages.length > 0 ? selectedStages.join(',') : null

  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('benefits')
    .update({ category, wizard_stages: wizardStages })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}
```

- [ ] **Step 2: 관리자 페이지에 태깅 폼 추가**

`app/admin/review/page.tsx`의 import에 `updateBenefitTagsAction`, `WIZARD_STAGE_OPTIONS` 추가:
```ts
import {
  approveBenefit,
  archiveBenefit,
  createManualBenefitAction,
  updateBenefitFieldsAction,
  updateBenefitTagsAction,
  WIZARD_STAGE_OPTIONS,
} from './actions'
```

각 혜택 카드의 기존 "대표이미지/신청링크 저장" 폼(`updateBenefitFieldsAction`) 바로 다음에 새 폼 추가:
```tsx
            <form action={updateBenefitTagsAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <input type="hidden" name="id" value={benefit.id} />
              <select name="category" defaultValue={benefit.category} className="rounded border px-2 py-1">
                <option value="지원금">지원금</option>
                <option value="의료·검사">의료·검사</option>
                <option value="교통">교통</option>
                <option value="출산·육아">출산·육아</option>
                <option value="생활지원">생활지원</option>
                <option value="민간혜택">민간혜택</option>
              </select>
              {WIZARD_STAGE_OPTIONS.map((stage) => {
                const checked = (benefit.wizard_stages ?? '').split(',').includes(stage)
                return (
                  <label key={stage} className="flex items-center gap-1">
                    <input type="checkbox" name={`stage_${stage}`} defaultChecked={checked} />
                    {stage}
                  </label>
                )
              })}
              <button type="submit" className="rounded bg-indigo-700 px-3 py-1 text-white">
                분류 저장
              </button>
            </form>
```

이 블록은 기존 `<form action={updateBenefitFieldsAction} ...>...</form>` 바로 아래, `</li>` 닫는 태그 전에 삽입한다.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공 (타입 에러 없음).

- [ ] **Step 4: 수동 QA (Task 1의 마이그레이션이 적용되어 있다면)**

`npm run dev` 실행 후 `/admin/review`에서 아무 혜택이나 하나 골라 카테고리를 바꾸고 생애주기 체크박스 2개 정도 체크한 뒤 "분류 저장" 클릭 → 페이지 새로고침 후에도 선택이 유지되는지 확인.

- [ ] **Step 5: Commit**

```bash
git add app/admin/review/actions.ts app/admin/review/page.tsx
git commit -m "feat: add category and wizard-stage tagging to admin review"
```

---

### Task 3: 홈페이지 공통 타입 + 카테고리 색상 매핑

**Files:**
- Create: `lib/home/types.ts`
- Create: `lib/home/categoryColors.ts`
- Test: `tests/lib/home/categoryColors.test.ts`

**Interfaces:**
- Produces: `HomeBenefit` 타입, `WizardRegion`(`'서울' | '경기'`), `WizardStage` 유니온, `HomeCategory` 유니온, `getCategoryColor(category: HomeCategory): { surface: string; strong: string }` (Task 10에서 배지 색상에 사용)

- [ ] **Step 1: 타입 정의**

`lib/home/types.ts`:
```ts
export type WizardRegion = '서울' | '경기'
export type WizardStage = '임신 준비' | '임신 초기' | '임신 중기' | '임신 후기' | '출산 후'
export type HomeCategory = '지원금' | '의료·검사' | '교통' | '출산·육아' | '생활지원' | '민간혜택'

export interface HomeBenefit {
  id: string
  name: string
  category: HomeCategory
  region: string
  summary: string | null
  applyLink: string | null
  wizardStages: WizardStage[]
  sourceLabel: string | null
}
```

- [ ] **Step 2: 카테고리 색상 테스트 작성**

`tests/lib/home/categoryColors.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { getCategoryColor } from '@/lib/home/categoryColors'

describe('getCategoryColor', () => {
  it('returns the mint palette for 교통', () => {
    expect(getCategoryColor('교통')).toEqual({ surface: 'var(--surface-mint)', strong: 'var(--mint-strong)' })
  })

  it('returns the amber palette for 지원금', () => {
    expect(getCategoryColor('지원금')).toEqual({ surface: 'var(--surface-amber)', strong: 'var(--amber-strong)' })
  })

  it('returns the slate palette for 민간혜택', () => {
    expect(getCategoryColor('민간혜택')).toEqual({ surface: 'var(--surface-slate)', strong: 'var(--slate-strong)' })
  })
})
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/home/categoryColors.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 4: 구현**

색상 값은 `docs/superpowers/reference-mockup-2026-09-01.html`의 category-grid 마크업(778~827번째 줄)에서 확인된 매핑 그대로: 지원금=amber, 의료·검사=sky, 교통=mint, 출산·육아=blush, 생활지원=lavender, 민간혜택=slate.

`lib/home/categoryColors.ts`:
```ts
import type { HomeCategory } from './types'

interface CategoryColor {
  surface: string
  strong: string
}

const CATEGORY_COLORS: Record<HomeCategory, CategoryColor> = {
  '지원금': { surface: 'var(--surface-amber)', strong: 'var(--amber-strong)' },
  '의료·검사': { surface: 'var(--surface-sky)', strong: 'var(--sky-strong)' },
  '교통': { surface: 'var(--surface-mint)', strong: 'var(--mint-strong)' },
  '출산·육아': { surface: 'var(--surface-blush)', strong: 'var(--blush-strong)' },
  '생활지원': { surface: 'var(--surface-lavender)', strong: 'var(--lavender-strong)' },
  '민간혜택': { surface: 'var(--surface-slate)', strong: 'var(--slate-strong)' },
}

export function getCategoryColor(category: HomeCategory): CategoryColor {
  return CATEGORY_COLORS[category]
}
```

- [ ] **Step 5: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/home/categoryColors.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/home/types.ts lib/home/categoryColors.ts tests/lib/home/categoryColors.test.ts
git commit -m "feat: add homepage types and category color mapping"
```

---

### Task 4: DB row → HomeBenefit 매퍼

**Files:**
- Create: `lib/home/mappers.ts`
- Test: `tests/lib/home/mappers.test.ts`

**Interfaces:**
- Consumes: `HomeBenefit`, `WizardStage`, `HomeCategory` (Task 3)
- Produces: `toHomeBenefit(row: Record<string, any>): HomeBenefit` (Task 8에서 사용)

- [ ] **Step 1: 테스트 작성**

`tests/lib/home/mappers.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { toHomeBenefit } from '@/lib/home/mappers'

describe('toHomeBenefit', () => {
  it('maps a published, tagged DB row into a HomeBenefit', () => {
    const row = {
      id: 'b1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      summary: '출생아 1인당 200만원 지급',
      apply_link: 'https://example.com/apply',
      wizard_stages: '임신 후기,출산 후',
      raw_payload: { jurMnofNm: '보건복지부' },
    }

    expect(toHomeBenefit(row)).toEqual({
      id: 'b1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      summary: '출생아 1인당 200만원 지급',
      applyLink: 'https://example.com/apply',
      wizardStages: ['임신 후기', '출산 후'],
      sourceLabel: '보건복지부',
    })
  })

  it('falls back to a generic source label when raw_payload has no jurMnofNm', () => {
    const row = {
      id: 'b2',
      name: '수동 등록 혜택',
      category: '생활지원',
      region: '전국',
      summary: null,
      apply_link: null,
      wizard_stages: '출산 후',
      raw_payload: null,
    }

    expect(toHomeBenefit(row).sourceLabel).toBe(null)
  })

  it('returns an empty wizardStages array when wizard_stages is null', () => {
    const row = {
      id: 'b3',
      name: '태그 없음',
      category: '지원금',
      region: '전국',
      summary: null,
      apply_link: null,
      wizard_stages: null,
      raw_payload: null,
    }

    expect(toHomeBenefit(row).wizardStages).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/home/mappers.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/home/mappers.ts`:
```ts
import type { HomeBenefit, HomeCategory, WizardStage } from './types'

export function toHomeBenefit(row: Record<string, any>): HomeBenefit {
  const rawPayload = row.raw_payload as Record<string, any> | null
  return {
    id: row.id,
    name: row.name,
    category: row.category as HomeCategory,
    region: row.region,
    summary: row.summary,
    applyLink: row.apply_link,
    wizardStages: row.wizard_stages
      ? (row.wizard_stages.split(',') as WizardStage[])
      : [],
    sourceLabel: rawPayload?.jurMnofNm ?? null,
  }
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/home/mappers.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/home/mappers.ts tests/lib/home/mappers.test.ts
git commit -m "feat: add DB row to HomeBenefit mapper"
```

---

### Task 5: 위저드 매칭 로직 (지역·생애주기·카테고리 필터링 + 여정 단계 매핑)

**Files:**
- Create: `lib/home/matching.ts`
- Test: `tests/lib/home/matching.test.ts`

**Interfaces:**
- Consumes: `HomeBenefit`, `WizardRegion`, `WizardStage`, `HomeCategory` (Task 3)
- Produces: `normalizeRegion(dbRegion: string): 'all' | WizardRegion`, `matchesRegion(benefit: HomeBenefit, selected: WizardRegion): boolean`, `matchesStage(benefit: HomeBenefit, selected: WizardStage): boolean`, `filterBenefits(benefits: HomeBenefit[], selection: { region: WizardRegion; stage: WizardStage; category: HomeCategory | 'all' }): HomeBenefit[]`, `JOURNEY_STAGE_INDEX: Record<WizardStage, 1 | 2 | 3 | 4>` (Task 9에서 사용)

이 로직은 `docs/superpowers/reference-mockup-2026-09-01.html`의 1136~1145번째 줄(`computeMatches`)과 1164번째 줄(`JOURNEY_STAGE_MAP`)을 그대로 이식한 것이다. 원본의 `matchChild`는 DB에 자녀수 데이터가 없으므로 이번 포팅에서 제외한다(원본에서도 `card.dataset.child`가 없는 카드는 항상 통과).

- [ ] **Step 1: 테스트 작성**

`tests/lib/home/matching.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  filterBenefits,
  JOURNEY_STAGE_INDEX,
  matchesRegion,
  matchesStage,
  normalizeRegion,
} from '@/lib/home/matching'
import type { HomeBenefit } from '@/lib/home/types'

function makeBenefit(overrides: Partial<HomeBenefit>): HomeBenefit {
  return {
    id: 'b1',
    name: '테스트 혜택',
    category: '지원금',
    region: '전국',
    summary: null,
    applyLink: null,
    wizardStages: ['임신 중기'],
    sourceLabel: null,
    ...overrides,
  }
}

describe('normalizeRegion', () => {
  it('maps 전국 to all', () => {
    expect(normalizeRegion('전국')).toBe('all')
  })
  it('maps a plain 서울 region to 서울', () => {
    expect(normalizeRegion('서울')).toBe('서울')
  })
  it('maps a district-level 서울 region to 서울', () => {
    expect(normalizeRegion('서울 강남구')).toBe('서울')
  })
  it('maps 경기 to 경기', () => {
    expect(normalizeRegion('경기')).toBe('경기')
  })
  it('maps any unrecognized value to all', () => {
    expect(normalizeRegion('부산')).toBe('all')
  })
})

describe('matchesRegion', () => {
  it('matches a nationwide benefit regardless of selected region', () => {
    const benefit = makeBenefit({ region: '전국' })
    expect(matchesRegion(benefit, '서울')).toBe(true)
    expect(matchesRegion(benefit, '경기')).toBe(true)
  })
  it('matches a 서울 benefit only when 서울 is selected', () => {
    const benefit = makeBenefit({ region: '서울 강남구' })
    expect(matchesRegion(benefit, '서울')).toBe(true)
    expect(matchesRegion(benefit, '경기')).toBe(false)
  })
})

describe('matchesStage', () => {
  it('matches when the selected stage is in wizardStages', () => {
    const benefit = makeBenefit({ wizardStages: ['임신 초기', '임신 중기'] })
    expect(matchesStage(benefit, '임신 중기')).toBe(true)
    expect(matchesStage(benefit, '출산 후')).toBe(false)
  })
  it('never matches a benefit with no wizardStages', () => {
    const benefit = makeBenefit({ wizardStages: [] })
    expect(matchesStage(benefit, '임신 중기')).toBe(false)
  })
})

describe('filterBenefits', () => {
  const benefits: HomeBenefit[] = [
    makeBenefit({ id: 'a', category: '지원금', region: '전국', wizardStages: ['임신 중기'] }),
    makeBenefit({ id: 'b', category: '의료·검사', region: '서울', wizardStages: ['임신 중기'] }),
    makeBenefit({ id: 'c', category: '지원금', region: '경기', wizardStages: ['출산 후'] }),
  ]

  it('filters by region, stage, and category together', () => {
    const result = filterBenefits(benefits, { region: '서울', stage: '임신 중기', category: 'all' })
    expect(result.map((b) => b.id)).toEqual(['a', 'b'])
  })

  it('applies the category filter on top of region/stage', () => {
    const result = filterBenefits(benefits, { region: '서울', stage: '임신 중기', category: '의료·검사' })
    expect(result.map((b) => b.id)).toEqual(['b'])
  })

  it('excludes benefits whose stage does not match', () => {
    const result = filterBenefits(benefits, { region: '경기', stage: '임신 중기', category: 'all' })
    expect(result.map((b) => b.id)).toEqual(['a'])
  })
})

describe('JOURNEY_STAGE_INDEX', () => {
  it('maps 임신 준비 and 임신 초기 to the same journey card (1)', () => {
    expect(JOURNEY_STAGE_INDEX['임신 준비']).toBe(1)
    expect(JOURNEY_STAGE_INDEX['임신 초기']).toBe(1)
  })
  it('maps the remaining stages to their own cards', () => {
    expect(JOURNEY_STAGE_INDEX['임신 중기']).toBe(2)
    expect(JOURNEY_STAGE_INDEX['임신 후기']).toBe(3)
    expect(JOURNEY_STAGE_INDEX['출산 후']).toBe(4)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/home/matching.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/home/matching.ts`:
```ts
import type { HomeBenefit, HomeCategory, WizardRegion, WizardStage } from './types'

export function normalizeRegion(dbRegion: string): 'all' | WizardRegion {
  if (dbRegion.startsWith('서울')) return '서울'
  if (dbRegion.startsWith('경기')) return '경기'
  return 'all'
}

export function matchesRegion(benefit: HomeBenefit, selected: WizardRegion): boolean {
  const normalized = normalizeRegion(benefit.region)
  return normalized === 'all' || normalized === selected
}

export function matchesStage(benefit: HomeBenefit, selected: WizardStage): boolean {
  return benefit.wizardStages.includes(selected)
}

export interface WizardSelection {
  region: WizardRegion
  stage: WizardStage
  category: HomeCategory | 'all'
}

export function filterBenefits(benefits: HomeBenefit[], selection: WizardSelection): HomeBenefit[] {
  return benefits.filter((benefit) => {
    const matchCategory = selection.category === 'all' || benefit.category === selection.category
    return matchCategory && matchesRegion(benefit, selection.region) && matchesStage(benefit, selection.stage)
  })
}

// 목업 1164번째 줄의 JOURNEY_STAGE_MAP을 그대로 이식 — "임신 준비"는 전용 여정 카드가 없어
// 1번(임신 초기) 카드에 합쳐진다. 5번 카드("육아 시작")는 위저드에 대응 스텝이 없어 도달 불가능하다
// (원본 목업의 기존 동작 그대로).
export const JOURNEY_STAGE_INDEX: Record<WizardStage, 1 | 2 | 3 | 4> = {
  '임신 준비': 1,
  '임신 초기': 1,
  '임신 중기': 2,
  '임신 후기': 3,
  '출산 후': 4,
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/home/matching.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/home/matching.ts tests/lib/home/matching.test.ts
git commit -m "feat: add wizard matching logic ported from the mockup"
```

---

### Task 6: 이미지·폰트 자산 추출

**Files:**
- Create: `public/fonts/PretendardVariable.woff2`
- Create: `public/images/home/hero-bg.jpg`
- Create: `public/images/home/char-arch.png`
- Create: `public/images/home/journey-mascot.png`

**Interfaces:**
- Produces: 위 4개 실 파일 경로 (Task 7의 CSS가 참조)

참고 원본에서 각 자산이 있는 줄 번호(미리 확인됨): 폰트=8번째 줄, 히어로 배경 JPEG=415번째 줄(`.rp-hero2` 배경), 위저드 마스코트 PNG=635번째 줄(`.char-arch`), 여정 마스코트 PNG=931번째 줄(`.journey-mascot-img`). **이 줄들을 Read나 편집기로 직접 열지 말 것** — 아래 스크립트로만 다뤄야 한다(한 줄이 수백KB~700KB).

- [ ] **Step 1: 추출 스크립트 작성 및 실행**

`scripts/extract-mockup-assets.js` (일회성 스크립트, 실행 후 삭제해도 됨):
```js
const fs = require('fs')
const readline = require('readline')

const SOURCE = 'docs/superpowers/reference-mockup-2026-09-01.html'
const TARGETS = [
  { line: 8, prefix: 'data:font/woff2;base64,', out: 'public/fonts/PretendardVariable.woff2' },
  { line: 415, prefix: 'data:image/jpeg;base64,', out: 'public/images/home/hero-bg.jpg' },
  { line: 635, prefix: 'data:image/png;base64,', out: 'public/images/home/char-arch.png' },
  { line: 931, prefix: 'data:image/png;base64,', out: 'public/images/home/journey-mascot.png' },
]

async function main() {
  const rl = readline.createInterface({ input: fs.createReadStream(SOURCE, { encoding: 'utf8' }) })
  let lineNo = 0
  const remaining = new Map(TARGETS.map((t) => [t.line, t]))
  for await (const line of rl) {
    lineNo++
    const target = remaining.get(lineNo)
    if (!target) continue
    const idx = line.indexOf(target.prefix)
    if (idx === -1) throw new Error(`line ${lineNo}: prefix "${target.prefix}" not found`)
    const rest = line.slice(idx + target.prefix.length)
    const closeIdx = rest.search(/["')]/)
    const base64 = closeIdx === -1 ? rest : rest.slice(0, closeIdx)
    fs.mkdirSync(require('path').dirname(target.out), { recursive: true })
    fs.writeFileSync(target.out, Buffer.from(base64, 'base64'))
    console.log(`wrote ${target.out} (${base64.length} base64 chars)`)
    remaining.delete(lineNo)
  }
  if (remaining.size > 0) {
    throw new Error(`missing lines: ${[...remaining.keys()].join(', ')}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

Run: `node scripts/extract-mockup-assets.js`
Expected: 4줄의 `wrote ...` 로그, 에러 없음.

- [ ] **Step 2: 결과 파일 검증**

Run: `ls -la public/fonts public/images/home`
Expected: 4개 파일 모두 0바이트가 아님. 추가로:
```bash
file public/images/home/hero-bg.jpg public/images/home/char-arch.png public/images/home/journey-mascot.png
```
Expected: 각각 `JPEG image data`, `PNG image data`로 인식됨 (파일 시그니처가 깨지지 않았다는 뜻).

- [ ] **Step 3: 일회성 스크립트 정리**

```bash
rm scripts/extract-mockup-assets.js
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add public/fonts/PretendardVariable.woff2 public/images/home/hero-bg.jpg public/images/home/char-arch.png public/images/home/journey-mascot.png
git commit -m "feat: extract homepage font and mascot assets from the mockup snapshot"
```
(주의: 폰트가 수백KB~1MB 이상일 수 있어 커밋 시간이 걸릴 수 있음 — 정상.)

---

### Task 7: 홈페이지 CSS 이식

**Files:**
- Create: `app/home.css`

**Interfaces:**
- Consumes: Task 6의 자산 경로 (`/fonts/PretendardVariable.woff2`, `/images/home/hero-bg.jpg`)
- Produces: 목업의 클래스명을 그대로 쓸 수 있는 CSS (Task 8~11의 컴포넌트가 이 클래스명을 그대로 사용)

- [ ] **Step 1: 원본 CSS 블록 확인**

Run: `sed -n '2,549p' "docs/superpowers/reference-mockup-2026-09-01.html" | wc -l`
Expected: 548 (베이스64 자산이 섞여 있지 않은 순수 CSS 블록임을 재확인).

- [ ] **Step 2: CSS 파일 생성**

`docs/superpowers/reference-mockup-2026-09-01.html`의 2~549번째 줄을 그대로 복사해 `app/home.css`에 붙여넣는다(가장 바깥 `<style>`/`</style>` 태그 두 줄은 제외하고 그 안의 CSS 본문만). 그 다음 다음 두 곳만 수정한다:

1. `@font-face` 블록의 `src: url('data:font/woff2;base64,...')`를 `src: url('/fonts/PretendardVariable.woff2')`로 교체.
2. `.rp-hero2`의 `background: var(--surface-mint) url("data:image/jpeg;base64,...")`를 `background: var(--surface-mint) url("/images/home/hero-bg.jpg")`로 교체.

(마스코트 이미지 2개는 CSS가 아니라 `<img src>`로 쓰이므로 이 CSS 수정과 무관 — Task 9/10의 JSX에서 `/images/home/char-arch.png`, `/images/home/journey-mascot.png` 경로로 직접 참조한다.)

- [ ] **Step 3: 빌드로 CSS 파싱 오류 확인**

Task 8에서 이 CSS를 import하기 전까지는 어디서도 참조되지 않으므로, 이 태스크만으로는 빌드가 이 파일을 검증하지 않는다. 대신 아래로 문법 오류만 빠르게 확인:
```bash
node -e "require('fs').readFileSync('app/home.css','utf8')" && echo "readable"
```
Expected: `readable` 출력 (파일이 존재하고 읽힘 — 실제 CSS 문법 검증은 Task 8의 빌드에서 이뤄짐).

- [ ] **Step 4: Commit**

```bash
git add app/home.css
git commit -m "feat: port homepage CSS from the mockup"
```

---

### Task 8: 카테고리 그리드 컴포넌트

**Files:**
- Create: `components/home/CategoryGrid.tsx`

**Interfaces:**
- Produces: `<CategoryGrid onSelectCategory={(category: HomeCategory) => void} />` (Task 12에서 사용)

- [ ] **Step 1: 원본 마크업 확인**

Run: `sed -n '778,827p' "docs/superpowers/reference-mockup-2026-09-01.html"`

(이 범위는 base64가 없어 안전하게 통째로 열어도 된다.)

- [ ] **Step 2: 컴포넌트 작성**

`components/home/CategoryGrid.tsx` — 위에서 확인한 6개 `<button class="cat-card2">` 마크업(아이콘 SVG 포함)을 그대로 JSX로 옮기되, `class`→`className`, 각 버튼에 `onClick={() => onSelectCategory(...)}` 추가. `data-cat` 값(cash/medical/transit/parenting/living/private)은 더 이상 필요 없다(Task 3에서 카테고리를 한글 값으로 통일했으므로) — 대신 각 버튼의 `onClick`에 해당 한글 카테고리명을 직접 전달한다:

```tsx
'use client'

import type { HomeCategory } from '@/lib/home/types'

const CATEGORIES: { category: HomeCategory; icon: JSX.Element; desc: string }[] = [
  {
    category: '지원금',
    desc: '출산지원금, 산후조리비 등 현금성 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-amber)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="8" stroke="var(--amber-strong)" strokeWidth="1.8" />
          <path
            d="M11 7v8M8.5 9c0-1.2 1-2 2.5-2s2.5.7 2.5 1.8-1 1.6-2.5 1.9-2.5.8-2.5 1.9S9.7 15 11 15s2.5-.6 2.5-1.8"
            stroke="var(--amber-strong)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    ),
  },
  {
    category: '의료·검사',
    desc: '검진, 진료비, 예방접종 등 의료비 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-sky)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M6 3v6a4 4 0 008 0V3" stroke="var(--sky-strong)" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="16.5" cy="12.5" r="2" stroke="var(--sky-strong)" strokeWidth="1.6" />
          <path d="M10 9v3a4 4 0 004 4" stroke="var(--sky-strong)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </span>
    ),
  },
  {
    category: '교통',
    desc: '교통비, KTX 할인, 주차 지원 등',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-mint)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="3.5" y="5" width="15" height="10" rx="2.5" stroke="var(--mint-strong)" strokeWidth="1.6" />
          <circle cx="7" cy="17" r="1.4" fill="var(--mint-strong)" />
          <circle cx="15" cy="17" r="1.4" fill="var(--mint-strong)" />
          <path d="M3.5 10h15" stroke="var(--mint-strong)" strokeWidth="1.6" />
        </svg>
      </span>
    ),
  },
  {
    category: '출산·육아',
    desc: '출산용품, 육아용품 지원 혜택',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-blush)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M8 3h4v3H8z" stroke="var(--blush-strong)" strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d="M7.5 6h5c1 0 1.5.6 1.5 1.6v9c0 1.1-.7 1.9-1.8 1.9H7.8C6.7 18.5 6 17.7 6 16.6v-9C6 6.6 6.5 6 7.5 6z"
            stroke="var(--blush-strong)"
            strokeWidth="1.5"
          />
          <path d="M6 10h8" stroke="var(--blush-strong)" strokeWidth="1.5" />
        </svg>
      </span>
    ),
  },
  {
    category: '생활지원',
    desc: '공공서비스 이용, 생활비·돌봄 지원',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-lavender)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M3.5 10.5L11 4l7.5 6.5"
            stroke="var(--lavender-strong)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 9.5V17a1 1 0 001 1H15.5a1 1 0 001-1V9.5"
            stroke="var(--lavender-strong)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    ),
  },
  {
    category: '민간혜택',
    desc: '기업·기관의 다양한 민간 제휴 혜택',
    icon: (
      <span className="cat-icon" style={{ background: 'var(--surface-slate)' }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <rect x="4" y="8.5" width="14" height="9.5" rx="1.5" stroke="var(--slate-strong)" strokeWidth="1.6" />
          <path d="M4 12h14" stroke="var(--slate-strong)" strokeWidth="1.6" />
          <path
            d="M11 8.5v9.5M8 8.5c-1.2 0-2-.8-2-2s.9-2.5 3-1c1.4 1 1.9 2 2 3zM14 8.5c1.2 0 2-.8 2-2s-.9-2.5-3-1c-1.4 1-1.9 2-2 3z"
            stroke="var(--slate-strong)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    ),
  },
]

export default function CategoryGrid({
  onSelectCategory,
}: {
  onSelectCategory: (category: HomeCategory) => void
}) {
  return (
    <section className="panel wrap snap-section" id="categories">
      <div className="panel-head">
        <h2>혜택 카테고리</h2>
      </div>
      <div className="cat-grid">
        {CATEGORIES.map(({ category, icon, desc }) => (
          <button key={category} className="cat-card2" onClick={() => onSelectCategory(category)} type="button">
            {icon}
            <span className="cat-name">{category}</span>
            <span className="cat-desc2">{desc}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공 (이 컴포넌트는 아직 어디서도 import되지 않으므로 빌드 자체는 Task 12에서 완성됨 — 여기서는 타입 에러만 없으면 됨. `tsc --noEmit`으로 대신 확인 가능: `npx tsc --noEmit`).

- [ ] **Step 4: Commit**

```bash
git add components/home/CategoryGrid.tsx
git commit -m "feat: add CategoryGrid component"
```

---

### Task 9: 결과 여정 타임라인 컴포넌트

**Files:**
- Create: `components/home/ResultsJourney.tsx`

**Interfaces:**
- Consumes: `JOURNEY_STAGE_INDEX` (Task 5), `WizardStage` (Task 3)
- Produces: `<ResultsJourney activeStage={stage} matchCount={n} />` (Task 12에서 사용)

- [ ] **Step 1: 원본 마크업 확인**

Run: `sed -n '892,994p' "docs/superpowers/reference-mockup-2026-09-01.html" | awk '{ if (length($0) > 300) print substr($0,1,300) "...[TRUNCATED]"; else print }'`

(931번째 줄의 `journey-mascot-img` base64만 매우 길다 — 위 명령이 이미 잘라서 보여준다. 실제 마크업 구조 파악용으로만 쓰고, 이미지 자체는 Task 6에서 이미 `/images/home/journey-mascot.png`로 추출해뒀다.)

- [ ] **Step 2: 컴포넌트 작성**

각 `.journey-stage`는 `data-jstage`(1~5), 배경색 변수(`--stage-c`/`--stage-s`), 아이콘 SVG, 제목(`<h4>`), 체크리스트 2줄, "신청 가능 N건" 배지로 구성된다. 5번째 카드("육아 시작")는 `JOURNEY_STAGE_INDEX`가 절대 5를 반환하지 않으므로 항상 비활성 상태로만 렌더된다(원본 목업과 동일한 동작 — 버그 아님).

`components/home/ResultsJourney.tsx`:
```tsx
import { JOURNEY_STAGE_INDEX } from '@/lib/home/matching'
import type { WizardStage } from '@/lib/home/types'

interface JourneyStageDef {
  index: 1 | 2 | 3 | 4 | 5
  title: string
  items: [string, string]
  colorVar: string
  surfaceVar: string
}

const STAGES: JourneyStageDef[] = [
  { index: 1, title: '임신 초기', items: ['산전 검진비', '엽산·영양 지원'], colorVar: '--mint-strong', surfaceVar: '--surface-mint' },
  { index: 2, title: '임신 중기', items: ['임산부 교통비', '산모 교육'], colorVar: '--blush-strong', surfaceVar: '--surface-blush' },
  { index: 3, title: '출산 준비', items: ['출산 준비 바우처', '출산용품 지원'], colorVar: '--lavender-strong', surfaceVar: '--surface-lavender' },
  { index: 4, title: '출산 후', items: ['산모·신생아 건강관리', '산후 회복 지원'], colorVar: '--amber-strong', surfaceVar: '--surface-amber' },
  { index: 5, title: '육아 시작', items: ['육아용품 지원', '부모교육·상담'], colorVar: '--mint-strong', surfaceVar: '--surface-mint' },
]

export default function ResultsJourney({
  activeStage,
  matchCount,
}: {
  activeStage: WizardStage
  matchCount: number
}) {
  const activeIndex = JOURNEY_STAGE_INDEX[activeStage] ?? 2

  return (
    <div className="journey-track">
      <svg className="journey-path" viewBox="0 0 1200 60" preserveAspectRatio="none" fill="none">
        <path
          d="M10,30 C130,8 220,52 350,30 C480,8 560,52 650,30 C760,10 830,50 900,30 C980,10 1050,50 1190,30"
          stroke="var(--border)"
          strokeWidth="3"
          strokeDasharray="2 11"
          strokeLinecap="round"
        />
      </svg>
      {STAGES.map((stage) => {
        const isActive = stage.index === activeIndex
        return (
          <div
            key={stage.index}
            className={`journey-stage${isActive ? ' active' : ''}`}
            style={{ ['--stage-c' as string]: `var(${stage.colorVar})`, ['--stage-s' as string]: `var(${stage.surfaceVar})` }}
          >
            <span className="stage-badge" style={{ background: `var(${stage.colorVar})` }}>
              {stage.index}
            </span>
            <div className="stage-card">
              <h4>{stage.title}</h4>
              <ul>
                <li>
                  <span className="ck">✓</span>
                  {stage.items[0]}
                </li>
                <li>
                  <span className="ck">✓</span>
                  {stage.items[1]}
                </li>
              </ul>
              <button className="stage-pill" type="button" hidden={!isActive}>
                <span className="pill-count">신청 가능 {matchCount}건</span>
              </button>
            </div>
            <span className={`step-dot${isActive ? ' active' : ''}`} />
            {isActive && (
              <div className="journey-mascot">
                <div className="journey-bubble">
                  지금 받을 수 있는
                  <br />
                  혜택을 확인해요!
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="journey-mascot-img" src="/images/home/journey-mascot.png" alt="" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

(원본은 `track.insertBefore(mascot, activeStageEl.nextSibling)`로 마스코트 DOM을 활성 카드 뒤로 옮기는 방식이었지만, React에서는 마스코트를 활성 카드 안에서 조건부 렌더링하는 게 동등하면서 더 단순하다 — 시각적으로도 "활성 카드 바로 다음"이 아니라 "활성 카드 안"이 되지만 레이아웃상 거의 동일하게 보인다. 필요하면 Task 12 수동 QA에서 위치를 확인하고 조정한다.)

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/home/ResultsJourney.tsx
git commit -m "feat: add ResultsJourney timeline component"
```

---

### Task 10: 결과 카드 그리드 컴포넌트 (되살리기)

**Files:**
- Create: `components/home/ResultsGrid.tsx`

**Interfaces:**
- Consumes: `HomeBenefit`, `HomeCategory` (Task 3), `getCategoryColor` (Task 3)
- Produces: `<ResultsGrid benefits={matchedBenefits} />` (Task 12에서 사용)

- [ ] **Step 1: 원본 카드 마크업 확인**

Run: `sed -n '1024,1030p' "docs/superpowers/reference-mockup-2026-09-01.html"`

(카드 1개 예시 — 이미 이전 대화에서 확인된 구조: 배지+지역태그, 제목, 요약, 출처, 하단 시기라벨+"자세히 보기" 링크.)

- [ ] **Step 2: 컴포넌트 작성**

`components/home/ResultsGrid.tsx`:
```tsx
import { getCategoryColor } from '@/lib/home/categoryColors'
import type { HomeBenefit } from '@/lib/home/types'

export default function ResultsGrid({ benefits }: { benefits: HomeBenefit[] }) {
  if (benefits.length === 0) {
    return (
      <div className="empty">
        선택하신 조건에 맞는 혜택이 아직 없어요.
        <br />
        다른 지역이나 시기를 선택해보세요.
      </div>
    )
  }

  return (
    <div className="grid">
      {benefits.map((benefit) => {
        const color = getCategoryColor(benefit.category)
        return (
          <a
            key={benefit.id}
            className="card"
            href={benefit.applyLink ?? '#'}
            target={benefit.applyLink ? '_blank' : undefined}
            rel={benefit.applyLink ? 'noopener noreferrer' : undefined}
          >
            <div className="card-top">
              <span className="badge" style={{ background: color.surface, color: color.strong }}>
                {benefit.category}
              </span>
              <span className="tag-region">{benefit.region}</span>
            </div>
            <h3>{benefit.name}</h3>
            {benefit.summary && <p className="summary">{benefit.summary}</p>}
            {benefit.sourceLabel && <span className="card-src">출처: {benefit.sourceLabel}</span>}
            <div className="card-foot">
              <span>{benefit.wizardStages[0] ?? ''}</span>
              <span className="more">자세히 보기 →</span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/home/ResultsGrid.tsx
git commit -m "feat: revive the matched-benefit card grid component"
```

---

### Task 11: 위저드 컴포넌트 (핵심 인터랙션)

**Files:**
- Create: `components/home/HomeWizard.tsx`

**Interfaces:**
- Consumes: `HomeBenefit`, `WizardRegion`, `WizardStage`, `HomeCategory` (Task 3), `filterBenefits` (Task 5), `ResultsJourney` (Task 9), `ResultsGrid` (Task 10)
- Produces: `<HomeWizard benefits={HomeBenefit[]} />` (Task 12에서 사용)

- [ ] **Step 1: 원본 위저드 마크업 확인**

Run: `sed -n '581,714p' "docs/superpowers/reference-mockup-2026-09-01.html" | awk '{ if (length($0) > 300) print substr($0,1,300) "...[TRUNCATED]"; else print }'`

(635번째 줄의 `char-arch` base64만 잘림 — `/images/home/char-arch.png`로 이미 추출됨. 스텝 구조는 이미 이전 대화에서 확인됨: region → status → [trimester|child] → result.)

- [ ] **Step 2: 컴포넌트 작성**

위저드는 원본의 4단계 스텝 흐름(지역 → 상태 → [임신 중이면 임신기간 / 출산 후면 자녀수] → 결과)과 상태 전이 로직(원본 1252~1318번째 줄)을 그대로 이식한다. `child`(자녀수)는 상태로는 들고 있지만 매칭에는 쓰지 않는다(Task 5 설계와 동일하게 DB에 자녀수 데이터가 없음).

`components/home/HomeWizard.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { filterBenefits } from '@/lib/home/matching'
import type { HomeBenefit, HomeCategory, WizardRegion, WizardStage } from '@/lib/home/types'
import CategoryGrid from './CategoryGrid'
import ResultsGrid from './ResultsGrid'
import ResultsJourney from './ResultsJourney'

type WizStep = 'region' | 'status' | 'trimester' | 'child' | 'result'
type StatusVal = '임신 준비' | '임신 중' | '출산 후'

function nextStepAfter(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'region') return 'status'
  if (step === 'status') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'result'
  }
  return 'result'
}

function prevStepFor(step: WizStep, statusVal: StatusVal | null): WizStep {
  if (step === 'status') return 'region'
  if (step === 'trimester' || step === 'child') return 'status'
  if (step === 'result') {
    if (statusVal === '임신 중') return 'trimester'
    if (statusVal === '출산 후') return 'child'
    return 'status'
  }
  return 'region'
}

function stepIndexFor(step: WizStep): 0 | 1 | 2 {
  if (step === 'region') return 0
  if (step === 'result') return 2
  return 1
}

export default function HomeWizard({ benefits }: { benefits: HomeBenefit[] }) {
  const [step, setStep] = useState<WizStep>('region')
  const [region, setRegion] = useState<WizardRegion>('서울')
  const [statusVal, setStatusVal] = useState<StatusVal | null>(null)
  const [stage, setStage] = useState<WizardStage>('임신 중기')
  const [showResults, setShowResults] = useState(false)
  const [category, setCategory] = useState<HomeCategory | 'all'>('all')

  const matched = filterBenefits(benefits, { region, stage, category })

  function handleRegionSelect(val: WizardRegion) {
    setRegion(val)
    setStep(nextStepAfter('region', statusVal))
  }

  function handleStatusSelect(val: StatusVal) {
    setStatusVal(val)
    if (val !== '임신 중') {
      setStage(val === '출산 후' ? '출산 후' : '임신 준비')
    }
    setStep(nextStepAfter('status', val))
  }

  function handleTrimesterSelect(val: '초기' | '중기' | '후기') {
    setStage(`임신 ${val}` as WizardStage)
    setStep('result')
  }

  function handleChildSelect() {
    setStep('result')
  }

  function handleBack() {
    setStep(prevStepFor(step, statusVal))
  }

  function handleCategoryFromGrid(selected: HomeCategory) {
    setCategory(selected)
    setShowResults(true)
  }

  if (showResults) {
    return (
      <section className="results wrap" id="results">
        <div className="rp-header">
          <div className="rp-hero2">
            <button className="rp-hero2-reset" type="button" onClick={() => setShowResults(false)}>
              처음부터 다시 찾기
            </button>
            <span className="rp-hero2-badge">
              <span>
                {region} · {stage} 기준
              </span>
            </span>
            <h1>
              우리 가족의 <span className="hl">혜택 여정</span>
            </h1>
            <p className="rp-hero2-sub">임신부터 육아까지, 지금 받을 수 있는 혜택을 단계별로 확인해보세요</p>
            <ResultsJourney activeStage={stage} matchCount={matched.length} />
          </div>
        </div>
        <ResultsGrid benefits={matched} />
      </section>
    )
  }

  return (
    <>
      <section className="hero snap-section" id="finder">
        <div className="hero-center">
          <div className="wiz-scene">
            <div className="arch" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="char-arch" src="/images/home/char-arch.png" alt="" />
          </div>

          <div className="wiz-card">
            {step !== 'region' && (
              <button className="wiz-back" type="button" onClick={handleBack}>
                ‹ 이전
              </button>
            )}
            <div className="wiz-step-badge">{step === 'result' ? '🎉' : stepIndexFor(step) + 1}</div>

            {step === 'region' && (
              <div className="wiz-panel" data-step="region">
                <p className="wiz-carousel-line wiz-greet active">
                  안녕하세요! 우리 동네에서 받을 수 있는 혜택을 같이 찾아볼까요? 💗
                </p>
                <h3 className="wiz-carousel-line wiz-question active">어디에 살고 계세요?</h3>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={() => handleRegionSelect('서울')}>
                    서울
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleRegionSelect('경기')}>
                    경기
                  </button>
                </div>
              </div>
            )}

            {step === 'status' && (
              <div className="wiz-panel" data-step="status">
                <h3 className="wiz-question">지금 어떤 단계인가요?</h3>
                <div className="wiz-options vertical">
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('임신 준비')}>
                    <span className="opt-emoji">🌱</span>임신 준비
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('임신 중')}>
                    <span className="opt-emoji">🤰</span>임신 중
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleStatusSelect('출산 후')}>
                    <span className="opt-emoji">👶</span>출산 후
                  </button>
                </div>
              </div>
            )}

            {step === 'trimester' && (
              <div className="wiz-panel" data-step="trimester">
                <h3 className="wiz-question">
                  우리 아기는 지금
                  <br />
                  얼마나 자랐나요?
                </h3>
                <div className="wiz-options vertical">
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('초기')}>
                    임신 초기 <span className="opt-sub">(1~12주)</span>
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('중기')}>
                    임신 중기 <span className="opt-sub">(13~27주)</span>
                  </button>
                  <button className="wiz-opt" type="button" onClick={() => handleTrimesterSelect('후기')}>
                    임신 후기 <span className="opt-sub">(28주~출산)</span>
                  </button>
                </div>
              </div>
            )}

            {step === 'child' && (
              <div className="wiz-panel" data-step="child">
                <h3 className="wiz-question">아기가 몇 명인가요?</h3>
                <div className="wiz-options">
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    1명
                  </button>
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    2명
                  </button>
                  <button className="wiz-opt" type="button" onClick={handleChildSelect}>
                    3명 이상
                  </button>
                </div>
              </div>
            )}

            {step === 'result' && (
              <div className="wiz-panel wiz-result" data-step="result">
                <div className="wiz-celebrate">🎉</div>
                <h3 className="wiz-question" style={{ marginBottom: 8 }}>
                  찾았어요!
                </h3>
                <p className="wiz-meta">
                  {region} · {stage} 기준
                </p>
                <p className="wiz-count">
                  <strong>{matched.length}</strong>개의 혜택이 있어요
                </p>
                <button className="btn primary" type="button" onClick={() => setShowResults(true)}>
                  내 혜택 확인하기 →
                </button>
              </div>
            )}

            <p className="wiz-trust">회원가입 없이 바로 확인 가능</p>
          </div>
        </div>
      </section>

      <CategoryGrid onSelectCategory={handleCategoryFromGrid} />
    </>
  )
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add components/home/HomeWizard.tsx
git commit -m "feat: add HomeWizard component with real data matching"
```

---

### Task 12: 홈페이지 서버 컴포넌트 조립

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (기존), `toHomeBenefit` (Task 4), `HomeWizard` (Task 11), `app/home.css` (Task 7)

- [ ] **Step 1: 홈페이지 데이터 조회 + 렌더**

`app/page.tsx` 전체를 다음으로 교체:
```tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { toHomeBenefit } from '@/lib/home/mappers'
import HomeWizard from '@/components/home/HomeWizard'
import './home.css'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('benefits')
    .select('*')
    .eq('status', 'published')
    .not('wizard_stages', 'is', null)

  if (error) {
    console.error('failed to load published benefits for homepage:', error)
  }

  const benefits = (data ?? []).map(toHomeBenefit)

  return <HomeWizard benefits={benefits} />
}
```

- [ ] **Step 2: layout에 폰트 적용 확인**

`app/layout.tsx`를 열어 `body`에 Pretendard 폰트가 적용되도록 `className`을 추가한다(이미 `app/home.css`가 `@font-face`로 `'Pretendard Variable'`을 등록하므로, 전역 CSS에 `body { font-family: 'Pretendard Variable', -apple-system, sans-serif; }` 한 줄을 추가하는 방식으로 처리). `app/globals.css` 끝에 추가:
```css
body {
  font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, sans-serif;
}
```
(주의: `app/home.css`가 `app/page.tsx`에서만 import되므로 `@font-face`도 홈페이지 방문 시에만 로드된다 — 이번 범위에서는 홈페이지 외 다른 페이지의 폰트는 다루지 않으므로 문제 없음.)

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공, 타입 에러 없음.

- [ ] **Step 4: 전체 테스트 스위트 확인**

Run: `npm test`
Expected: 기존 테스트 전부 통과 + 이번에 추가한 `lib/home/*` 테스트 전부 통과, 회귀 없음.

- [ ] **Step 5: 수동 QA**

`npm run dev` 실행 후 브라우저(또는 curl로 200 확인)로 `/` 접속:
1. 위저드가 보이는지 (지역 선택 화면).
2. 서울 → 임신 중 → 임신 중기 선택 → "찾았어요!" 화면에 실제 매칭 건수가 표시되는지 (Supabase에 `wizard_stages`가 태깅된 실제 데이터가 있어야 0보다 큰 수가 나옴 — Task 2에서 관리자 화면에서 몇 건 태깅해둘 것).
3. "내 혜택 확인하기" 클릭 → 여정 타임라인 + 카드 그리드가 보이는지, 카드에 실제 혜택명·요약이 나오는지.
4. 카테고리 그리드에서 아무 카테고리나 클릭해도 결과 화면으로 바로 이동하는지.
5. "처음부터 다시 찾기" 클릭 시 위저드로 돌아가는지.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "feat: wire the homepage wizard to real Supabase data"
```

---

## Self-Review 결과

- **스펙 커버리지**: 데이터 모델 변경(Task 1), 관리자 UI 변경(Task 2), 홈페이지 아키텍처(Task 3~5, 12), 결과 화면 구성(여정+그리드, Task 9~10), 컴포넌트/파일 구조(Task 3~11), 자산 추출(Task 6), 에러 처리(Task 12의 `console.error` 폴백) 모두 태스크에 매핑됨. 테스트 전략(순수 로직 유닛테스트/컴포넌트 수동QA)도 그대로 반영.
- **플레이스홀더 스캔**: TBD/TODO 없음. 자산 추출처럼 실행 시점에 파일을 직접 열어 확인해야 하는 부분은 정확한 검증 커맨드를 제공했다.
- **타입 일관성**: `HomeBenefit`/`WizardRegion`/`WizardStage`/`HomeCategory`(Task 3)가 Task 4~12 전체에서 동일하게 사용됨. `filterBenefits`(Task 5)의 시그니처를 `HomeWizard`(Task 11)가 그대로 소비. `JOURNEY_STAGE_INDEX`(Task 5)를 `ResultsJourney`(Task 9)가 그대로 사용. `getCategoryColor`(Task 3)를 `ResultsGrid`(Task 10)가 그대로 사용.
- **범위 점검**: 12개 태스크 모두 이번 스펙(위저드+카테고리그리드+결과) 범위 안. `#lounge`/`#travel`/`#popular`/`#trust`는 어떤 태스크에도 포함되지 않음(의도대로 범위 밖).
