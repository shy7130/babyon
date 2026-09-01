import { createServerSupabaseClient } from '@/lib/supabase/server'
import { toHomeBenefit } from '@/lib/home/mappers'
import HomeWizard from '@/components/home/HomeWizard'
import './home.css'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from('benefits')
    .select('*')
    .eq('status', 'published')
    .not('wizard_stages', 'is', null)

  if (error) {
    console.error('failed to load published benefits for homepage:', error)
  }

  const benefits = (data ?? []).map(toHomeBenefit)

  return <HomeWizard benefits={benefits} />
}
