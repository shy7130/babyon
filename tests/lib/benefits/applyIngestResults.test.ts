import { describe, expect, it } from 'vitest'
import { applyIngestResults } from '@/lib/benefits/applyIngestResults'
import type { BenefitRecord } from '@/lib/benefits/types'

function createFakeSupabase(
  initialRows: Record<string, any>[],
  options: { failInsertIf?: (obj: Record<string, any>) => boolean } = {}
) {
  const rows = [...initialRows]
  return {
    from() {
      return {
        select() {
          return {
            eq(col1: string, val1: unknown) {
              return {
                eq(col2: string, val2: unknown) {
                  return {
                    async maybeSingle() {
                      const row = rows.find((r) => r[col1] === val1 && r[col2] === val2)
                      return { data: row ?? null, error: null }
                    },
                  }
                },
              }
            },
          }
        },
        async insert(obj: Record<string, any>) {
          if (options.failInsertIf?.(obj)) {
            return { error: new Error('boom') }
          }
          rows.push({ id: `id-${rows.length + 1}`, ...obj })
          return { error: null }
        },
        update(obj: Record<string, any>) {
          return {
            async eq(col: string, val: unknown) {
              const idx = rows.findIndex((r) => r[col] === val)
              if (idx >= 0) rows[idx] = { ...rows[idx], ...obj }
              return { error: null }
            },
          }
        },
      }
    },
    _rows: rows,
  }
}

const record: BenefitRecord = {
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
  rawPayload: { servId: 'WLF1', servDgst: '요약' },
}

describe('applyIngestResults', () => {
  it('inserts new records as staging', async () => {
    const fake = createFakeSupabase([])
    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary).toEqual({
      source: 'central',
      fetchedCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      errorCount: 0,
    })
    expect(fake._rows).toHaveLength(1)
    expect(fake._rows[0].status).toBe('staging')
  })

  it('flags a pending update for a published row whose payload changed', async () => {
    const fake = createFakeSupabase([
      {
        id: 'row-1',
        source: 'central',
        external_id: 'WLF1',
        status: 'published',
        raw_payload: { servId: 'WLF1', servDgst: '이전 요약' },
        has_pending_update: false,
      },
    ])

    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary.updatedCount).toBe(1)
    expect(fake._rows[0].has_pending_update).toBe(true)
    expect(fake._rows[0].pending_payload).toEqual(record)
  })

  it('overwrites a staging row with fresh data on update_staging', async () => {
    const fake = createFakeSupabase([
      {
        id: 'row-1',
        source: 'central',
        external_id: 'WLF1',
        status: 'staging',
        name: '이전 이름',
        raw_payload: { servId: 'WLF1', servDgst: '이전 요약' },
      },
    ])

    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary.updatedCount).toBe(1)
    expect(summary.insertedCount).toBe(0)
    expect(fake._rows[0].status).toBe('staging')
    expect(fake._rows[0].name).toBe(record.name)
    expect(fake._rows[0].raw_payload).toEqual(record.rawPayload)
  })

  it('does not increment any counter when a published row is unchanged (noop)', async () => {
    const fake = createFakeSupabase([
      {
        id: 'row-1',
        source: 'central',
        external_id: 'WLF1',
        status: 'published',
        raw_payload: { servId: 'WLF1', servDgst: '요약' },
        has_pending_update: false,
      },
    ])

    const summary = await applyIngestResults(fake as any, 'central', [record])

    expect(summary.insertedCount).toBe(0)
    expect(summary.updatedCount).toBe(0)
    expect(summary.errorCount).toBe(0)
  })

  it('isolates a single record insert failure without aborting the batch', async () => {
    const record2: BenefitRecord = {
      ...record,
      externalId: 'WLF2',
      name: '두 번째 혜택',
      rawPayload: { servId: 'WLF2', servDgst: '요약2' },
    }

    const fake = createFakeSupabase([], {
      failInsertIf: (obj) => obj.external_id === 'WLF2',
    })

    const summary = await applyIngestResults(fake as any, 'central', [record, record2])

    expect(summary.fetchedCount).toBe(2)
    expect(summary.insertedCount).toBe(1)
    expect(summary.errorCount).toBe(1)
  })
})
