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

export async function addAgendaEntry(brandId: string, ownerId: string, title: string, body: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('ea_agenda').insert({
    owner_id: ownerId,
    brand_id: brandId,
    title,
    body,
    entry_type: 'note',
    priority: 3,
    is_pinned: false,
  })
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

export async function addGoal(brandId: string, ownerId: string, title: string, description: string, targetDate: string, slug: string) {
  const supabase = await createClient()
  await supabase.from('goals').insert({
    owner_id: ownerId,
    brand_id: brandId,
    title,
    description,
    target_date: targetDate || null,
    status: 'active',
    progress_pct: 0,
  })
  revalidatePath(`/studio/brands/${slug}`)
}
