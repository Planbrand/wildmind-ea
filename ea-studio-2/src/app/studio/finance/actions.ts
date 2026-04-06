'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getWriteClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  if (serviceKey) {
    return createSupabaseClient(url, serviceKey)
  }
  // fallback: service role not set, will rely on row-level security
  return createSupabaseClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

export async function addExpense(data: {
  amount: number
  merchant: string
  frequency: string
  currency: string
  description: string
  date: string
  view_tags?: string[]
  contact_id?: string
}): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const client = getWriteClient()
    const { error } = await client.from('expenses').insert({
      owner_id: user.id,
      amount_pence: Math.round(data.amount * 100),
      merchant: data.merchant,
      frequency: data.frequency,
      currency: data.currency,
      description: data.description,
      date: data.date,
      view_tags: data.view_tags || [],
      contact_id: data.contact_id || null,
    })

    if (error) return { error: error.message }

    revalidatePath('/studio/finance')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export async function deleteExpense(id: string) {
  const client = getWriteClient()
  await client.from('expenses').delete().eq('id', id)
  revalidatePath('/studio/finance')
}
