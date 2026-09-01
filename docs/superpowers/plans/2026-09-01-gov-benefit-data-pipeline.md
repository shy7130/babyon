# 정부/서울 복지 혜택 데이터 파이프라인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 중앙부처·서울 복지 혜택을 매일 공공 API에서 수집해 Supabase에 저장하고, 관리자가 검수·승인한 뒤에만 게시되는 파이프라인 + 승인 UI를 만든다.

**Architecture:** Next.js(App Router) API Route가 Vercel Cron으로 매일 1회 호출되어 소스 어댑터들을 순회 → 공통 `BenefitRecord`로 정규화 → Supabase `benefits` 테이블에 upsert(신규는 staging, 기존 published 변경분은 pending_payload). 관리자는 `/admin/review`(Supabase Auth 보호)에서 검수·게시한다.

**Tech Stack:** Next.js 14 (App Router, TypeScript) + Tailwind CSS + Supabase(Postgres, Auth) + Vercel Cron + Vitest.

**Spec:** `docs/superpowers/specs/2026-09-01-gov-benefit-data-pipeline-design.md`

## Global Constraints

- 수집 주기는 매일 1회 (Vercel Cron).
- 신규 항목은 반드시 관리자 승인 후에만 게시된다 (`status: staging → published`).
- 이미 게시된 항목의 원본 변경은 라이브 필드를 자동으로 덮어쓰지 않고 `pending_payload`/`has_pending_update`로 대기시킨다.
- 소스 어댑터 하나가 실패해도 나머지 소스는 계속 수집한다 (부분 실패 허용).
- API에 없는 필드(대표이미지, 신청링크)는 기본값으로 자동 채우되 관리자가 직접 수정 가능해야 한다.
- 실행 환경은 Vercel Cron + Next.js API Route (Supabase Edge Function 아님).
- 관리자 인증은 Supabase Auth 이메일/비밀번호 로그인 (계정 1개, 회원가입 플로우 없음).
- 중복 판별 키는 `(source, external_id)`.
- 경기도·민간 혜택 자동 수집은 이번 스코프 밖 (스펙의 Non-goals).

## 범위 조정 (스펙 대비)

스펙은 소스 3개(중앙부처, 서울 지자체복지서비스, 서울 몽땅정보 만능키)를 언급하지만, **서울 몽땅정보 만능키(OA-22188) API는 실제 응답 필드 스키마를 이번 조사에서 확인하지 못했다.** 반면 중앙부처/지자체복지서비스 API(복지로 원천, `NationalWelfareInformationsV001`/`LocalGovernmentWelfareInformations`)는 공개 문서로 필드 구조가 어느 정도 알려져 있다. 이 계획은 **중앙부처 + 서울 지자체복지서비스 두 소스만 구현**하고, 몽땅정보 만능키는 실제 인증키로 Swagger 문서를 확인한 뒤 별도 후속 작업(같은 어댑터 인터페이스에 소스 하나 추가)으로 분리한다.

---

### Task 1: 프로젝트 스캐폴딩 + 테스트 러너

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Test: `tests/sanity.test.ts`

**Interfaces:**
- Produces: `@/*` 경로 별칭(tsconfig paths), `npm test` = `vitest run`, `npm run dev`/`npm run build`.

- [ ] **Step 1: 설정 파일 작성**

`package.json`:
```json
{
  "name": "babyon",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "14.2.18",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/supabase-js": "2.45.4",
    "@supabase/ssr": "0.5.1"
  },
  "devDependencies": {
    "typescript": "5.6.3",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "@types/node": "22.9.0",
    "tailwindcss": "3.4.14",
    "postcss": "8.4.47",
    "autoprefixer": "10.4.20",
    "vitest": "2.1.4"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {}
export default nextConfig
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
export default config
```

`postcss.config.js`:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

`.gitignore`:
```
node_modules
.next
.env*.local
```

`.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATA_GO_KR_API_KEY=
CRON_SECRET=
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '베이비온',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
```

`app/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">베이비온 — 준비중입니다.</p>
    </main>
  )
}
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: `node_modules` 생성, 에러 없음.

- [ ] **Step 3: 테스트 러너 동작 확인용 sanity 테스트 작성**

`tests/sanity.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

