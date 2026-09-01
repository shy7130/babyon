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
