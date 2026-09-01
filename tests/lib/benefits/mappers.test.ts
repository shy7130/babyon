import { describe, expect, it } from 'vitest'
import { toBenefitRow, toInsertRow } from '@/lib/benefits/mappers'
import type { BenefitRecord } from '@/lib/benefits/types'

describe('toBenefitRow', () => {
  it('converts a snake_case DB row into a BenefitRow', () => {
    const dbRow = {
      id: 'row-1',
      source: 'central',
      external_id: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      target_period: '영유아',
      summary: '요약',
      detail: '상세',
      apply_link: 'https://example.com',
      apply_period: '수시',
      image_url: '/images/defaults/benefit-cash.svg',
      status: 'staging',
      has_pending_update: false,
      pending_payload: null,
      raw_payload: { servId: 'WLF1' },
      last_synced_at: '2026-09-01T00:00:00Z',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    }

    expect(toBenefitRow(dbRow)).toEqual({
      id: 'row-1',
      source: 'central',
      externalId: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      targetPeriod: '영유아',
      summary: '요약',
      detail: '상세',
      applyLink: 'https://example.com',
      applyPeriod: '수시',
      imageUrl: '/images/defaults/benefit-cash.svg',
      status: 'staging',
      hasPendingUpdate: false,
      pendingPayload: null,
      rawPayload: { servId: 'WLF1' },
      lastSyncedAt: '2026-09-01T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-09-01T00:00:00Z',
    })
  })
})

describe('toInsertRow', () => {
  it('converts a BenefitRecord into a snake_case insert payload', () => {
    const record: BenefitRecord = {
      source: 'central',
      externalId: 'WLF1',
      name: '첫만남이용권',
      category: '지원금',
      region: '전국',
      targetPeriod: '영유아',
      summary: '요약',
      detail: '상세',
      applyLink: 'https://example.com',
      applyPeriod: '수시',
      imageUrl: '/images/defaults/benefit-cash.svg',
      rawPayload: { servId: 'WLF1' },
    }

    const result = toInsertRow(record, 'staging')

    expect(result).toMatchObject({
      source: 'central',
      external_id: 'WLF1',
      name: '첫만남이용권',
      status: 'staging',
      raw_payload: { servId: 'WLF1' },
    })
    expect(typeof result.last_synced_at).toBe('string')
  })
})
