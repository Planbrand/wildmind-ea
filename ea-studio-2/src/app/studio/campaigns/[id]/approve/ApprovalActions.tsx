'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveCampaign, requestChanges } from '../../actions'

export function ApprovalActions({ campaignId, previousFeedback }: {
  campaignId: string
  previousFeedback?: string | null
}) {
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function approve() {
    startTransition(async () => {
      await approveCampaign(campaignId)
      router.push('/studio/campaigns')
    })
  }

  function submitChanges() {
    if (!feedback.trim()) return
    startTransition(async () => {
      await requestChanges(campaignId, feedback)
      router.push('/studio/campaigns')
    })
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px' }}>
      {previousFeedback && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>Previous feedback</div>
          <div style={{ fontSize: '12px', color: '#7f1d1d' }}>{previousFeedback}</div>
        </div>
      )}

      {showFeedback ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>What needs to change?</div>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="e.g. The subject line is too aggressive. Make it more curious and less salesy..."
              rows={4}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowFeedback(false)} style={btnGhost}>Cancel</button>
            <button onClick={submitChanges} disabled={isPending || !feedback.trim()} style={btnDanger}>
              {isPending ? 'Sending…' : 'Request changes'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Ready to launch?</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
            Approving will start sending to all leads in the sequence. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowFeedback(true)} style={btnGhost}>Request changes</button>
            <button onClick={approve} disabled={isPending} style={btnApprove}>
              {isPending ? 'Launching…' : '✓ Approve — launch campaign'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const btnApprove: React.CSSProperties = { padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }
const btnDanger: React.CSSProperties = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
