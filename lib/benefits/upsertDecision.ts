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
