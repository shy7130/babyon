import type { SupabaseClient } from '@supabase/supabase-js'

export type PageViewStats = {
  today: number
  total: number
}

export async function getPageViewStats(supabase: SupabaseClient): Promise<PageViewStats> {
  const { data, error } = await supabase.from('page_views').select('day, count')
  if (error || !data) {
    console.error('failed to load page view stats:', error)
    return { today: 0, total: 0 }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const today = data.find((row) => row.day === todayStr)?.count ?? 0
  const total = data.reduce((sum, row) => sum + row.count, 0)

  return { today, total }
}
