'use client'
import { useState } from 'react'
import { syncBankTransactions } from './actions'

const TL_CLIENT_ID = process.env.NEXT_PUBLIC_TRUELAYER_CLIENT_ID!
const TL_REDIRECT_URI = process.env.NEXT_PUBLIC_TRUELAYER_REDIRECT_URI!
const TL_AUTH = 'https://auth.truelayer-sandbox.com'

type Props = {
  connected: boolean
  accountName: string | null
  lastSynced: string | null
}

export function BankSync({ connected, accountName, lastSynced }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  function connectBank() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: TL_CLIENT_ID,
      redirect_uri: TL_REDIRECT_URI,
      scope: 'info accounts balance cards transactions offline_access',
      providers: 'uk-ob-all uk-oauth-all',
    })
    window.location.href = `${TL_AUTH}/?${params}`
  }

  async function handleSync() {
    setSyncing(true)
    setResult(null)
    try {
      const count = await syncBankTransactions()
      setResult(`+${count} new transactions synced`)
    } catch (e: unknown) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`)
    } finally {
      setSyncing(false)
    }
  }

  if (!connected) {
    return (
      <button onClick={connectBank} style={{
        padding: '8px 16px', borderRadius: '8px', border: 'none',
        background: '#2563eb', color: '#fff', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer',
      }}>
        Connect Santander
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{accountName || 'Bank connected'}</span>
        {lastSynced && (
          <span> · Last synced {new Date(lastSynced).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        )}
      </div>
      <button onClick={handleSync} disabled={syncing} style={{
        padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border)',
        background: 'var(--surface)', color: 'var(--text)', fontSize: '12px',
        fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer', opacity: syncing ? 0.6 : 1,
      }}>
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
      {result && (
        <span style={{ fontSize: '12px', color: result.startsWith('Error') ? '#dc2626' : '#16a34a' }}>
          {result}
        </span>
      )}
    </div>
  )
}
