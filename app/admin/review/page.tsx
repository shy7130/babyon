import { requireAdminSession } from '@/lib/auth/requireAdminSession'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  approveBenefit,
  archiveBenefit,
  createManualBenefitAction,
  updateBenefitFieldsAction,
  updateBenefitTagsAction,
} from './actions'

const WIZARD_STAGE_OPTIONS = ['임신 준비', '임신 초기', '임신 중기', '임신 후기', '출산 후'] as const

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
  const requestedTab = searchParams.tab
  const tab: TabKey = TABS.some((t) => t.key === requestedTab)
    ? (requestedTab as TabKey)
    : 'staging'
  const supabase = createServerSupabaseClient()

  let query = supabase.from('benefits').select('*').order('created_at', { ascending: false })
  if (tab === 'staging') query = query.eq('status', 'staging')
  else if (tab === 'pending') query = query.eq('has_pending_update', true).neq('status', 'archived')
  else if (tab === 'published') query = query.eq('status', 'published')
  else if (tab === 'archived') query = query.eq('status', 'archived')

  const { data: benefits, error } = await query

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
      {error && (
        <p className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          목록을 불러오지 못했습니다: {error.message}
        </p>
      )}
      <ul className="space-y-4">
        {(benefits ?? []).map((benefit) => (
          <li key={benefit.id} className="rounded border p-4">
            <p className="font-medium">{benefit.name}</p>
            <p className="text-sm text-slate-500">
              {benefit.category} · {benefit.region}
            </p>
            <p className="mt-2 text-sm">{benefit.summary}</p>
            <p className="mt-1 text-sm">
              지원금액: {benefit.amount_manwon != null ? `${benefit.amount_manwon}만원` : '미입력'}
            </p>
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
              <input
                type="number"
                name="amountManwon"
                defaultValue={benefit.amount_manwon ?? ''}
                placeholder="지원금액(만원)"
                className="w-32 rounded border px-2 py-1"
              />
              <button type="submit" className="rounded bg-slate-700 px-3 py-1 text-white">
                저장
              </button>
            </form>
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
          <input
            type="number"
            name="amountManwon"
            placeholder="지원금액(만원)"
            className="rounded border px-3 py-2"
          />
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
