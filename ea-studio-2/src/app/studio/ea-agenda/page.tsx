'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import type { EAAgenda, EAFlag, EARule } from '@/types/database'

const ENTRY_TYPES = ['note','plan','observation','concern','win','pattern','reminder']
const LIFE_AREAS = ['health','mind','relationships','finance','brands','purpose','fun','general']
const TYPE_COLOR: Record<string,string> = { note:'#3B82F6', plan:'#059669', observation:'#8B5CF6', concern:'#DC2626', win:'#059669', pattern:'#F59E0B', reminder:'#6366F1' }
const BLANK_ENTRY: Partial<EAAgenda> = { entry_type:'note', life_area:'general', title:'', body:'', is_pinned:false, priority:2 }

export default function EAAgendaPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<EAAgenda[]>([])
  const [flags, setFlags] = useState<EAFlag[]>([])
  const [rules, setRules] = useState<EARule[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Partial<EAAgenda> | null>(null)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState('')
  const [newRuleCat, setNewRuleCat] = useState('focus')
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: a }, { data: f }, { data: r }] = await Promise.all([
      supabase.from('ea_agenda').select('*').eq('owner_id', user.id).order('is_pinned', { ascending: false }).order('priority').order('created_at', { ascending: false }),
      supabase.from('ea_flags').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('ea_rules').select('*').eq('owner_id', user.id).order('priority'),
    ])
    setEntries(a || []); setFlags(f || []); setRules(r || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = entries.filter(e => {
    if (filter === 'all') return true
    if (filter === 'pinned') return e.is_pinned
    if (ENTRY_TYPES.includes(filter)) return e.entry_type === filter
    if (LIFE_AREAS.includes(filter)) return e.life_area === filter
    return true
  })

  async function saveEntry() {
    if (!selected?.title?.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    if (selected.id) {
      const { data } = await supabase.from('ea_agenda').update({ ...selected, is_user_edited: true }).eq('id', selected.id).select().single()
      if (data) { setEntries(prev => prev.map(e => e.id === data.id ? data : e)); setSelected(data) }
    } else {
      const { data } = await supabase.from('ea_agenda').insert({ ...selected, owner_id: user.id }).select().single()
      if (data) { setEntries(prev => [data, ...prev]); setSelected(data) }
    }
    setSaving(false)
  }

  async function deleteEntry() {
    if (!selected?.id) return
    await supabase.from('ea_agenda').delete().eq('id', selected.id)
    setEntries(prev => prev.filter(e => e.id !== selected.id)); setSelected(null)
  }

  async function toggleFlag(id: string, active: boolean) {
    await supabase.from('ea_flags').update({ is_active: active }).eq('id', id)
    setFlags(prev => prev.map(f => f.id === id ? { ...f, is_active: active } : f))
  }

  async function addRule() {
    if (!newRule.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ea_rules').insert({ owner_id: user.id, rule: newRule, category: newRuleCat, priority: rules.length + 1 }).select().single()
    if (data) { setRules(prev => [...prev, data]); setNewRule('') }
  }

  async function toggleRule(id: string, active: boolean) {
    await supabase.from('ea_rules').update({ is_active: active }).eq('id', id)
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: active } : r))
  }

  const sidebarItem = (key: string, label: string, count?: number) => (
    <div key={key} onClick={() => setFilter(key)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight: filter === key ? 600 : 400, color: filter === key ? 'var(--accent)' : 'var(--muted)', background: filter === key ? 'var(--accent-soft)' : 'transparent' }}>
      <span>{label}</span>
      {count !== undefined && <span style={{ fontSize:'10px', color:'var(--dim)', background:'var(--surface-2)', padding:'1px 6px', borderRadius:'10px' }}>{count}</span>}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="EA Agenda"
        subtitle="EA's living notebook — everything it knows and plans about you"
        action={<button onClick={() => setSelected({...BLANK_ENTRY})} style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ New entry</button>}
      />
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

        {/* Filter sidebar */}
        <div style={{ width:200, borderRight:'1px solid var(--border)', padding:'12px 8px', overflowY:'auto', flexShrink:0 }}>
          <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--dim)', padding:'0 10px 6px' }}>View</div>
          {sidebarItem('all', 'All entries', entries.length)}
          {sidebarItem('pinned', 'Pinned', entries.filter(e => e.is_pinned).length)}
          <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--dim)', padding:'12px 10px 6px' }}>By type</div>
          {ENTRY_TYPES.map(t => sidebarItem(t, t.charAt(0).toUpperCase()+t.slice(1), entries.filter(e => e.entry_type === t).length))}
          <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--dim)', padding:'12px 10px 6px' }}>By life area</div>
          {LIFE_AREAS.map(a => sidebarItem(a, a.charAt(0).toUpperCase()+a.slice(1), entries.filter(e => e.life_area === a).length))}
          <div style={{ height:'1px', background:'var(--border)', margin:'10px 0' }} />
          {sidebarItem('flags', `Flags (${flags.length})`)}
          {sidebarItem('rules', `Rules (${rules.length})`)}
        </div>

        {/* Main list */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
          {loading ? <div style={{ fontSize:'13px', color:'var(--muted)', padding:'20px' }}>Loading…</div>
          : filter === 'flags' ? (
            <>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', marginBottom:'12px' }}>Active flags</div>
              {flags.length === 0 ? <EmptyState label="No flags yet" hint="EA flags patterns it notices — red for concerns, green for strengths." />
              : flags.map(f => (
                <div key={f.id} style={{ display:'flex', gap:'10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'8px', padding:'12px', marginBottom:'8px', alignItems:'flex-start' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: f.type === 'red' ? 'var(--danger)' : 'var(--accent)', flexShrink:0, marginTop:3 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'3px' }}>{f.title}</div>
                    {f.body && <div style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5 }}>{f.body}</div>}
                    <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'5px', textTransform:'uppercase', letterSpacing:'.04em' }}>{f.source} · {f.life_area || 'general'}</div>
                  </div>
                  <button onClick={() => toggleFlag(f.id, !f.is_active)} style={{ padding:'3px 8px', fontSize:'10px', borderRadius:'6px', border:'1px solid var(--border)', background: f.is_active ? 'var(--accent-soft)' : 'var(--surface-2)', color: f.is_active ? 'var(--accent)' : 'var(--dim)', cursor:'pointer', flexShrink:0 }}>
                    {f.is_active ? 'Active' : 'Muted'}
                  </button>
                </div>
              ))}
            </>
          ) : filter === 'rules' ? (
            <>
              <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', marginBottom:'12px' }}>EA rules — how EA behaves with you</div>
              {rules.map(r => (
                <div key={r.id} style={{ display:'flex', gap:'10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'8px', padding:'12px', marginBottom:'8px', alignItems:'center' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'13px', color:'var(--text)' }}>{r.rule}</div>
                    <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.04em' }}>{r.category}</div>
                  </div>
                  <button onClick={() => toggleRule(r.id, !r.is_active)} style={{ padding:'3px 8px', fontSize:'10px', borderRadius:'6px', border:'1px solid var(--border)', background: r.is_active ? 'var(--accent-soft)' : 'var(--surface-2)', color: r.is_active ? 'var(--accent)' : 'var(--dim)', cursor:'pointer', flexShrink:0 }}>
                    {r.is_active ? 'Active' : 'Off'}
                  </button>
                </div>
              ))}
              <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                <input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="Add a new rule for EA…" onKeyDown={e => e.key === 'Enter' && addRule()}
                  style={{ flex:1, padding:'8px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
                <select value={newRuleCat} onChange={e => setNewRuleCat(e.target.value)} style={{ padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'12px', color:'var(--text)', outline:'none' }}>
                  {['focus','tone','escalation','boundaries','format'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={addRule} style={{ padding:'8px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Add</button>
              </div>
            </>
          ) : filtered.length === 0 ? (
            <EmptyState icon="✦" label="No entries" hint="EA will write here as it learns about you. You can also add entries yourself." />
          ) : filtered.map(e => (
            <div key={e.id} onClick={() => setSelected(e)} style={{ background:'var(--bg)', border:`1px solid ${selected?.id === e.id ? 'rgba(5,150,105,.4)' : 'var(--border)'}`, borderRadius:'8px', padding:'12px 14px', marginBottom:'8px', cursor:'pointer' }}>
              <div style={{ display:'flex', gap:'8px', alignItems:'flex-start', marginBottom:'4px' }}>
                {e.is_pinned && <span style={{ fontSize:'12px', color:'var(--accent)' }}>📌</span>}
                <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'10px', background: (TYPE_COLOR[e.entry_type]||'#6B6B7A')+'18', color: TYPE_COLOR[e.entry_type]||'#6B6B7A', fontWeight:600 }}>{e.entry_type}</span>
                {e.life_area && <span style={{ fontSize:'10px', color:'var(--dim)' }}>{e.life_area}</span>}
                {e.is_user_edited && <span style={{ fontSize:'10px', color:'var(--dim)', fontStyle:'italic' }}>edited by you</span>}
                <span style={{ marginLeft:'auto', fontSize:'10px', color:'var(--dim)' }}>{new Date(e.created_at).toLocaleDateString('en-GB')}</span>
              </div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)', marginBottom:'3px' }}>{e.title}</div>
              {e.body && <div style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{e.body}</div>}
            </div>
          ))}
        </div>

        {/* Right: edit panel */}
        {selected !== null && (
          <div style={{ width:340, borderLeft:'1px solid var(--border)', padding:'16px', overflowY:'auto', flexShrink:0 }}>
            <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', marginBottom:'14px' }}>{selected.id ? 'Edit entry' : 'New entry'}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div>
                <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Title *</div>
                <input value={selected.title||''} onChange={e => setSelected(s => s ? {...s, title: e.target.value} : s)}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Body</div>
                <textarea value={selected.body||''} onChange={e => setSelected(s => s ? {...s, body: e.target.value} : s)} rows={6}
                  style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none', resize:'vertical', lineHeight:1.6 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Type</div>
                  <select value={selected.entry_type||'note'} onChange={e => setSelected(s => s ? {...s, entry_type: e.target.value} : s)}
                    style={{ width:'100%', padding:'7px 9px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'12px', color:'var(--text)', outline:'none' }}>
                    {ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Life area</div>
                  <select value={selected.life_area||'general'} onChange={e => setSelected(s => s ? {...s, life_area: e.target.value} : s)}
                    style={{ width:'100%', padding:'7px 9px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'12px', color:'var(--text)', outline:'none' }}>
                    {LIFE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Priority</div>
                  <select value={selected.priority||2} onChange={e => setSelected(s => s ? {...s, priority: Number(e.target.value)} : s)}
                    style={{ width:'100%', padding:'7px 9px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'12px', color:'var(--text)', outline:'none' }}>
                    <option value={1}>High</option><option value={2}>Normal</option><option value={3}>Low</option>
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', paddingBottom:'2px' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--muted)', cursor:'pointer' }}>
                    <input type="checkbox" checked={!!selected.is_pinned} onChange={e => setSelected(s => s ? {...s, is_pinned: e.target.checked} : s)} />
                    Pin entry
                  </label>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', marginTop:'16px' }}>
              {selected.id && <button onClick={deleteEntry} style={{ padding:'7px 12px', border:'1px solid rgba(220,38,38,.25)', borderRadius:'7px', background:'transparent', color:'var(--danger)', fontSize:'11px', cursor:'pointer', marginRight:'auto' }}>Delete</button>}
              <button onClick={() => setSelected(null)} style={{ padding:'7px 14px', border:'1px solid var(--border)', borderRadius:'7px', background:'var(--bg)', color:'var(--muted)', fontSize:'12px', cursor:'pointer' }}>Close</button>
              <button onClick={saveEntry} disabled={saving} style={{ padding:'7px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
