'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAdminSession } from '@/lib/auth/requireAdminSession'

export async function approveBenefit(id: string) {
  await requireAdminSession()
  const supabase = createServerSupabaseClient()
  const { data: row, error: fetchError } = await supabase
    .from('benefits')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchError || !row) throw new Error('혜택을 찾을 수 없습니다.')

  if (row.status === 'staging') {
    const { error } = await supabase.from('benefits').update({ status: 'published' }).eq('id', id)
    if (error) throw error
  } else if (row.has_pending_update && row.pending_payload) {
    const payload = row.pending_payload as Record<string, any>
    const { error } = await supabase
      .from('benefits')
      .update({
        name: payload.name,
        category: payload.category,
        region: payload.region,
        target_period: payload.targetPeriod,
        summary: payload.summary,
        detail: payload.detail,
        apply_period: payload.applyPeriod,
        raw_payload: payload.rawPayload,
        has_pending_update: false,
        pending_payload: null,
        status: 'published',
      })
      .eq('id', id)
    if (error) throw error
  }
  revalidatePath('/admin/review')
}

export async function archiveBenefit(id: string) {
  await requireAdminSession()
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('benefits')
    .update({ status: 'archived', has_pending_update: false, pending_payload: null })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}

export async function updateBenefitFieldsAction(formData: FormData) {
  await requireAdminSession()
  const id = formData.get('id') as string
  const imageUrl = formData.get('imageUrl') as string
  const applyLink = formData.get('applyLink') as string
  const supabase = createServerSupabaseClient()
  const { error } = await supabase
    .from('benefits')
    .update({ image_url: imageUrl, apply_link: applyLink })
    .eq('id', id)
  if (error) throw error
  revalidatePath('/admin/review')
}

export async function createManualBenefitAction(formData: FormData) {
  await requireAdminSession()
  const supabase = createServerSupabaseClient()
  const { error } = await supabase.from('benefits').insert({
    source: 'manual',
    external_id: null,
    name: formData.get('name') as string,
    category: formData.get('category') as string,
    region: formData.get('region') as string,
    summary: formData.get('summary') as string,
    detail: formData.get('detail') as string,
    apply_link: formData.get('applyLink') as string,
    apply_period: formData.get('applyPeriod') as string,
    image_url: formData.get('imageUrl') as string,
    status: 'published',
  })
  if (error) throw error
  revalidatePath('/admin/review')
}
