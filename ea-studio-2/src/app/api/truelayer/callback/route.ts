import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const TL_CLIENT_ID = process.env.TRUELAYER_CLIENT_ID!
const TL_CLIENT_SECRET = process.env.TRUELAYER_CLIENT_SECRET!
const TL_REDIRECT_URI = process.env.TRUELAYER_REDIRECT_URI!
const TL_AUTH = 'https://auth.truelayer-sandbox.com'
const TL_API = 'https://api.truelayer-sandbox.com'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/studio/finance?error=no_code', req.url))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))

  // Exchange code for tokens
  const tokenRes = await fetch(`${TL_AUTH}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: TL_CLIENT_ID,
      client_secret: TL_CLIENT_SECRET,
      redirect_uri: TL_REDIRECT_URI,
      code,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    const msg = encodeURIComponent(err.slice(0, 200))
    return NextResponse.redirect(new URL(`/studio/finance?error=${msg}`, req.url))
  }

  const tokens = await tokenRes.json() as {
    access_token: string; refresh_token: string; expires_in: number
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Fetch account info
  let accountId = null
  let accountName = null
  try {
    const accountsRes = await fetch(`${TL_API}/data/v1/accounts`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    if (accountsRes.ok) {
      const accountsData = await accountsRes.json()
      const account = accountsData.results?.[0]
      accountId = account?.account_id || null
      accountName = account?.display_name || null
    }
  } catch (e) {
    console.error('Account fetch failed:', e)
  }

  // Upsert bank connection
  const { data: existing } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('bank_connections').update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      account_id: accountId,
      account_name: accountName,
    }).eq('id', existing.id)
  } else {
    await supabase.from('bank_connections').insert({
      owner_id: user.id,
      provider: 'truelayer',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      account_id: accountId,
      account_name: accountName,
    })
  }

  return NextResponse.redirect(new URL('/studio/finance?connected=true', req.url))
}
