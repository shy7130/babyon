import { createServerSupabaseClient } from '@/lib/supabase/server'
import { toHomeBenefit } from '@/lib/home/mappers'
import HomeWizard from '@/components/home/HomeWizard'
import './home.css'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()

  const { error: viewError } = await supabase.rpc('increment_page_view')
  if (viewError) {
    console.error('failed to record page view:', viewError)
  }

  // anon has column-level grants only (see migrations 0002/0004), never table-wide SELECT —
  // PostgREST rejects select=* for such a role with a 42501 permission error even though every
  // column below is individually granted, so this must list exactly the anon-safe columns.
  const { data, error } = await supabase
    .from('benefits')
    .select(
      'id, name, category, region, summary, apply_link, has_direct_apply_link, amount_manwon, wizard_stages, special_situations'
    )
    .eq('status', 'published')
    .not('wizard_stages', 'is', null)

  if (error) {
    console.error('failed to load published benefits for homepage:', error)
  }

  const benefits = (data ?? []).map(toHomeBenefit)

  return <HomeWizard benefits={benefits} />
}
