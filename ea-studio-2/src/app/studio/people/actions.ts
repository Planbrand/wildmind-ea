'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export type ContactRow = {
  name: string
  email?: string
  phone?: string
  company?: string
  role?: string
  country?: string
  stage?: string
  notes?: string
}

export async function importContacts(
  rows: ContactRow[],
  viewName?: string | null
): Promise<{ imported: number; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { imported: 0, error: 'Not authenticated' }

    const VALID_STAGES = ['cold', 'warm', 'hot', 'client', 'partner', 'lead']
    const records = rows
      .filter(r => r.name?.trim())
      .map(r => ({
        owner_id: user.id,
        name: r.name.trim(),
        email: r.email?.trim() || null,
        phone: r.phone?.trim() || null,
        company: r.company?.trim() || null,
        role: r.role?.trim() || null,
        country: r.country?.trim() || null,
        stage: VALID_STAGES.includes((r.stage || '').toLowerCase())
          ? r.stage!.toLowerCase()
          : 'cold',
        notes: r.notes?.trim() || null,
        view_tags: viewName ? [viewName] : [],
      }))

    if (records.length === 0) return { imported: 0, error: 'No valid rows (name required)' }

    const svc = getServiceClient()
    const { error } = await svc.from('contacts').insert(records)
    if (error) return { imported: 0, error: error.message }

    revalidatePath('/studio/people')
    return { imported: records.length }
  } catch (e) {
    return { imported: 0, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
