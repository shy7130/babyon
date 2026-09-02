import type { HomeBenefit, HomeCategory, WizardRegion, WizardStage } from './types'

export function normalizeRegion(dbRegion: string): 'all' | WizardRegion {
  if (dbRegion.startsWith('서울')) return '서울'
  if (dbRegion.startsWith('경기')) return '경기'
  return 'all'
}

// district는 서울 선택 시에만 의미 있다(구 단위 혜택 vs 서울 전역 혜택 구분) — null이면
// 구를 아직 안 골랐거나 해당 없는 경우로, 서울 관련 혜택을 구 상관없이 전부 매치한다.
export function matchesRegion(
  benefit: HomeBenefit,
  selected: WizardRegion,
  district: string | null = null
): boolean {
  const normalized = normalizeRegion(benefit.region)
  if (normalized === 'all') return true
  if (normalized !== selected) return false
  if (selected === '서울' && district && benefit.region !== '서울') {
    return benefit.region === `서울 ${district}`
  }
  return true
}

export function matchesStage(benefit: HomeBenefit, selected: WizardStage): boolean {
  return benefit.wizardStages.includes(selected)
}

export interface WizardSelection {
  region: WizardRegion
  district?: string | null
  stage: WizardStage
  category: HomeCategory | 'all'
}

export function filterBenefits(benefits: HomeBenefit[], selection: WizardSelection): HomeBenefit[] {
  return benefits.filter((benefit) => {
    const matchCategory = selection.category === 'all' || benefit.category === selection.category
    return (
      matchCategory &&
      matchesRegion(benefit, selection.region, selection.district ?? null) &&
      matchesStage(benefit, selection.stage)
    )
  })
}

// 금액 데이터가 있는 항목 중 금액이 큰 순서로 상위 N개를 뽑는다 — "지금 챙기면 좋은 혜택" 추천
// 카드용. 금액이 없는 항목(amountManwon === null)은 순위를 매길 수 없으므로 애초에 제외한다.
export function getFeaturedBenefits(benefits: HomeBenefit[], count = 3): HomeBenefit[] {
  return benefits
    .filter((b): b is HomeBenefit & { amountManwon: number } => b.amountManwon != null)
    .sort((a, b) => b.amountManwon - a.amountManwon)
    .slice(0, count)
}

// "인기 혜택" 섹션은 위저드 답변(지역·구·단계) 이전에 누구에게나 보여주는 자리라, 실제 조회수
// 같은 인기 지표가 없는 지금은 특정 구 전용 혜택을 끼워넣지 않도록 전국/서울 전역 항목만 후보로
// 삼는다. 금액이 있는 항목(구체적 숫자라 더 눈에 띔)을 먼저, 그다음 바로 신청 가능한 항목을
// 우선하고, 나머지는 이름순으로 안정적으로 정렬한다.
export function getPopularBenefits(benefits: HomeBenefit[], count = 4): HomeBenefit[] {
  return benefits
    .filter((b) => b.region === '전국' || b.region === '서울')
    .sort((a, b) => {
      const amountDiff = (b.amountManwon ?? -1) - (a.amountManwon ?? -1)
      if (amountDiff !== 0) return amountDiff
      const applyDiff = Number(b.hasDirectApplyLink) - Number(a.hasDirectApplyLink)
      if (applyDiff !== 0) return applyDiff
      return a.name.localeCompare(b.name, 'ko')
    })
    .slice(0, count)
}
