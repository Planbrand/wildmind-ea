'use server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service = createServiceClient()
  const { error } = await service.from('expenses').insert({
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
}

export async function deleteExpense(id: string) {
  const service = createServiceClient()
  await service.from('expenses').delete().eq('id', id)
  revalidatePath('/studio/finance')
}
