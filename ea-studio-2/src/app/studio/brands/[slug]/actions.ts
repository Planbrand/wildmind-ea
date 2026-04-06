'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateDnaField(id: string, label: string, body: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('ea_dna').update({ label, body, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath(`/studio/brands/${slug}`)
}

export async function addDnaField(brandId: string, ownerId: string, layer: string, label: string, body: string, slug: string) {
  const supabase = await createClient()
  const fieldId = `${layer}-F${Date.now().toString().slice(-4)}`
  await supabase.from('ea_dna').insert({
    owner_id: ownerId,
    brand_id: brandId,
    layer,
    field_id: fieldId,
    label,
    body,
    locked: false,
    is_ghost: false,
    status: 'active',
    sort_order: 99,
  })
  revalidatePath(`/studio/brands/${slug}`)
}

export async function deleteDnaField(id: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('ea_dna').delete().eq('id', id)
  revalidatePath(`/studio/brands/${slug}`)
}

export async function updateBrand(id: string, fields: Record<string, string | number>, slug: string) {
  const supabase = await createClient()
  await supabase.from('brands').update(fields).eq('id', id)
  revalidatePath(`/studio/brands/${slug}`)
}

export async function addAgendaEntry(data: {
  brandId: string
  ownerId: string
  title: string
  body: string
  entry_type: string
  life_area: string
  deadline_date: string
  reminder_at: string
  priority: number
  slug: string
}) {
  const supabase = await createClient()
  await supabase.from('ea_agenda').insert({
    owner_id: data.ownerId,
    brand_id: data.brandId,
    title: data.title,
    body: data.body || null,
    priority: data.priority || 2,
    deadline_date: data.deadline_date || null,
    reminder_at: data.reminder_at || null,
  })
  revalidatePath(`/studio/brands/${data.slug}`)
}

export async function deleteAgendaEntry(id: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('ea_agenda').delete().eq('id', id)
  revalidatePath(`/studio/brands/${slug}`)
}

export async function addContact(brandId: string, ownerId: string, name: string, email: string, company: string, stage: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('contacts').insert({
    owner_id: ownerId,
    brand_id: brandId,
    name,
    email,
    company,
    stage,
  })
  revalidatePath(`/studio/brands/${slug}`)
}

export async function addGoal(data: {
  brandId: string
  ownerId: string
  title: string
  description: string
  target_date: string
  priority: number
  financial_target_pence: number | null
  related_brand_ids: string[]
  people_to_reach: string[]
  slug: string
}) {
  const supabase = await createClient()
  await supabase.from('goals').insert({
    owner_id: data.ownerId,
    brand_id: data.brandId,
    title: data.title,
    description: data.description || null,
    target_date: data.target_date || null,
    priority: data.priority,
    financial_target_pence: data.financial_target_pence,
    related_brand_ids: data.related_brand_ids,
    people_to_reach: data.people_to_reach,
    status: 'active',
    progress_pct: 0,
  })
  revalidatePath(`/studio/brands/${data.slug}`)
}

export async function deleteGoal(id: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('goals').delete().eq('id', id)
  revalidatePath(`/studio/brands/${slug}`)
}
