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
  hasDirectApplyLink: boolean
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
