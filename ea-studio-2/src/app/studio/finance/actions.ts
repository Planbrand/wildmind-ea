'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TL_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID!
const TL_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET!
const TL_AUTH = 'https://auth.truelayer-sandbox.com'
const TL_API = 'https://api.truelayer-sandbox.com'

async function refreshTokenIfNeeded(connection: {
  id: string; access_token: string; refresh_token: string; expires_at: string
}) {
  const supabase = await createClient()
  const expired = new Date(connection.expires_at) < new Date(Date.now() + 60_000)
  if (!expired) return connection.access_token

  const res = await fetch(`${TL_AUTH}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: TL_CLIENT_ID,
      client_secret: TL_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
    }),
  })

  if (!res.ok) throw new Error('Token refresh failed')
  const tokens = await res.json() as { access_token: string; refresh_token: string; expires_in: number }
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  await supabase.from('bank_connections').update({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  }).eq('id', connection.id)

  return tokens.access_token
}

export async function syncBankTransactions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: conn } = await supabase
    .from('bank_connections')
    .select('id, account_id, access_token, refresh_token, expires_at')
    .eq('owner_id', user.id)
    .single()

  if (!conn) throw new Error('No bank connection')

  const token = await refreshTokenIfNeeded(conn)

  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const url = `${TL_API}/data/v1/accounts/${conn.account_id}/transactions?from=${from}&to=${to}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TrueLayer error: ${res.status} — ${err}`)
  }

  const { results } = await res.json() as {
    results: Array<{
      transaction_id: string; timestamp: string; description: string
      transaction_type: string; amount: number; currency: string; merchant_name?: string
    }>
  }

  if (!results?.length) return 0

  const { data: existing } = await supabase
    .from('finance_transactions')
    .select('external_id')
    .eq('owner_id', user.id)

  const existingIds = new Set((existing || []).map(t => t.external_id))

  const toInsert = results
    .filter(t => !existingIds.has(t.transaction_id))
    .map(t => ({
      owner_id: user.id,
      external_id: t.transaction_id,
      date: t.timestamp.split('T')[0],
      description: t.merchant_name || t.description,
      amount_pence: Math.round(Math.abs(t.amount) * 100),
      direction: t.amount >= 0 ? 'in' : 'out',
      currency: t.currency,
      raw: t,
    }))

  if (toInsert.length > 0) {
    await supabase.from('finance_transactions').insert(toInsert)
  }

  await supabase.from('bank_connections')
    .update({ last_synced: new Date().toISOString() })
    .eq('id', conn.id)

  revalidatePath('/studio/finance')
  return toInsert.length
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
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('expenses').insert({
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

  if (error) throw new Error(error.message)

  revalidatePath('/studio/finance')
}

export async function deleteExpense(id: string) {
  const supabase = await createClient()
  await supabase.from('expenses').delete().eq('id', id)
  revalidatePath('/studio/finance')
}
