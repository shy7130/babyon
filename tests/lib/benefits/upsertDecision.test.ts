import { describe, expect, it } from 'vitest'
import { decideUpsertAction } from '@/lib/benefits/upsertDecision'
import type { BenefitRecord, BenefitRow } from '@/lib/benefits/types'

const incoming: BenefitRecord = {
  source: 'central',
  externalId: 'WLF1',
  name: '첫만남이용권',
  category: '지원금',
  region: '전국',
  targetPeriod: null,
  summary: '요약',
  detail: '상세',
  applyLink: 'https://example.com',
  applyPeriod: '수시',
  imageUrl: '/images/defaults/benefit-cash.svg',
  hasDirectApplyLink: true,
  amountManwon: null,
  rawPayload: { servId: 'WLF1', servDgst: '요약' },
}

function makeRow(overrides: Partial<BenefitRow>): BenefitRow {
  return {
    id: 'row-1',
    status: 'staging',
    hasPendingUpdate: false,
    pendingPayload: null,
    lastSyncedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...incoming,
    ...overrides,
  }
}

describe('decideUpsertAction', () => {
  it('inserts when there is no existing row', () => {
    expect(decideUpsertAction(null, incoming)).toEqual({ type: 'insert', record: incoming })
  })

  it('updates in place when the existing row is still staging', () => {
    const existing = makeRow({ status: 'staging' })
    expect(decideUpsertAction(existing, incoming)).toEqual({
      type: 'update_staging',
      id: 'row-1',
      record: incoming,
    })
  })

  it('does nothing when the published row payload is unchanged', () => {
    const existing = makeRow({ status: 'published', rawPayload: incoming.rawPayload })
    expect(decideUpsertAction(existing, incoming)).toEqual({ type: 'noop', id: 'row-1' })
  })

  it('flags a pending update when the published row payload changed', () => {
    const existing = makeRow({
      status: 'published',
      rawPayload: { servId: 'WLF1', servDgst: '이전 요약' },
    })
    expect(decideUpsertAction(existing, incoming)).toEqual({
      type: 'flag_pending_update',
      id: 'row-1',
      pendingPayload: incoming,
    })
  })

  it('does nothing for archived rows', () => {
    const existing = makeRow({ status: 'archived' })
    expect(decideUpsertAction(existing, incoming)).toEqual({ type: 'noop', id: 'row-1' })
  })

  it('does not flag a pending update when rawPayload only differs by key order (jsonb round-trip)', () => {
    // existing.rawPayload simulates a value that round-tripped through Postgres jsonb,
    // which does not preserve key insertion order.
    const existing = makeRow({
      status: 'published',
      rawPayload: { servDgst: '요약', servId: 'WLF1' },
    })
    const incomingReordered: BenefitRecord = {
      ...incoming,
      rawPayload: { servId: 'WLF1', servDgst: '요약' },
    }
    expect(decideUpsertAction(existing, incomingReordered)).toEqual({
      type: 'noop',
      id: 'row-1',
    })
  })
})
