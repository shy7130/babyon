import { afterEach, describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'ingest_logs') {
        return { insert: insertMock }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  }),
}))

vi.mock('@/lib/benefits/adapters/central', () => ({
  fetchCentralBenefits: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/benefits/adapters/seoulWelfare', () => ({
  fetchSeoulWelfareBenefits: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/benefits/applyIngestResults', () => ({
  applyIngestResults: vi.fn(async (_supabase: unknown, source: string) => ({
    source,
    fetchedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    errorCount: 0,
  })),
}))

describe('GET /api/cron/ingest-benefits', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    insertMock.mockReset()
  })

  it("continues to the next source when one source's ingest_logs insert throws", async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    vi.stubEnv('DATA_GO_KR_API_KEY', 'key')

    insertMock.mockImplementationOnce(() => {
      throw new Error('transient supabase failure')
    })
    insertMock.mockImplementationOnce(async () => ({ error: null }))

    const { GET } = await import('@/app/api/cron/ingest-benefits/route')

    const request = new Request('http://localhost/api/cron/ingest-benefits', {
      headers: { authorization: 'Bearer secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.results).toHaveLength(2)
    expect(insertMock).toHaveBeenCalledTimes(2)
  })
})
