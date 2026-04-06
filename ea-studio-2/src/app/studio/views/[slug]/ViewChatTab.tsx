'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Msg = { id: string; role: string; content: string; created_at: string }

export function ViewChatTab({ viewId, viewName, isStudio }: { viewId: string; viewName: string; isStudio: boolean }) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('ai_messages').select('*').eq('owner_id', user.id).order('created_at').limit(50)
        .then(({ data }) => setMessages(data || []))
    })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const temp: Msg = { id: crypto.randomUUID(), role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, temp])

    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          content: text,
          view_context: { view_id: viewId, view_name: viewName, is_studio: isStudio },
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: data.content || 'No response', created_at: new Date().toISOString() }])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'Something went wrong.', created_at: new Date().toISOString() }])
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 720 }}>
      <div style={{ fontSize: '11px', color: 'var(--dim)', marginBottom: '12px', fontStyle: 'italic' }}>
        {isStudio
          ? 'Studio view — EA has access to all your data, DNA fields, and goals'
          : `Scoped to "${viewName}" — EA only sees data filtered for this view`}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--dim)', fontSize: '13px' }}>
            Ask EA anything about {isStudio ? 'your studio' : viewName}
          </div>
        )}
        {messages.map(msg => {
          const isAI = msg.role === 'assistant'
          return (
            <div key={msg.id} style={{ display: 'flex', gap: '10px', justifyContent: isAI ? 'flex-start' : 'flex-end' }}>
              {isAI && <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>✦</div>}
              <div style={{ maxWidth: 520, padding: '10px 14px', fontSize: '13px', lineHeight: 1.75, color: 'var(--text)', background: isAI ? 'var(--surface)' : 'rgba(5,150,105,.08)', border: `1px solid ${isAI ? 'var(--border)' : 'rgba(5,150,105,.18)'}`, borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          )
        })}
        {sending && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: '#fff', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✦</div>
            <div style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 12px 12px 12px', fontSize: '13px', color: 'var(--dim)' }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 0 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--surface)', border: '1px solid var(--border-mid)', borderRadius: '10px', padding: '8px 12px' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder={`Ask about ${isStudio ? 'everything' : viewName}… (Enter to send)`}
            rows={1} disabled={sending}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--text)', resize: 'none', lineHeight: 1.5, fontFamily: 'inherit' }}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            style={{ padding: '5px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
