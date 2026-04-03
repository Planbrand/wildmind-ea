'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import type { EADNA } from '@/types/database'

const LAYERS: Record<string,string> = { L1:'Identity & Behaviour', L2:'Active State', L3:'Response Protocol' }
const BLANK = { layer:'L1', field_id:'', label:'', body:'', locked:false, status:'active', sort_order:0 }

export default function EADNAPage() {
  const supabase = createClient()
  const [fields, setFields] = useState<EADNA[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newField, setNewField] = useState({ ...BLANK })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('ea_dna').select('*').eq('owner_id', user.id).order('layer').order('sort_order')
    setFields(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveEdit(field: EADNA) {
    setSaving(true)
    const { data } = await supabase.from('ea_dna').update({ body: editBody }).eq('id', field.id).select().single()
    if (data) setFields(prev => prev.map(f => f.id === data.id ? data : f))
    setEditId(null); setSaving(false)
  }

  async function toggleStatus(field: EADNA) {
    const newStatus = field.status === 'active' ? 'paused' : 'active'
    const { data } = await supabase.from('ea_dna').update({ status: newStatus }).eq('id', field.id).select().single()
    if (data) setFields(prev => prev.map(f => f.id === data.id ? data : f))
  }

  async function addField() {
    if (!newField.field_id.trim() || !newField.label.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data } = await supabase.from('ea_dna').insert({ ...newField, owner_id: user.id }).select().single()
    if (data) { setFields(prev => [...prev, data]); setNewField({ ...BLANK }); setShowAdd(false) }
    setSaving(false)
  }

  const grouped = Object.keys(LAYERS).reduce((acc, layer) => {
    acc[layer] = fields.filter(f => f.layer === layer)
    return acc
  }, {} as Record<string, EADNA[]>)

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="DNA Fields"
        subtitle="EA's structured understanding of who you are and how to work with you"
        action={<button onClick={() => setShowAdd(s => !s)} style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ Add field</button>}
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {loading ? <div style={{ fontSize:'13px', color:'var(--muted)', padding:'20px' }}>Loading…</div>
        : fields.length === 0 && !showAdd ? (
          <EmptyState icon="⬡" label="No DNA fields yet" hint="EA builds these as it learns about you. You can also add them manually." action={
            <button onClick={() => setShowAdd(true)} style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>Add first field</button>
          } />
        ) : (
          <>
            {showAdd && (
              <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' }}>
                <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', marginBottom:'12px' }}>Add DNA field</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'10px' }}>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Layer</div>
                    <select value={newField.layer} onChange={e => setNewField(f => ({...f, layer: e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }}>
                      {Object.entries(LAYERS).map(([k,v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Field ID *</div>
                    <input value={newField.field_id} onChange={e => setNewField(f => ({...f, field_id: e.target.value}))} placeholder="L1-F1" style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Label *</div>
                    <input value={newField.label} onChange={e => setNewField(f => ({...f, label: e.target.value}))} placeholder="Focus Lock" style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom:'10px' }}>
                  <div style={{ fontSize:'10px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'5px' }}>Content</div>
                  <textarea value={newField.body} onChange={e => setNewField(f => ({...f, body: e.target.value}))} rows={3} style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none', resize:'vertical' }} />
                </div>
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding:'7px 14px', border:'1px solid var(--border)', borderRadius:'7px', background:'var(--bg)', color:'var(--muted)', fontSize:'12px', cursor:'pointer' }}>Cancel</button>
                  <button onClick={addField} disabled={saving} style={{ padding:'7px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Save field</button>
                </div>
              </div>
            )}

            {Object.entries(LAYERS).map(([layer, layerLabel]) => {
              const layerFields = grouped[layer] || []
              if (layerFields.length === 0) return null
              return (
                <div key={layer} style={{ marginBottom:'20px' }}>
                  <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', marginBottom:'10px' }}>
                    {layer} — {layerLabel}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {layerFields.map(f => (
                      <div key={f.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'14px 16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                          <span style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', background:'var(--surface-2)', padding:'2px 7px', borderRadius:'6px' }}>{f.field_id}</span>
                          <span style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', flex:1 }}>{f.label}</span>
                          {f.locked && <span style={{ fontSize:'10px', padding:'2px 7px', borderRadius:'6px', background:'rgba(220,38,38,.08)', color:'var(--danger)', fontWeight:600 }}>Locked</span>}
                          <button onClick={() => toggleStatus(f)} style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'6px', border:'1px solid var(--border)', background: f.status === 'active' ? 'var(--accent-soft)' : 'var(--surface-2)', color: f.status === 'active' ? 'var(--accent)' : 'var(--dim)', cursor:'pointer' }}>
                            {f.status === 'active' ? 'Active' : 'Paused'}
                          </button>
                        </div>
                        {editId === f.id ? (
                          <>
                            <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} style={{ width:'100%', padding:'8px 10px', border:'1px solid rgba(5,150,105,.3)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none', resize:'vertical', lineHeight:1.6, marginBottom:'8px' }} />
                            <div style={{ display:'flex', gap:'8px' }}>
                              <button onClick={() => setEditId(null)} style={{ padding:'6px 12px', border:'1px solid var(--border)', borderRadius:'6px', background:'var(--bg)', color:'var(--muted)', fontSize:'11px', cursor:'pointer' }}>Cancel</button>
                              <button onClick={() => saveEdit(f)} disabled={saving} style={{ padding:'6px 12px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'6px', fontSize:'11px', fontWeight:600, cursor:'pointer' }}>Save</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize:'13px', color: f.body ? 'var(--text)' : 'var(--dim)', lineHeight:1.7, fontStyle: f.body ? 'normal' : 'italic', marginBottom: f.locked ? 0 : '8px' }}>
                              {f.body || 'No content yet — EA will fill this in.'}
                            </div>
                            {!f.locked && (
                              <button onClick={() => { setEditId(f.id); setEditBody(f.body || '') }} style={{ fontSize:'11px', padding:'4px 10px', border:'1px solid var(--border)', borderRadius:'6px', background:'var(--surface)', color:'var(--muted)', cursor:'pointer' }}>Edit</button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
