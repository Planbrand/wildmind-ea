'use client'
import { useState } from 'react'
import { recategoriseAllThreads } from './actions'

export function RecategoriseButton() {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  async function run() {
    setRunning(true)
    setDone(null)
    try {
      const count = await recategoriseAllThreads()
      setDone(count)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {done !== null && (
        <span style={{ fontSize: '11px', color: 'var(--accent)' }}>
          ✓ {done} threads recategorised
        </span>
      )}
      <button onClick={run} disabled={running} style={{
        padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
        border: '1px solid var(--border)', background: 'transparent',
        color: 'var(--muted)', cursor: running ? 'not-allowed' : 'pointer',
        opacity: running ? 0.6 : 1,
      }}>
        {running ? 'Recategorising…' : 'Fix categories'}
      </button>
    </div>
  )
}
