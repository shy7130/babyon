import { describe, expect, it } from 'vitest'
import { applyIngestResults } from '@/lib/benefits/applyIngestResults'
import type { BenefitRecord } from '@/lib/benefits/types'

function createFakeSupabase(initialRows: Record<string, any>[]) {
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
})
