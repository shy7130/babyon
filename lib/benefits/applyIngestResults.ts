import type { SupabaseClient } from '@supabase/supabase-js'
import type { BenefitRecord, BenefitSource } from './types'
import { decideUpsertAction } from './upsertDecision'
import { toBenefitRow, toInsertRow } from './mappers'

export interface IngestSummary {
  source: BenefitSource
  fetchedCount: number
  insertedCount: number
  updatedCount: number
  errorCount: number
}

export async function applyIngestResults(
  supabase: SupabaseClient,
  source: BenefitSource,
  records: BenefitRecord[]
): Promise<IngestSummary> {
  const summary: IngestSummary = {
    source,
    fetchedCount: records.length,
    insertedCount: 0,
    updatedCount: 0,
    errorCount: 0,
  }

  for (const record of records) {
    try {
      const { data: existingRow, error: fetchError } = await supabase
        .from('benefits')
        .select('*')
        .eq('source', record.source)
        .eq('external_id', record.externalId)
        .maybeSingle()

      if (fetchError) throw fetchError

      const existing = existingRow ? toBenefitRow(existingRow) : null
      const action = decideUpsertAction(existing, record)

      if (action.type === 'insert') {
        const { error } = await supabase.from('benefits').insert(toInsertRow(action.record, 'staging'))
        if (error) throw error
        summary.insertedCount++
      } else if (action.type === 'update_staging') {
        const { error } = await supabase
          .from('benefits')
          .update(toInsertRow(action.record, 'staging'))
          .eq('id', action.id)
        if (error) throw error
        summary.updatedCount++
      } else if (action.type === 'flag_pending_update') {
        const { error } = await supabase
          .from('benefits')
          .update({
            has_pending_update: true,
            pending_payload: action.pendingPayload,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', action.id)
        if (error) throw error
        summary.updatedCount++
      } else {
        const { error } = await supabase
          .from('benefits')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', action.id)
        if (error) throw error
      }
    } catch {
      summary.errorCount++
    }
  }

  return summary
}
