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

// 금액 데이터가 있는 항목 중 금액이 큰 순서로 상위 N개를 뽑는다 — "지금 챙기면 좋은 혜택" 추천
// 카드용. 금액이 없는 항목(amountManwon === null)은 순위를 매길 수 없으므로 애초에 제외한다.
export function getFeaturedBenefits(benefits: HomeBenefit[], count = 3): HomeBenefit[] {
  return benefits
    .filter((b): b is HomeBenefit & { amountManwon: number } => b.amountManwon != null)
    .sort((a, b) => b.amountManwon - a.amountManwon)
    .slice(0, count)
}
