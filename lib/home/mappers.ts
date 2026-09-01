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
