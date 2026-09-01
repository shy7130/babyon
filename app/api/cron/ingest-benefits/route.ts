import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCentralBenefits } from '@/lib/benefits/adapters/central'
import { fetchSeoulWelfareBenefits } from '@/lib/benefits/adapters/seoulWelfare'
import { applyIngestResults, type IngestSummary } from '@/lib/benefits/applyIngestResults'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'
import type { BenefitRecord, BenefitSource } from '@/lib/benefits/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SOURCE_JOBS: { source: BenefitSource; fetch: (apiKey: string) => Promise<BenefitRecord[]> }[] = [
  { source: 'central', fetch: fetchCentralBenefits },
  { source: 'seoul_welfare', fetch: fetchSeoulWelfareBenefits },
]

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.DATA_GO_KR_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DATA_GO_KR_API_KEY missing' }, { status: 500 })
  }

  const supabase = createAdminClient()
  const results: IngestSummary[] = []

  for (const job of SOURCE_JOBS) {
    let summary: IngestSummary
    let errorMessage: string | null = null

    try {
      const records = await job.fetch(apiKey)
      summary = await applyIngestResults(supabase, job.source, records)
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err)
      summary = { source: job.source, fetchedCount: 0, insertedCount: 0, updatedCount: 0, errorCount: 1 }
    }

    try {
      const { error: logError } = await supabase.from('ingest_logs').insert({
        source: summary.source,
        fetched_count: summary.fetchedCount,
        inserted_count: summary.insertedCount,
        updated_count: summary.updatedCount,
        error_count: summary.errorCount,
        error_message: errorMessage,
      })
      if (logError) {
        console.error(`ingest_logs insert failed for source "${summary.source}":`, logError)
      }
    } catch (err) {
      // logging failure must not prevent the remaining sources from running
      console.error(`ingest_logs insert threw for source "${summary.source}":`, err)
    }

    results.push(summary)
  }

  return NextResponse.json({ results })
}
