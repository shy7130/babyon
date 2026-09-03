export type WizardRegion = '서울' | '경기'
export type WizardStage = '임신 준비' | '임신 초기' | '임신 중기' | '임신 후기' | '출산 후'
export type HomeCategory = '지원금' | '의료·검사' | '교통' | '출산·육아' | '생활지원' | '민간혜택'
export type WizardSituation = '다자녀' | '장애인가정' | '저소득·의료급여' | '자영업자·프리랜서' | '미혼모·부' | '고위험임신'

export interface HomeBenefit {
  id: string
  name: string
  category: HomeCategory
  region: string
  summary: string | null
  applyLink: string | null
  hasDirectApplyLink: boolean
  amountManwon: number | null
  wizardStages: WizardStage[]
  specialSituations: WizardSituation[]
  sourceLabel: string | null
}
