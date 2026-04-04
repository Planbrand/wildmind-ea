import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const CAT_LABELS: Record<string, string> = {
  person: 'Person', lead: 'Lead', promotion: 'Promo', automated: 'Auto', other: 'Other',
}
const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  person:    { bg: '#eff6ff', text: '#3b82f6' },
  lead:      { bg: '#f0fdf4', text: '#16a34a' },
  promotion: { bg: '#fef9c3', text: '#ca8a04' },
  automated: { bg: '#f3f4f6', text: '#6b7280' },
  other:     { bg: '#f3f4f6', text: '#6b7280' },
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const supabase = await createClient()

  const { data: thread } = await supabase
    .from('email_threads')
    .select('*, brands(name, color, slug)')
    .eq('id', threadId)
    .single()

  if (!thread) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: '13px' }}>
        Thread not found. <Link href="/studio/inbox" style={{ marginLeft: 8, color: 'var(--accent)' }}>Back to inbox</Link>
      </div>
    )
  }

  const date = new Date(thread.received_at)
  const brand = thread.brands as { name: string; color: string; slug: string } | null
  const cat = thread.category || 'other'
  const catStyle = CAT_COLORS[cat] || CAT_COLORS.other

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <Link href="/studio/inbox" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
          ← Inbox
        </Link>
        <span style={{ color: 'var(--border)', fontSize: '13px' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
          {thread.subject}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: catStyle.bg, color: catStyle.text }}>
            {CAT_LABELS[cat]}
          </span>
          {brand && (
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: brand.color + '22', color: brand.color }}>
              {brand.name}
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', lineHeight: 1.3 }}>
          {thread.subject}
        </h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--dim)' }}>From </span>
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              {thread.from_name || thread.from_email}
            </span>
            {thread.from_name && (
              <span style={{ color: 'var(--dim)' }}> &lt;{thread.from_email}&gt;</span>
            )}
          </div>
          <div>
            <span style={{ color: 'var(--dim)' }}>To </span>
            <span style={{ color: 'var(--text)' }}>{thread.inbox}</span>
          </div>
          <div style={{ color: 'var(--dim)' }}>
            {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            {' at '}
            {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px 28px',
          }}>
            <p style={{
              fontSize: '14px', color: 'var(--text)', lineHeight: 1.8,
              whiteSpace: 'pre-wrap', margin: 0,
            }}>
              {thread.body || thread.snippet || '(No preview available)'}
            </p>
          </div>

          {thread.has_draft && thread.draft_body && (
            <div style={{ marginTop: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
                AI Draft Reply
              </div>
              <div style={{
                background: '#f0fdf4', border: '1px solid #bbf7d0',
                borderRadius: '12px', padding: '20px 24px',
              }}>
                <p style={{
                  fontSize: '14px', color: 'var(--text)', lineHeight: 1.8,
                  whiteSpace: 'pre-wrap', margin: 0,
                }}>
                  {thread.draft_body}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        padding: '16px 32px', borderTop: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 720 }}>
          <textarea
            readOnly
            placeholder={`Reply to ${thread.from_name || thread.from_email} from ${thread.inbox}…`}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '8px',
              border: '1px solid var(--border)', fontSize: '13px',
              color: 'var(--text)', background: 'var(--bg)',
              resize: 'vertical', minHeight: '80px', fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--dim)' }}>
              Sending from: <strong style={{ color: 'var(--muted)' }}>{thread.inbox}</strong>
            </span>
            <button disabled style={{
              padding: '8px 20px', borderRadius: '8px',
              background: 'var(--accent)', color: '#fff',
              border: 'none', fontSize: '13px', fontWeight: 600,
              cursor: 'not-allowed', opacity: 0.5,
            }}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
