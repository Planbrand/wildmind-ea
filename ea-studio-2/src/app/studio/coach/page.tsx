'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import type { AIMessage } from '@/types/database'

export default function CoachPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ai_messages').select('*').eq('owner_id', user.id).order('created_at').limit(50)
    setMessages(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const tempUser: AIMessage = { id: crypto.randomUUID(), owner_id:'', brand_id:null, role:'user', content: text, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, tempUser])

    try {
      const res = await fetch('/api/coach', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ content: text }) })
      const data = await res.json()
      const tempAI: AIMessage = { id: crypto.randomUUID(), owner_id:'', brand_id:null, role:'assistant', content: data.content || 'No response', created_at: new Date().toISOString() }
      setMessages(prev => [...prev, tempAI])
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), owner_id:'', brand_id:null, role:'assistant', content:'Something went wrong. Please try again.', created_at: new Date().toISOString() }])
    }
    setSending(false)
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="Ask EA" subtitle="Your personal AI coach — powered by your full life context" />
      <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:'14px' }}>
        {loading ? <div style={{ fontSize:'13px', color:'var(--muted)', textAlign:'center', padding:'20px' }}>Loading…</div>
        : messages.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:'12px', textAlign:'center' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'22px', display:'flex', alignItems:'center', justifyContent:'center' }}>✦</div>
            <div style={{ fontSize:'15px', fontWeight:700, color:'var(--text)' }}>Good to have you back.</div>
            <div style={{ fontSize:'13px', color:'var(--muted)', maxWidth:400, lineHeight:1.7 }}>
              I know your goals, patterns, and what you're working on. Ask me anything — or tell me what's on your mind.
            </div>
          </div>
        ) : messages.map(msg => {
          const isAI = msg.role === 'assistant'
          return (
            <div key={msg.id} style={{ display:'flex', gap:'10px', justifyContent: isAI ? 'flex-start' : 'flex-end' }}>
              {isAI && <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>✦</div>}
              <div style={{ maxWidth:560 }}>
                <div style={{
                  padding:'12px 16px', fontSize:'13px', lineHeight:1.75, color:'var(--text)',
                  background: isAI ? 'var(--surface)' : 'rgba(5,150,105,.08)',
                  border: `1px solid ${isAI ? 'var(--border)' : 'rgba(5,150,105,.18)'}`,
                  borderRadius: isAI ? '0 12px 12px 12px' : '12px 0 12px 12px',
                  whiteSpace:'pre-wrap'
                }}>
                  {msg.content}
                </div>
                <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'4px', textAlign: isAI ? 'left' : 'right' }}>{formatTime(msg.created_at)}</div>
              </div>
              {!isAI && <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--surface-2)', border:'1px solid var(--border)', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2, color:'var(--text)' }}>S</div>}
            </div>
          )
        })}
        {sending && (
          <div style={{ display:'flex', gap:'10px' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'11px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✦</div>
            <div style={{ padding:'12px 16px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'0 12px 12px 12px', fontSize:'13px', color:'var(--dim)' }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:'14px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:'10px', background:'var(--surface)', border:'1px solid var(--border-mid)', borderRadius:'10px', padding:'10px 14px' }}>
          <textarea
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask EA anything… (Enter to send, Shift+Enter for new line)"
            rows={1} disabled={sending}
            style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:'13px', color:'var(--text)', resize:'none', lineHeight:1.5, fontFamily:'inherit' }}
          />
          <button onClick={send} disabled={sending || !input.trim()}
            style={{ padding:'6px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', opacity: sending || !input.trim() ? 0.5 : 1, flexShrink:0 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