describe('toolchain sanity', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 4: 테스트 및 빌드 확인**

Run: `npm test`
Expected: PASS (1 test)

Run: `npm run build`
Expected: 빌드 성공 (홈페이지 placeholder 렌더)

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js vitest.config.ts .gitignore .env.local.example app tests
git commit -m "chore: scaffold Next.js project with Tailwind and Vitest"
```

---

### Task 2: Supabase 클라이언트 헬퍼

**Files:**
- Create: `lib/supabase/admin.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Test: `tests/lib/supabase/admin.test.ts`

**Interfaces:**
- Produces: `createAdminClient(): SupabaseClient` (서비스 역할, RLS 우회, cron에서 사용), `createServerSupabaseClient(): SupabaseClient` (쿠키 기반 세션, 관리자 페이지에서 사용), `createBrowserSupabaseClient(): SupabaseClient` (로그인 폼에서 사용).

- [ ] **Step 1: admin 클라이언트 테스트 작성**

`tests/lib/supabase/admin.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('createAdminClient', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when required env vars are missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    expect(() => createAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('returns a client when env vars are present', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const client = createAdminClient()
    expect(typeof client.from).toBe('function')
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/supabase/admin.test.ts`
Expected: FAIL (`lib/supabase/admin` 모듈 없음)

- [ ] **Step 3: 구현**

`lib/supabase/admin.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'createAdminClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
```

`lib/supabase/server.ts`:
```ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export function createServerSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: Record<string, unknown>) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/supabase/admin.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/supabase tests/lib/supabase
git commit -m "feat: add Supabase client helpers"
```

---

### Task 3: DB 스키마 마이그레이션

**전제조건 (수동):** [supabase.com](https://supabase.com)에서 프로젝트를 생성하고, Project Settings → API에서 Project URL / anon key / service_role key를 복사해 `.env.local`(`.env.local.example` 복사본)에 채워둔다.

**Files:**
- Create: `supabase/migrations/0001_init_benefits.sql`

**Interfaces:**
- Produces: `public.benefits` 테이블, `public.ingest_logs` 테이블, RLS 정책 (Task 8~12에서 사용).

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0001_init_benefits.sql`:
```sql
create extension if not exists pgcrypto;

create table if not exists public.benefits (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('central', 'seoul_welfare', 'seoul_umppa', 'manual')),
  external_id text,
  name text not null,
  category text not null,
  region text not null,
  target_period text,
  summary text,
  detail text,
  apply_link text,
  apply_period text,
  image_url text,
  status text not null default 'staging' check (status in ('staging', 'published', 'archived')),
  has_pending_update boolean not null default false,
  pending_payload jsonb,
  raw_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists benefits_source_external_id_key
  on public.benefits (source, external_id)
  where external_id is not null;

create table if not exists public.ingest_logs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  source text not null,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  error_message text
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists benefits_set_updated_at on public.benefits;
create trigger benefits_set_updated_at
  before update on public.benefits
  for each row execute function public.set_updated_at();

alter table public.benefits enable row level security;
alter table public.ingest_logs enable row level security;

drop policy if exists "public can read published benefits" on public.benefits;
create policy "public can read published benefits"
  on public.benefits for select
  to anon
  using (status = 'published');

drop policy if exists "authenticated can manage all benefits" on public.benefits;
create policy "authenticated can manage all benefits"
  on public.benefits for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can read ingest logs" on public.ingest_logs;
create policy "authenticated can read ingest logs"
  on public.ingest_logs for select
  to authenticated
  using (true);
```

- [ ] **Step 2: 마이그레이션 적용**

Supabase 대시보드 → SQL Editor에 위 파일 내용을 붙여넣고 실행한다.

- [ ] **Step 3: 적용 확인**

SQL Editor에서 실행: `select table_name from information_schema.tables where table_schema = 'public';`
Expected: `benefits`, `ingest_logs` 포함.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init_benefits.sql
git commit -m "feat: add benefits and ingest_logs schema"
```

---

### Task 4: 공통 타입 + 기본값

**Files:**
- Create: `lib/benefits/types.ts`
- Create: `lib/benefits/defaults.ts`
- Create: `public/images/defaults/benefit-cash.svg`
- Create: `public/images/defaults/benefit-medical.svg`
- Create: `public/images/defaults/benefit-transport.svg`
- Create: `public/images/defaults/benefit-baby.svg`
- Create: `public/images/defaults/benefit-life.svg`
- Create: `public/images/defaults/benefit-private.svg`
- Create: `public/images/defaults/benefit-generic.svg`
- Test: `tests/lib/benefits/defaults.test.ts`

**Interfaces:**
- Produces: `BenefitSource`, `BenefitStatus`, `BenefitRecord`, `BenefitRow` 타입, `getDefaultImage(category: string): string`. 이후 모든 어댑터/매퍼 태스크가 이 타입을 사용.

- [ ] **Step 1: 타입 정의**

`lib/benefits/types.ts`:
```ts
export type BenefitSource = 'central' | 'seoul_welfare' | 'seoul_umppa' | 'manual'
export type BenefitStatus = 'staging' | 'published' | 'archived'

export interface BenefitRecord {
  source: BenefitSource
  externalId: string | null
  name: string
  category: string
  region: string
  targetPeriod: string | null
  summary: string | null
  detail: string | null
  applyLink: string | null
  applyPeriod: string | null
  imageUrl: string | null
  rawPayload: unknown
}

export interface BenefitRow extends BenefitRecord {
  id: string
  status: BenefitStatus
  hasPendingUpdate: boolean
  pendingPayload: unknown | null
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 기본 이미지 테스트 작성**

`tests/lib/benefits/defaults.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { getDefaultImage } from '@/lib/benefits/defaults'

describe('getDefaultImage', () => {
  it('returns the mapped image for a known category', () => {
    expect(getDefaultImage('출산·육아')).toBe('/images/defaults/benefit-baby.svg')
  })

  it('returns the fallback image for an unknown category', () => {
    expect(getDefaultImage('알 수 없는 분류')).toBe('/images/defaults/benefit-generic.svg')
  })
})
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/defaults.test.ts`
Expected: FAIL (`lib/benefits/defaults` 모듈 없음)

- [ ] **Step 4: 구현**

`lib/benefits/defaults.ts`:
```ts
const DEFAULT_IMAGE_BY_CATEGORY: Record<string, string> = {
  '지원금': '/images/defaults/benefit-cash.svg',
  '의료·검사': '/images/defaults/benefit-medical.svg',
  '교통': '/images/defaults/benefit-transport.svg',
  '출산·육아': '/images/defaults/benefit-baby.svg',
  '생활지원': '/images/defaults/benefit-life.svg',
  '민간혜택': '/images/defaults/benefit-private.svg',
}

const FALLBACK_IMAGE = '/images/defaults/benefit-generic.svg'

export function getDefaultImage(category: string): string {
  return DEFAULT_IMAGE_BY_CATEGORY[category] ?? FALLBACK_IMAGE
}
```

각 SVG는 카테고리를 구분할 수 있는 최소한의 실제 이미지(관리자가 나중에 교체 가능한 임시 일러스트)로 만든다. 예시 (`public/images/defaults/benefit-baby.svg`, 다른 파일도 `fill` 색상과 텍스트만 바꿔 동일한 구조로 작성):
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <rect width="320" height="200" rx="16" fill="#FDEBEF"/>
  <circle cx="160" cy="90" r="40" fill="#F7A8C4"/>
  <text x="160" y="160" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#7A4A5A">출산·육아</text>
</svg>
```
나머지 6개 파일도 같은 구조로 작성하되 배경색/원 색상/텍스트만 카테고리에 맞게 바꾼다: `benefit-cash.svg`(지원금, `#FFF4D6`/`#F4C55B`), `benefit-medical.svg`(의료·검사, `#E3F2FD`/`#64B5F6`), `benefit-transport.svg`(교통, `#E8F5E9`/`#66BB6A`), `benefit-life.svg`(생활지원, `#EDE7F6`/`#9575CD`), `benefit-private.svg`(민간혜택, `#FFF3E0`/`#FFA726`), `benefit-generic.svg`(일반, `#ECEFF1`/`#90A4AE`).

- [ ] **Step 5: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/defaults.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/benefits/types.ts lib/benefits/defaults.ts public/images/defaults tests/lib/benefits/defaults.test.ts
git commit -m "feat: add benefit types and default category images"
```

---

### Task 5: 중앙부처복지서비스 어댑터

**Files:**
- Create: `lib/benefits/adapters/central.ts`
- Test: `tests/lib/benefits/adapters/central.test.ts`

**Interfaces:**
- Consumes: `BenefitRecord` (Task 4), `getDefaultImage` (Task 4)
- Produces: `CentralApiItem` 타입, `mapCentralToBenefitRecords(items: CentralApiItem[]): BenefitRecord[]`, `fetchCentralBenefits(apiKey: string): Promise<BenefitRecord[]>`

> 필드명은 공공데이터포털에 공개된 복지로 API(`NationalWelfareInformationsV001`) 문서 기준 최선 추정치다. 실제 인증키 발급 후 Swagger 문서로 재검증이 필요하다(스펙의 "사전 준비 사항" 참고). 검증 후 다르면 이 파일의 `CentralApiItem`과 매핑부만 수정하면 되도록 구조를 분리해뒀다.

- [ ] **Step 1: 매핑 테스트 작성**

`tests/lib/benefits/adapters/central.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { mapCentralToBenefitRecords, type CentralApiItem } from '@/lib/benefits/adapters/central'

describe('mapCentralToBenefitRecords', () => {
  it('maps a raw central welfare item to a BenefitRecord', () => {
    const items: CentralApiItem[] = [
      {
        servId: 'WLF00000001',
        servNm: '첫만남이용권',
        servDgst: '출생아 1인당 200만원 바우처 지급',
        sprtCycNm: '수시',
        lifeArray: '영유아',
        servDtlLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
      },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result).toEqual([
      {
        source: 'central',
        externalId: 'WLF00000001',
        name: '첫만남이용권',
        category: '지원금',
        region: '전국',
        targetPeriod: '영유아',
        summary: '출생아 1인당 200만원 바우처 지급',
        detail: '출생아 1인당 200만원 바우처 지급',
        applyLink: 'https://www.bokjiro.go.kr/detail/WLF00000001',
        applyPeriod: '수시',
        imageUrl: '/images/defaults/benefit-cash.svg',
        rawPayload: items[0],
      },
    ])
  })

  it('falls back to a bokjiro detail URL when servDtlLink is missing', () => {
    const items: CentralApiItem[] = [
      { servId: 'WLF00000002', servNm: '테스트 혜택' },
    ]

    const result = mapCentralToBenefitRecords(items)

    expect(result[0].applyLink).toBe(
      'https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00000002'
    )
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/adapters/central.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/benefits/adapters/central.ts`:
```ts
import type { BenefitRecord } from '@/lib/benefits/types'
import { getDefaultImage } from '@/lib/benefits/defaults'

// 필드명은 공공데이터포털 공개 문서 기준 최선 추정치 — 실제 인증키로 Swagger 재검증 필요.
export interface CentralApiItem {
  servId: string
  servNm: string
  servDgst?: string
  sprtCycNm?: string
  lifeArray?: string
  servDtlLink?: string
}

const CATEGORY = '지원금'

function buildApplyLink(item: CentralApiItem): string {
  if (item.servDtlLink) return item.servDtlLink
  return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
}

export function mapCentralToBenefitRecords(items: CentralApiItem[]): BenefitRecord[] {
  return items.map((item) => ({
    source: 'central',
    externalId: item.servId,
    name: item.servNm,
    category: CATEGORY,
    region: '전국',
    targetPeriod: item.lifeArray ?? null,
    summary: item.servDgst ?? null,
    detail: item.servDgst ?? null,
    applyLink: buildApplyLink(item),
    applyPeriod: item.sprtCycNm ?? null,
    imageUrl: getDefaultImage(CATEGORY),
    rawPayload: item,
  }))
}

export async function fetchCentralBenefits(apiKey: string): Promise<BenefitRecord[]> {
  const url = new URL(
    'http://apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfareInformations'
  )
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('callTp', 'L')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('type', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`central welfare API request failed: ${res.status}`)
  }
  const json = await res.json()
  const items: CentralApiItem[] = json?.wantedList ?? []
  return mapCentralToBenefitRecords(items)
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/adapters/central.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/benefits/adapters/central.ts tests/lib/benefits/adapters/central.test.ts
git commit -m "feat: add central welfare adapter"
```

---

### Task 6: 서울 지자체복지서비스 어댑터

**Files:**
- Create: `lib/benefits/adapters/seoulWelfare.ts`
- Test: `tests/lib/benefits/adapters/seoulWelfare.test.ts`

**Interfaces:**
- Consumes: `BenefitRecord`, `getDefaultImage` (Task 4)
- Produces: `SeoulWelfareApiItem` 타입, `mapSeoulWelfareToBenefitRecords(items: SeoulWelfareApiItem[]): BenefitRecord[]`, `fetchSeoulWelfareBenefits(apiKey: string): Promise<BenefitRecord[]>`

- [ ] **Step 1: 매핑 테스트 작성**

`tests/lib/benefits/adapters/seoulWelfare.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  mapSeoulWelfareToBenefitRecords,
  type SeoulWelfareApiItem,
} from '@/lib/benefits/adapters/seoulWelfare'

describe('mapSeoulWelfareToBenefitRecords', () => {
  it('maps a raw item and includes the district in region', () => {
    const items: SeoulWelfareApiItem[] = [
      {
        servId: 'S00000001',
        servNm: '산후조리경비 지원',
        servDgst: '출산 후 180일 이내 신청',
        sggNm: '강남구',
        sprtCycNm: '1회성',
      },
    ]

    const result = mapSeoulWelfareToBenefitRecords(items)

    expect(result[0]).toMatchObject({
      source: 'seoul_welfare',
      externalId: 'S00000001',
      name: '산후조리경비 지원',
      region: '서울 강남구',
      applyPeriod: '1회성',
      imageUrl: '/images/defaults/benefit-life.svg',
    })
  })

  it('falls back to plain 서울 when district name is missing', () => {
    const items: SeoulWelfareApiItem[] = [{ servId: 'S00000002', servNm: '테스트' }]
    const result = mapSeoulWelfareToBenefitRecords(items)
    expect(result[0].region).toBe('서울')
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/adapters/seoulWelfare.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/benefits/adapters/seoulWelfare.ts`:
```ts
import type { BenefitRecord } from '@/lib/benefits/types'
import { getDefaultImage } from '@/lib/benefits/defaults'

// 필드명은 공공데이터포털 공개 문서 기준 최선 추정치 — 실제 인증키로 Swagger 재검증 필요.
export interface SeoulWelfareApiItem {
  servId: string
  servNm: string
  servDgst?: string
  sggNm?: string
  sprtCycNm?: string
  servDtlLink?: string
}

const CATEGORY = '생활지원'

function buildApplyLink(item: SeoulWelfareApiItem): string {
  if (item.servDtlLink) return item.servDtlLink
  return `https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=${item.servId}`
}

export function mapSeoulWelfareToBenefitRecords(items: SeoulWelfareApiItem[]): BenefitRecord[] {
  return items.map((item) => ({
    source: 'seoul_welfare',
    externalId: item.servId,
    name: item.servNm,
    category: CATEGORY,
    region: item.sggNm ? `서울 ${item.sggNm}` : '서울',
    targetPeriod: null,
    summary: item.servDgst ?? null,
    detail: item.servDgst ?? null,
    applyLink: buildApplyLink(item),
    applyPeriod: item.sprtCycNm ?? null,
    imageUrl: getDefaultImage(CATEGORY),
    rawPayload: item,
  }))
}

export async function fetchSeoulWelfareBenefits(apiKey: string): Promise<BenefitRecord[]> {
  const url = new URL(
    'http://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations/LcgvWelfarelist'
  )
  url.searchParams.set('serviceKey', apiKey)
  url.searchParams.set('callTp', 'L')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
  url.searchParams.set('ctpvNm', '서울특별시')
  url.searchParams.set('type', 'json')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`seoul welfare API request failed: ${res.status}`)
  }
  const json = await res.json()
  const items: SeoulWelfareApiItem[] = json?.wantedList ?? []
  return mapSeoulWelfareToBenefitRecords(items)
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/adapters/seoulWelfare.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/benefits/adapters/seoulWelfare.ts tests/lib/benefits/adapters/seoulWelfare.test.ts
git commit -m "feat: add seoul welfare adapter"
```

---

### Task 7: DB 행 매퍼 (camelCase ↔ snake_case)

**Files:**
- Create: `lib/benefits/mappers.ts`
- Test: `tests/lib/benefits/mappers.test.ts`

**Interfaces:**
- Consumes: `BenefitRecord`, `BenefitRow`, `BenefitStatus` (Task 4)
- Produces: `toBenefitRow(row: Record<string, unknown>): BenefitRow`, `toInsertRow(record: BenefitRecord, status: BenefitStatus): Record<string, unknown>`

- [ ] **Step 1: 테스트 작성**

`tests/lib/benefits/mappers.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { toBenefitRow, toInsertRow } from '@/lib/benefits/mappers'
import type { BenefitRecord } from '@/lib/benefits/types'

describe('toBenefitRow', () => {
  it('converts a snake_case DB row into a BenefitRow', () => {
    const dbRow = {
      id: 'row-1',
      source: 'central',
      external_id: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      target_period: '영유아',
      summary: '요약',
      detail: '상세',
      apply_link: 'https://example.com',
      apply_period: '수시',
      image_url: '/images/defaults/benefit-cash.svg',
      status: 'staging',
      has_pending_update: false,
      pending_payload: null,
      raw_payload: { servId: 'WLF1' },
      last_synced_at: '2026-09-01T00:00:00Z',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    }

    expect(toBenefitRow(dbRow)).toEqual({
      id: 'row-1',
      source: 'central',
      externalId: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      targetPeriod: '영유아',
      summary: '요약',
      detail: '상세',
      applyLink: 'https://example.com',
      applyPeriod: '수시',
      imageUrl: '/images/defaults/benefit-cash.svg',
      status: 'staging',
      hasPendingUpdate: false,
      pendingPayload: null,
      rawPayload: { servId: 'WLF1' },
      lastSyncedAt: '2026-09-01T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    })
  })
})

describe('toInsertRow', () => {
  it('converts a BenefitRecord into a snake_case insert payload', () => {
    const record: BenefitRecord = {
      source: 'central',
      externalId: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      targetPeriod: '영유아',
      summary: '요약',
      detail: '상세',
      applyLink: 'https://example.com',
      applyPeriod: '수시',
      imageUrl: '/images/defaults/benefit-cash.svg',
      rawPayload: { servId: 'WLF1' },
    }

    const result = toInsertRow(record, 'staging')

    expect(result).toMatchObject({
      source: 'central',
      external_id: 'WLF1',
      name: '첫만남이용권',
      status: 'staging',
      raw_payload: { servId: 'WLF1' },
    })
    expect(typeof result.last_synced_at).toBe('string')
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/mappers.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/benefits/mappers.ts`:
```ts
import type { BenefitRecord, BenefitRow, BenefitStatus } from './types'

export function toBenefitRow(row: Record<string, any>): BenefitRow {
  return {
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    name: row.name,
    category: row.category,
    region: row.region,
    targetPeriod: row.target_period,
    summary: row.summary,
    detail: row.detail,
    applyLink: row.apply_link,
    applyPeriod: row.apply_period,
    imageUrl: row.image_url,
    status: row.status,
    hasPendingUpdate: row.has_pending_update,
    pendingPayload: row.pending_payload,
    rawPayload: row.raw_payload,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toInsertRow(record: BenefitRecord, status: BenefitStatus): Record<string, any> {
  return {
    source: record.source,
    external_id: record.externalId,
    name: record.name,
    category: record.category,
    region: record.region,
    target_period: record.targetPeriod,
    summary: record.summary,
    detail: record.detail,
    apply_link: record.applyLink,
    apply_period: record.applyPeriod,
    image_url: record.imageUrl,
    status,
    raw_payload: record.rawPayload,
    last_synced_at: new Date().toISOString(),
  }
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/mappers.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/benefits/mappers.ts tests/lib/benefits/mappers.test.ts
git commit -m "feat: add benefit row mappers"
```

---

### Task 8: Upsert 판단 로직

**Files:**
- Create: `lib/benefits/upsertDecision.ts`
- Test: `tests/lib/benefits/upsertDecision.test.ts`

**Interfaces:**
- Consumes: `BenefitRecord`, `BenefitRow` (Task 4)
- Produces: `UpsertAction` 유니온 타입, `decideUpsertAction(existing: BenefitRow | null, incoming: BenefitRecord): UpsertAction`

- [ ] **Step 1: 테스트 작성**

`tests/lib/benefits/upsertDecision.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { decideUpsertAction } from '@/lib/benefits/upsertDecision'
import type { BenefitRecord, BenefitRow } from '@/lib/benefits/types'

const incoming: BenefitRecord = {
  source: 'central',
  externalId: 'WLF1',
  name: '첫만남이용권',
  category: '지원금',
  region: '전국',
  targetPeriod: null,
  summary: '요약',
  detail: '상세',
  applyLink: 'https://example.com',
  applyPeriod: '수시',
  imageUrl: '/images/defaults/benefit-cash.svg',
  rawPayload: { servId: 'WLF1', servDgst: '요약' },
}

function makeRow(overrides: Partial<BenefitRow>): BenefitRow {
  return {
    id: 'row-1',
    status: 'staging',
    hasPendingUpdate: false,
    pendingPayload: null,
    lastSyncedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...incoming,
    ...overrides,
  }
}

describe('decideUpsertAction', () => {
  it('inserts when there is no existing row', () => {
    expect(decideUpsertAction(null, incoming)).toEqual({ type: 'insert', record: incoming })
  })

  it('updates in place when the existing row is still staging', () => {
    const existing = makeRow({ status: 'staging' })
    expect(decideUpsertAction(existing, incoming)).toEqual({
      type: 'update_staging',
      id: 'row-1',
      record: incoming,
    })
  })

  it('does nothing when the published row payload is unchanged', () => {
    const existing = makeRow({ status: 'published', rawPayload: incoming.rawPayload })
    expect(decideUpsertAction(existing, incoming)).toEqual({ type: 'noop', id: 'row-1' })
  })

  it('flags a pending update when the published row payload changed', () => {
    const existing = makeRow({
      status: 'published',
      rawPayload: { servId: 'WLF1', servDgst: '이전 요약' },
    })
    expect(decideUpsertAction(existing, incoming)).toEqual({
      type: 'flag_pending_update',
      id: 'row-1',
      pendingPayload: incoming,
    })
  })

  it('does nothing for archived rows', () => {
    const existing = makeRow({ status: 'archived' })
    expect(decideUpsertAction(existing, incoming)).toEqual({ type: 'noop', id: 'row-1' })
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/upsertDecision.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/benefits/upsertDecision.ts`:
```ts
import type { BenefitRecord, BenefitRow } from './types'

export type UpsertAction =
  | { type: 'insert'; record: BenefitRecord }
  | { type: 'update_staging'; id: string; record: BenefitRecord }
  | { type: 'flag_pending_update'; id: string; pendingPayload: BenefitRecord }
  | { type: 'noop'; id: string }

export function decideUpsertAction(
  existing: BenefitRow | null,
  incoming: BenefitRecord
): UpsertAction {
  if (!existing) {
    return { type: 'insert', record: incoming }
  }

  if (existing.status === 'staging') {
    return { type: 'update_staging', id: existing.id, record: incoming }
  }

  if (existing.status === 'published') {
    const changed = JSON.stringify(existing.rawPayload) !== JSON.stringify(incoming.rawPayload)
    if (changed) {
      return { type: 'flag_pending_update', id: existing.id, pendingPayload: incoming }
    }
    return { type: 'noop', id: existing.id }
  }

  return { type: 'noop', id: existing.id }
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/upsertDecision.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/benefits/upsertDecision.ts tests/lib/benefits/upsertDecision.test.ts
git commit -m "feat: add upsert decision logic"
```

---

### Task 9: Upsert 적용 함수

**Files:**
- Create: `lib/benefits/applyIngestResults.ts`
- Test: `tests/lib/benefits/applyIngestResults.test.ts`

**Interfaces:**
- Consumes: `BenefitRecord`, `BenefitSource` (Task 4), `decideUpsertAction` (Task 8), `toBenefitRow`/`toInsertRow` (Task 7)
- Produces: `IngestSummary` 타입, `applyIngestResults(supabase, source, records): Promise<IngestSummary>` (Task 10에서 사용)

- [ ] **Step 1: 가짜 Supabase 클라이언트와 테스트 작성**

`tests/lib/benefits/applyIngestResults.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { applyIngestResults } from '@/lib/benefits/applyIngestResults'
import type { BenefitRecord } from '@/lib/benefits/types'

function createFakeSupabase(initialRows: Record<string, any>[]) {
  const rows = [...initialRows]
  return {
    from() {
      return {
        select() {
          return {
            eq(col1: string, val1: unknown) {
              return {
                eq(col2: string, val2: unknown) {
                  return {
                    async maybeSingle() {
                      const row = rows.find((r) => r[col1] === val1 && r[col2] === val2)
                      return { data: row ?? null, error: null }
                    },
                  }
                },
              }
            },
          }
        },
        async insert(obj: Record<string, any>) {
          rows.push({ id: `id-${rows.length + 1}`, ...obj })
          return { error: null }
        },
        update(obj: Record<string, any>) {
          return {
            async eq(col: string, val: unknown) {
              const idx = rows.findIndex((r) => r[col] === val)
              if (idx >= 0) rows[idx] = { ...rows[idx], ...obj }
              return { error: null }
            },
          }
        },
      }
    },
    _rows: rows,
  }
}

const record: BenefitRecord = {
  source: 'central',
  externalId: 'WLF1',
  name: '첫만남이용권',
  category: '지원금',
  region: '전국',
  targetPeriod: null,
  summary: '요약',
  detail: '상세',
  applyLink: 'https://example.com',
  applyPeriod: '수시',
  imageUrl: '/images/defaults/benefit-cash.svg',
  rawPayload: { servId: 'WLF1', servDgst: '요약' },
}

describe('applyIngestResults', () => {
  it('inserts new records as staging', async () => {
    const fake = createFakeSupabase([])
    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary).toEqual({
      source: 'central',
      fetchedCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      errorCount: 0,
    })
    expect(fake._rows).toHaveLength(1)
    expect(fake._rows[0].status).toBe('staging')
  })

  it('flags a pending update for a published row whose payload changed', async () => {
    const fake = createFakeSupabase([
      {
        id: 'row-1',
        source: 'central',
        external_id: 'WLF1',
        status: 'published',
        raw_payload: { servId: 'WLF1', servDgst: '이전 요약' },
        has_pending_update: false,
      },
    ])

    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary.updatedCount).toBe(1)
    expect(fake._rows[0].has_pending_update).toBe(true)
    expect(fake._rows[0].pending_payload).toEqual(record)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/benefits/applyIngestResults.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/benefits/applyIngestResults.ts`:
```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BenefitRecord, BenefitSource } from './types'
import { decideUpsertAction } from './upsertDecision'
import { toBenefitRow, toInsertRow } from './mappers'

export interface IngestSummary {
  source: BenefitSource
  fetchedCount: number
  insertedCount: number
  updatedCount: number
  errorCount: number
}

export async function applyIngestResults(
  supabase: SupabaseClient,
  source: BenefitSource,
  records: BenefitRecord[]
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    source,
    fetchedCount: records.length,
    insertedCount: 0,
    updatedCount: 0,
    errorCount: 0,
  }

  for (const record of records) {
    try {
      const { data: existingRow, error: fetchError } = await supabase
        .from('benefits')
        .select('*')
        .eq('source', record.source)
        .eq('external_id', record.externalId)
        .maybeSingle()

      if (fetchError) throw fetchError

      const existing = existingRow ? toBenefitRow(existingRow) : null
      const action = decideUpsertAction(existing, record)

      if (action.type === 'insert') {
        const { error } = await supabase.from('benefits').insert(toInsertRow(action.record, 'staging'))
        if (error) throw error
        summary.insertedCount++
      } else if (action.type === 'update_staging') {
        const { error } = await supabase
          .from('benefits')
          .update(toInsertRow(action.record, 'staging'))
          .eq('id', action.id)
        if (error) throw error
        summary.updatedCount++
      } else if (action.type === 'flag_pending_update') {
        const { error } = await supabase
          .from('benefits')
          .update({
            has_pending_update: true,
            pending_payload: action.pendingPayload,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', action.id)
        if (error) throw error
        summary.updatedCount++
      } else {
        const { error } = await supabase
          .from('benefits')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', action.id)
        if (error) throw error
      }
    } catch {
      summary.errorCount++
    }
  }

  return summary
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/benefits/applyIngestResults.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/benefits/applyIngestResults.ts tests/lib/benefits/applyIngestResults.test.ts
git commit -m "feat: add ingest upsert application logic"
```

---

### Task 10: Cron 인증 체크 + API Route

**Files:**
- Create: `lib/cron/auth.ts`
- Create: `app/api/cron/ingest-benefits/route.ts`
- Create: `vercel.json`
- Test: `tests/lib/cron/auth.test.ts`

**Interfaces:**
- Consumes: `fetchCentralBenefits` (Task 5), `fetchSeoulWelfareBenefits` (Task 6), `applyIngestResults` (Task 9), `createAdminClient` (Task 2)
- Produces: `isAuthorizedCronRequest(authHeader: string | null, cronSecret: string | undefined): boolean`, `GET /api/cron/ingest-benefits`

- [ ] **Step 1: 인증 체크 테스트 작성**

`tests/lib/cron/auth.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'

describe('isAuthorizedCronRequest', () => {
  it('returns false when there is no secret configured', () => {
    expect(isAuthorizedCronRequest('Bearer abc', undefined)).toBe(false)
  })

  it('returns false when the header does not match', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', 'abc')).toBe(false)
  })

  it('returns true when the header matches the secret', () => {
    expect(isAuthorizedCronRequest('Bearer abc', 'abc')).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/cron/auth.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/cron/auth.ts`:
```ts
export function isAuthorizedCronRequest(
  authHeader: string | null,
  cronSecret: string | undefined
): boolean {
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}
```

`app/api/cron/ingest-benefits/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCentralBenefits } from '@/lib/benefits/adapters/central'
import { fetchSeoulWelfareBenefits } from '@/lib/benefits/adapters/seoulWelfare'
import { applyIngestResults, type IngestSummary } from '@/lib/benefits/applyIngestResults'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import type { BenefitRecord, BenefitSource } from '@/lib/benefits/types'

export const dynamic = 'force-dynamic'

const SOURCE_JOBS: { source: BenefitSource; fetch: (apiKey: string) => Promise<BenefitRecord[]> }[] = [
  { source: 'central', fetch: fetchCentralBenefits },
  { source: 'seoul_welfare', fetch: fetchSeoulWelfareBenefits },
]

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DATA_GO_KR_API_KEY missing' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const results: IngestSummary[] = []

  for (const job of SOURCE_JOBS) {
    let summary: IngestSummary
    let errorMessage: string | null = null

    try {
      const records = await job.fetch(apiKey)
      summary = await applyIngestResults(supabase, job.source, records)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      summary = { source: job.source, fetchedCount: 0, insertedCount: 0, updatedCount: 0, errorCount: 1 }
    }

    await supabase.from('ingest_logs').insert({
      source: summary.source,
      fetched_count: summary.fetchedCount,
      inserted_count: summary.insertedCount,
      updated_count: summary.updatedCount,
      error_count: summary.errorCount,
      error_message: errorMessage,
    })

    results.push(summary)
  }

  return NextResponse.json({ results })
}
```

`vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/ingest-benefits", "schedule": "0 19 * * *" }]
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/cron/auth.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 수동 검증 (인증키 없이 가능한 부분)**

`.env.local`에 `CRON_SECRET=local-test-secret`를 추가하고 `DATA_GO_KR_API_KEY`는 비워둔 채로:

Run: `npm run dev`
Run: `curl -i http://localhost:3000/api/cron/ingest-benefits`
Expected: `401 {"error":"unauthorized"}`

Run: `curl -i -H "Authorization: Bearer local-test-secret" http://localhost:3000/api/cron/ingest-benefits`
Expected: `500 {"error":"DATA_GO_KR_API_KEY missing"}` (인증키를 아직 발급받지 않았으므로 여기까지만 확인 — 키 발급 후 200 응답과 `ingest_logs` 적재를 재확인할 것)

- [ ] **Step 6: Commit**

```bash
git add lib/cron app/api/cron vercel.json tests/lib/cron
git commit -m "feat: add cron ingestion route"
```

---

### Task 11: 관리자 인증

**Files:**
- Create: `lib/auth/requireAdminSession.ts`
- Create: `app/admin/login/page.tsx`
- Test: `tests/lib/auth/requireAdminSession.test.ts`

**Interfaces:**
- Consumes: `createServerSupabaseClient` (Task 2), `createBrowserSupabaseClient` (Task 2)
- Produces: `requireAdminSession(): Promise<Session>` (Task 12에서 사용)

**전제조건 (수동):** Supabase 대시보드 → Authentication → Users에서 관리자 이메일/비밀번호 계정을 1개 생성해둔다.

- [ ] **Step 1: 세션 가드 테스트 작성**

`tests/lib/auth/requireAdminSession.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({ redirect: redirectMock }))

const getSessionMock = vi.fn()
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ auth: { getSession: getSessionMock } }),
}))

import { requireAdminSession } from '@/lib/auth/requireAdminSession'

describe('requireAdminSession', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    getSessionMock.mockClear()
  })

  it('redirects to /admin/login when there is no session', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })
    await requireAdminSession()
    expect(redirectMock).toHaveBeenCalledWith('/admin/login')
  })

  it('returns the session when one exists', async () => {
    const fakeSession = { user: { id: 'u1' } }
    getSessionMock.mockResolvedValue({ data: { session: fakeSession } })
    const session = await requireAdminSession()
    expect(session).toBe(fakeSession)
  })
})
```

- [ ] **Step 2: 테스트 실행 (실패 확인)**

Run: `npm test -- tests/lib/auth/requireAdminSession.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

`lib/auth/requireAdminSession.ts`:
```ts
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function requireAdminSession() {
  const supabase = createServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    redirect('/admin/login')
  }
  return session
}
```

`app/admin/login/page.tsx`:
```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('로그인에 실패했습니다.')
      return
    }
    router.push('/admin/review')
  }

  return (
    <main className="mx-auto max-w-sm py-20">
      <h1 className="mb-6 text-xl font-semibold">관리자 로그인</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일"
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호"
          className="w-full rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-slate-900 py-2 text-white">
          로그인
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 4: 테스트 실행 (통과 확인)**

Run: `npm test -- tests/lib/auth/requireAdminSession.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/auth app/admin/login tests/lib/auth
git commit -m "feat: add admin login and session guard"
```

---

### Task 12: 관리자 승인 UI

**Files:**
- Create: `app/admin/review/actions.ts`
- Create: `app/admin/review/page.tsx`

**Interfaces:**
- Consumes: `requireAdminSession` (Task 11), `createServerSupabaseClient` (Task 2)
- Produces: `/admin/review` 페이지, Server Actions `approveBenefit`, `archiveBenefit`, `updateBenefitFieldsAction`, `createManualBenefitAction`

> 이 태스크는 스펙에 명시된 대로("관리자 승인 플로우는 필요 시 Playwright e2e로 검증, 선택 사항") 자동화 테스트 대신 **수동 QA**로 검증한다.

- [ ] **Step 1: Server Actions 작성**

`app/admin/review/actions.ts`:
```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function approveBenefit(id: string) {
  const supabase = createServerSupabaseClient()
  const { data: row, error: fetchError } = await supabase
    .from('benefits')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !row) throw new Error('혜택을 찾을 수 없습니다.')

  if (row.status === 'staging') {
    const { error } = await supabase.from('benefits').update({ status: 'published' }).eq('id', id)
    if (error) throw error
  } else if (row.has_pending_update && row.pending_payload) {
    const payload = row.pending_payload as Record<string, any>
    const { error } = await supabase
      .from('benefits')
      .update({
        name: payload.name,
        category: payload.category,
        region: payload.region,
        target_period: payload.targetPeriod,
        summary: payload.summary,
        detail: payload.detail,
        apply_period: payload.applyPeriod,
        raw_payload: payload.rawPayload,
        has_pending_update: false,
        pending_payload: null,
        status: 'published',
      })
      .eq('id', id)
    if (error) throw error
  }
  revalidatePath('/admin/review')
}

export async function archiveBenefit(id: string) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('benefits').update({ status: 'archived' }).eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}

export async function updateBenefitFieldsAction(formData: FormData) {
  const id = formData.get('id') as string
  const imageUrl = formData.get('imageUrl') as string
  const applyLink = formData.get('applyLink') as string
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('benefits')
    .update({ image_url: imageUrl, apply_link: applyLink })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}

export async function createManualBenefitAction(formData: FormData) {
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('benefits').insert({
    source: 'manual',
    external_id: null,
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    region: formData.get('region') as string,
    summary: formData.get('summary') as string,
    detail: formData.get('detail') as string,
    apply_link: formData.get('applyLink') as string,
    apply_period: formData.get('applyPeriod') as string,
    image_url: formData.get('imageUrl') as string,
    status: 'published',
  })
  if (error) throw error
  revalidatePath('/admin/review')
}
```

- [ ] **Step 2: 페이지 작성**

`app/admin/review/page.tsx`:
```tsx
import { requireAdminSession } from '@/lib/auth/requireAdminSession'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  approveBenefit,
  archiveBenefit,
  createManualBenefitAction,
  updateBenefitFieldsAction,
} from './actions'

const TABS = [
  { key: 'staging', label: '신규 승인 대기' },
  { key: 'pending', label: '업데이트 대기' },
  { key: 'published', label: '게시중' },
  { key: 'archived', label: '보관' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: { tab?: string }
}) {
  await requireAdminSession()
  const tab = (searchParams.tab as TabKey) ?? 'staging'
  const supabase = createServerSupabaseClient()

  let query = supabase.from('benefits').select('*').order('created_at', { ascending: false })
  if (tab === 'staging') query = query.eq('status', 'staging')
  else if (tab === 'pending') query = query.eq('has_pending_update', true)
  else if (tab === 'published') query = query.eq('status', 'published')
  else if (tab === 'archived') query = query.eq('status', 'archived')

  const { data: benefits } = await query

  return (
    <main className="mx-auto max-w-3xl py-10">
      <h1 className="mb-6 text-xl font-semibold">혜택 검수</h1>
      <nav className="mb-6 flex gap-4 border-b">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/admin/review?tab=${t.key}`}
            className={`pb-2 ${tab === t.key ? 'border-b-2 border-slate-900 font-medium' : 'text-slate-500'}`}
          >
            {t.label}
          </a>
        ))}
      </nav>
      <ul className="space-y-4">
        {(benefits ?? []).map((benefit) => (
          <li key={benefit.id} className="rounded border p-4">
            <p className="font-medium">{benefit.name}</p>
            <p className="text-sm text-slate-500">
              {benefit.category} · {benefit.region}
            </p>
            <p className="mt-2 text-sm">{benefit.summary}</p>
            {benefit.has_pending_update && (
              <p className="mt-2 text-sm text-amber-600">
                새 내용: {(benefit.pending_payload as any)?.summary}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {(benefit.status === 'staging' || benefit.has_pending_update) && (
                <form action={approveBenefit.bind(null, benefit.id)}>
                  <button type="submit" className="rounded bg-emerald-600 px-3 py-1 text-sm text-white">
                    승인
                  </button>
                </form>
              )}
              {benefit.status !== 'archived' && (
                <form action={archiveBenefit.bind(null, benefit.id)}>
                  <button type="submit" className="rounded bg-slate-200 px-3 py-1 text-sm">
                    보관
                  </button>
                </form>
              )}
            </div>
            <form action={updateBenefitFieldsAction} className="mt-3 flex flex-wrap gap-2 text-sm">
              <input type="hidden" name="id" value={benefit.id} />
              <input
                type="text"
                name="imageUrl"
                defaultValue={benefit.image_url ?? ''}
                placeholder="대표이미지 URL"
                className="rounded border px-2 py-1"
              />
              <input
                type="text"
                name="applyLink"
                defaultValue={benefit.apply_link ?? ''}
                placeholder="신청링크"
                className="rounded border px-2 py-1"
              />
              <button type="submit" className="rounded bg-slate-700 px-3 py-1 text-white">
                저장
              </button>
            </form>
          </li>
        ))}
      </ul>

      <section className="mt-10 border-t pt-6">
        <h2 className="mb-4 text-lg font-semibold">새 혜택 직접 추가</h2>
        <form action={createManualBenefitAction} className="grid gap-2">
          <input name="name" placeholder="혜택명" required className="rounded border px-3 py-2" />
          <input name="category" placeholder="분류" required className="rounded border px-3 py-2" />
          <input name="region" placeholder="지역" required className="rounded border px-3 py-2" />
          <input name="summary" placeholder="한줄요약" className="rounded border px-3 py-2" />
          <textarea name="detail" placeholder="상세내용" className="rounded border px-3 py-2" />
          <input name="applyLink" placeholder="신청링크" className="rounded border px-3 py-2" />
          <input name="applyPeriod" placeholder="신청기간" className="rounded border px-3 py-2" />
          <input name="imageUrl" placeholder="대표이미지 URL" className="rounded border px-3 py-2" />
          <button type="submit" className="rounded bg-slate-900 py-2 text-white">
            추가
          </button>
        </form>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 4: 수동 QA**

1. `npm run dev` 실행 후 `/admin/login` 접속, Task 11에서 만든 계정으로 로그인 → `/admin/review`로 이동하는지 확인.
2. Supabase SQL Editor에서 테스트용 staging 행을 하나 직접 insert (`insert into benefits (source, external_id, name, category, region, status) values ('manual', null, '테스트 혜택', '지원금', '전국', 'staging');`).
3. "신규 승인 대기" 탭에 보이는지, "승인" 클릭 후 "게시중" 탭으로 이동하는지 확인.
4. "새 혜택 직접 추가" 폼으로 항목을 추가하고 즉시 "게시중" 탭에 나타나는지 확인.
5. "보관" 버튼 클릭 시 "보관" 탭으로 이동하는지 확인.

- [ ] **Step 5: Commit**

```bash
git add app/admin/review
git commit -m "feat: add admin review UI"
```

---

## Self-Review 결과

- **스펙 커버리지**: 목표(매일 수집/승인 게이트/부분 실패 허용/기본값 자동 채움/부분 소스), 아키텍처, 데이터 모델(benefits+ingest_logs), 수집 플로우(어댑터+upsert 4분기), 관리자 UI(4탭+승인/보관/수정/직접추가), 에러 처리(개별 실패 격리), 테스트 전략(어댑터/판단로직 유닛테스트, UI는 수동 QA) 모두 Task 1~12에 매핑됨. 서울 몽땅정보 만능키만 스키마 미확인으로 "범위 조정" 절에서 명시적으로 후속 작업으로 분리함(플레이스홀더 아님 — 사유와 후속 계획을 명기).
- **플레이스홀더 스캔**: TBD/TODO 없음. 모든 스텝에 실행 가능한 코드/명령이 포함됨.
- **타입 일관성**: `BenefitRecord`/`BenefitRow`/`BenefitSource`/`BenefitStatus`(Task 4)가 Task 5~12 전체에서 동일하게 사용됨. `decideUpsertAction`(Task 8)의 반환 타입을 `applyIngestResults`(Task 9)가 그대로 소비. `isAuthorizedCronRequest`(Task 10)와 `requireAdminSession`(Task 11)은 각각 한 곳에서만 정의·사용되어 이름 불일치 없음.
