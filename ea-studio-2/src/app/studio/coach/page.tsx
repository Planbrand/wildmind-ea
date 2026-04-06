'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import type { AIMessage } from '@/types/database'
import type { TraceField } from '@/app/api/coach/trace/route'

type MsgWithTrace = AIMessage & { trace?: TraceField[] }

function DnaTracePanel({ trace }: { trace: TraceField[] }) {
  const [open, setOpen] = useState(false)
  const active = trace.filter(f => f.was_applied)
  const skipped = trace.filter(f => !f.was_applied)

  return (
    <div style={{ marginTop: '6px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700 }}>DNA FLOW</span>
        <span style={{ fontSize: '10px', color: 'var(--dim)', flex: 1 }}>
          {active.length} field{active.length !== 1 ? 's' : ''} applied
          {skipped.length > 0 ? `, ${skipped.length} skipped (ghost)` : ''}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--dim)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {trace.map(f => (
            <div key={f.field_id} style={{
              display: 'flex', gap: '10px', alignItems: 'flex-start',
              opacity: f.was_ghost ? 0.4 : 1,
            }}>
              <div style={{
                flexShrink: 0,
                width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                background: f.was_ghost ? 'var(--dim)' : 'var(--accent)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: f.was_ghost ? 'var(--dim)' : 'var(--text)', textDecoration: f.was_ghost ? 'line-through' : 'none' }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: '9px', color: 'var(--dim)' }}>{f.field_id}</span>
                  {f.was_ghost && <span style={{ fontSize: '9px', color: 'var(--dim)', background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px' }}>ghost — skipped</span>}
                </div>
                {!f.was_ghost && f.ea_instruction && (
                  <div style={{ fontSize: '11px', color: 'var(--accent)', fontStyle: 'italic', marginBottom: '2px' }}>
                    ↳ {f.ea_instruction}
                  </div>
                )}
                {!f.was_ghost && (
                  <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {f.body ? (f.body.length > 120 ? f.body.slice(0, 120) + '…' : f.body) : <em>empty</em>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CoachPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<MsgWithTrace[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showTrace, setShowTrace] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ai_messages').select('*').eq('owner_id', user.id).order('created_at').limit(50)
    setMessages(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const tempUser: MsgWithTrace = { id: crypto.randomUUID(), owner_id: '', brand_id: null, role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUser])

    try {
      const endpoint = showTrace ? '/api/coach/trace' : '/api/coach'
      const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: text }) })
      const data = await res.json()
      const tempAI: MsgWithTrace = {
        id: crypto.randomUUID(), owner_id: '', brand_id: null,
        role: 'assistant', content: data.content || 'No response',
        created_at: new Date().toISOString(),
        trace: data.trace,
      }
      setMessages(prev => [...prev, tempAI])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), owner_id: '', brand_id: null, role: 'assistant', content: 'Something went wrong. Please try again.', created_at: new Date().toISOString() }])
    }
    setSending(false)
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <PanelHeader title="Ask EA" subtitle="Your personal AI coach — powered by your full life context"
        action={
          <button
            onClick={() => setShowTrace(s => !s)}
            style={{
              padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
              border: `1px solid ${showTrace ? 'var(--accent)' : 'var(--border)'}`,
              background: showTrace ? 'var(--accent-soft)' : 'transparent',
              color: showTrace ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer',
            }}
          >
            DNA Flow {showTrace ? 'on' : 'off'}
          </button>
        }
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {loading ? <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>Loading…</div>
          : messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✦</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Good to have you back.</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: 400, lineHeight: 1.7 }}>
                I know your goals, patterns, and what you're working on. Ask me anything — or tell me what's on your mind.
              </div>
            </div>
          ) : messages.map(msg => {
            const isAI = msg.role === 'assistant'
            return (
              <div key={msg.id} style={{ display: 'flex', gap: '10px', justifyContent: isAI ? 'flex-start' : 'flex-end' }}>
                {isAI && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>✦</div>}
                <div style={{ maxWidth: 560 }}>
                  <div style={{
                    padding: '12px 16px', fontSize: '13px', lineHeight: 1.75, color: 'var(--text)',
                    background: isAI ? 'var(--surface)' : 'rgba(5,150,105,.08)',
                    border: `1px solid ${isAI ? 'var(--border)' : 'rgba(5,150,105,.18)'}`,
                    borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px',
                    whiteSpace: 'pre-wrap',
                  }}>
                    {msg.content}
                  </div>
                  {isAI && msg.trace && msg.trace.length > 0 && (
                    <DnaTracePanel trace={msg.trace} />
                  )}
                  <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '4px', textAlign: isAI ? 'left' : 'right' }}>{formatTime(msg.created_at)}</div>
                </div>
                {!isAI && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, color: 'var(--text)' }}>S</div>}
              </div>
            )
          })}
        {sending && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</div>
            <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 12px 12px 12px', fontSize: '13px', color: 'var(--dim)' }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '10px', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '10px 14px' }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask EA anything… (Enter to send, Shift+Enter for new line)"
            rows={1} disabled={sending}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text)', resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            style={{ padding: '6px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
