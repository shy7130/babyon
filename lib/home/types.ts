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
  hasDirectApplyLink: boolean
  wizardStages: WizardStage[]
  sourceLabel: string | null
}
