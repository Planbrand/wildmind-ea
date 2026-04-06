'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSection(name: string, icon: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase.from('sections').insert({
    owner_id: user.id,
    name,
    icon: icon || null,
    sort_order: 99,
  }).select().single()

  revalidatePath('/studio')
  return data
}

export async function createView(sectionId: string, name: string, color: string, icon: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4)

  const { data } = await supabase.from('workspace_views').insert({
    owner_id: user.id,
    section_id: sectionId,
    name,
    slug,
    color: color || '#059669',
    icon: icon || null,
    is_studio: false,
    sort_order: 99,
  }).select().single()

  // Create default tabs
  if (data) {
    await supabase.from('view_tabs').insert([
      { owner_id: user.id, view_id: data.id, name: 'Overview', layout: 'table', is_default: true, sort_order: 0 },
      { owner_id: user.id, view_id: data.id, name: 'DNA Fields', layout: 'list', is_default: true, sort_order: 1 },
      { owner_id: user.id, view_id: data.id, name: 'EA Agenda', layout: 'list', is_default: true, sort_order: 2 },
      { owner_id: user.id, view_id: data.id, name: 'Contacts', layout: 'table', is_default: true, sort_order: 3 },
      { owner_id: user.id, view_id: data.id, name: 'Goals', layout: 'list', is_default: true, sort_order: 4 },
    ])
  }

  revalidatePath('/studio')
  return data
}

export async function seedDefaultSections() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Check if already seeded
  const { data: existing } = await supabase.from('sections').select('id').eq('owner_id', user.id).limit(1)
  if (existing && existing.length > 0) return

  // Create Main section with Studio view
  const { data: mainSection } = await supabase.from('sections').insert({
    owner_id: user.id, name: 'Studio', icon: '⬡', sort_order: 0,
  }).select().single()

  if (mainSection) {
    const { data: studioView } = await supabase.from('workspace_views').insert({
      owner_id: user.id, section_id: mainSection.id,
      name: 'Studio', slug: 'studio-main', color: '#059669',
      is_studio: true, sort_order: 0,
    }).select().single()

    if (studioView) {
      await supabase.from('view_tabs').insert([
        { owner_id: user.id, view_id: studioView.id, name: 'Overview', layout: 'table', is_default: true, sort_order: 0 },
        { owner_id: user.id, view_id: studioView.id, name: 'DNA Fields', layout: 'list', is_default: true, sort_order: 1 },
        { owner_id: user.id, view_id: studioView.id, name: 'Contacts', layout: 'table', is_default: true, sort_order: 2 },
        { owner_id: user.id, view_id: studioView.id, name: 'Goals', layout: 'list', is_default: true, sort_order: 3 },
        { owner_id: user.id, view_id: studioView.id, name: 'Chat', layout: 'chat', is_default: true, sort_order: 4 },
      ])
    }
  }

  // Create Brands section
  await supabase.from('sections').insert({
    owner_id: user.id, name: 'Brands', icon: '🏷️', sort_order: 1,
  })
  // Note: no revalidatePath here — this is called during layout render
}

export async function addTabToView(viewId: string, name: string, layout: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase.from('view_tabs').select('sort_order').eq('view_id', viewId).order('sort_order', { ascending: false }).limit(1)
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  await supabase.from('view_tabs').insert({
    owner_id: user.id,
    view_id: viewId,
    name,
    layout,
    sort_order: nextOrder,
  })

  revalidatePath('/studio')
}

export async function deleteView(viewId: string) {
  const supabase = await createClient()
  await supabase.from('workspace_views').delete().eq('id', viewId)
  revalidatePath('/studio')
  redirect('/studio/dashboard')
}
