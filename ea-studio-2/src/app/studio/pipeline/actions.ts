'use server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key)
}

export async function updateDealStage(dealId: string, stage: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const svc = getServiceClient()
    const { error } = await svc
      .from('pipeline_deals')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('id', dealId)
      .eq('owner_id', user.id)

    if (error) return { error: error.message }
    revalidatePath('/studio/pipeline')
    return {}
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
