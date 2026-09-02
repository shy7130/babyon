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

// JOURNEY_STAGE_INDEX의 역방향 조회 — 1번 카드는 "임신 준비"와 "임신 초기" 두 WizardStage를
// 합친 것이므로, 카드별 실제 혜택 개수를 세려면 해당 인덱스에 속한 모든 WizardStage를 알아야 한다.
export function wizardStagesForJourneyIndex(index: 1 | 2 | 3 | 4): WizardStage[] {
  return (Object.keys(JOURNEY_STAGE_INDEX) as WizardStage[]).filter(
    (stage) => JOURNEY_STAGE_INDEX[stage] === index
  )
}

export function countBenefitsForJourneyIndex(
  benefits: HomeBenefit[],
  region: WizardRegion,
  index: 1 | 2 | 3 | 4
): number {
  const stages = wizardStagesForJourneyIndex(index)
  return benefits.filter(
    (benefit) =>
      matchesRegion(benefit, region) && stages.some((stage) => benefit.wizardStages.includes(stage))
  ).length
}
