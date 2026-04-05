'use client'
import { useState } from 'react'
import { syncBankTransactions } from './actions'

type Props = {
  connected: boolean
  accountName: string | null
  lastSynced: string | null
  authUrl: string
}

export function BankSync({ connected, accountName, lastSynced, authUrl }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)

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
      <a href={authUrl} style={{
        padding: '8px 16px', borderRadius: '8px',
        background: '#2563eb', color: '#fff', fontSize: '13px',
        fontWeight: 600, textDecoration: 'none', display: 'inline-block',
      }}>
        Connect Santander
      </a>
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
