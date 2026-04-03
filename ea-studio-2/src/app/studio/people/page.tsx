'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import type { PersonalContact } from '@/types/database'

const REL_COLOR: Record<string,string> = { partner:'#8B5CF6', family:'#3B82F6', close_friend:'#059669', mentor:'#F59E0B', network:'#6B6B7A' }
const QUAL_COLOR: Record<string,string> = { strong:'#059669', good:'#3B82F6', drifting:'#F59E0B', needs_attention:'#DC2626' }
const BLANK = { name:'', email:'', phone:'', relationship_type:'network', relationship_quality:'good', next_action:'', notes:'' }

export default function PeoplePage() {
  const supabase = createClient()
  const [people, setPeople] = useState<PersonalContact[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<PersonalContact> | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('personal_contacts').select('*').eq('owner_id', user.id).order('relationship_type').order('name')
    setPeople(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function save() {
    if (!modal?.name?.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (modal.id) {
      const { data } = await supabase.from('personal_contacts').update(modal).eq('id', modal.id).select().single()
      if (data) setPeople(prev => prev.map(p => p.id === data.id ? data : p))
    } else {
      const { data } = await supabase.from('personal_contacts').insert({ ...modal, owner_id: user.id }).select().single()
      if (data) setPeople(prev => [...prev, data])
    }
    setSaving(false); setModal(null)
  }

  async function remove() {
    if (!modal?.id) return
    await supabase.from('personal_contacts').delete().eq('id', modal.id)
    setPeople(prev => prev.filter(p => p.id !== modal.id)); setModal(null)
  }

  const badge = (label: string, color: string) => (
    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: color+'18', color, fontWeight:600 }}>{label.replace('_',' ')}</span>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="People"
        subtitle="Your personal relationships — EA keeps notes on each"
        action={<button onClick={() => setModal(BLANK)} style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ Add person</button>}
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {loading ? <div style={{ fontSize:'13px', color:'var(--muted)', padding:'20px' }}>Loading…</div>
        : people.length === 0 ? <EmptyState icon="◉" label="No personal contacts yet" hint="Add the people who matter most — EA will help you stay connected." />
        : (
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 2fr auto', padding:'8px 16px', borderBottom:'1px solid var(--border)', fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)' }}>
              <span>Name</span><span>Relationship</span><span>Quality</span><span>Last contact</span><span>EA note</span><span />
            </div>
            {people.map(p => (
              <div key={p.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1.2fr 1fr 2fr auto', padding:'10px 16px', borderBottom:'1px solid var(--border)', alignItems:'center', gap:'8px' }}>
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>{p.name}</div>
                  {p.email && <div style={{ fontSize:'11px', color:'var(--muted)' }}>{p.email}</div>}
                </div>
                <div>{badge(p.relationship_type, REL_COLOR[p.relationship_type] || '#6B6B7A')}</div>
                <div>{badge(p.relationship_quality, QUAL_COLOR[p.relationship_quality] || '#6B6B7A')}</div>
                <div style={{ fontSize:'11px', color:'var(--muted)' }}>{p.last_contact_date || '—'}</div>
                <div style={{ fontSize:'11px', color:'var(--dim)', fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.ea_note || p.next_action || '—'}</div>
                <button onClick={() => setModal(p)} style={{ padding:'4px 10px', fontSize:'11px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'6px', cursor:'pointer', color:'var(--muted)' }}>Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal !== null && (
        <div onClick={e => e.target === e.currentTarget && setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'14px', padding:'28px', width:'100%', maxWidth:'460px', boxShadow:'0 8px 40px rgba(0,0,0,.12)' }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'var(--text)', marginBottom:'20px' }}>{modal.id ? 'Edit person' : 'Add person'}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {[['Name *','name','text'],['Email','email','email'],['Phone','phone','tel']].map(([l,k,t]) => (
                <div key={k}>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>{l}</div>
                  <input type={t} value={(modal as any)[k] || ''} onChange={e => setModal(m => ({...m, [k]: e.target.value}))}
                    style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
                </div>
              ))}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Relationship</div>
                  <select value={modal.relationship_type||'network'} onChange={e => setModal(m => ({...m, relationship_type: e.target.value}))}
                    style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }}>
                    {['partner','family','close_friend','mentor','network'].map(r => <option key={r} value={r}>{r.replace('_',' ')}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Quality</div>
                  <select value={modal.relationship_quality||'good'} onChange={e => setModal(m => ({...m, relationship_quality: e.target.value}))}
                    style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }}>
                    {['strong','good','drifting','needs_attention'].map(q => <option key={q} value={q}>{q.replace('_',' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Next action</div>
                <input value={modal.next_action||''} onChange={e => setModal(m => ({...m, next_action: e.target.value}))} placeholder="e.g. Call this week"
                  style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Notes</div>
                <textarea value={modal.notes||''} onChange={e => setModal(m => ({...m, notes: e.target.value}))} rows={2}
                  style={{ width:'100%', padding:'9px 11px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none', resize:'vertical' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'16px' }}>
              {modal.id && <button onClick={remove} style={{ padding:'8px 14px', border:'1px solid rgba(220,38,38,.25)', borderRadius:'7px', background:'transparent', color:'var(--danger)', fontSize:'12px', cursor:'pointer', marginRight:'auto' }}>Delete</button>}
              <button onClick={() => setModal(null)} style={{ padding:'8px 16px', border:'1px solid var(--border)', borderRadius:'7px', background:'var(--bg)', color:'var(--muted)', fontSize:'12px', cursor:'pointer' }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding:'8px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
