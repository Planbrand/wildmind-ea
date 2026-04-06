'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import type { EADNA } from '@/types/database'

const LAYERS: Record<string, string> = { L1: 'Identity & Behaviour', L2: 'Active State', L3: 'Response Protocol' }
const BLANK = { layer: 'L1', field_id: '', label: '', ea_instruction: '', body: '', locked: false, is_ghost: false, status: 'active', sort_order: 0 }

export default function EADNAPage() {
  const supabase = createClient()
  const [fields, setFields] = useState<EADNA[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ body: '', ea_instruction: '' })
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newField, setNewField] = useState({ ...BLANK })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('ea_dna')
      .select('*')
      .eq('owner_id', user.id)
      .is('brand_id', null)
      .order('layer')
      .order('sort_order')
    setFields(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function saveEdit(field: EADNA) {
    setSaving(true)
    const { data } = await supabase
      .from('ea_dna')
      .update({ body: editData.body, ea_instruction: editData.ea_instruction })
      .eq('id', field.id)
      .select()
      .single()
    if (data) setFields(prev => prev.map(f => f.id === data.id ? data : f))
    setEditId(null)
    setSaving(false)
  }

  async function toggleGhost(field: EADNA) {
    const { data } = await supabase
      .from('ea_dna')
      .update({ is_ghost: !field.is_ghost })
      .eq('id', field.id)
      .select()
      .single()
    if (data) setFields(prev => prev.map(f => f.id === data.id ? data : f))
  }

  async function toggleStatus(field: EADNA) {
    const newStatus = field.status === 'active' ? 'paused' : 'active'
    const { data } = await supabase
      .from('ea_dna')
      .update({ status: newStatus })
      .eq('id', field.id)
      .select()
      .single()
    if (data) setFields(prev => prev.map(f => f.id === data.id ? data : f))
  }

  async function addField() {
    if (!newField.field_id.trim() || !newField.label.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data } = await supabase
      .from('ea_dna')
      .insert({ ...newField, owner_id: user.id })
      .select()
      .single()
    if (data) { setFields(prev => [...prev, data]); setNewField({ ...BLANK }); setShowAdd(false) }
    setSaving(false)
  }

  async function deleteField(id: string) {
    await supabase.from('ea_dna').delete().eq('id', id)
    setFields(prev => prev.filter(f => f.id !== id))
  }

  const grouped = Object.keys(LAYERS).reduce((acc, layer) => {
    acc[layer] = fields.filter(f => f.layer === layer)
    return acc
  }, {} as Record<string, EADNA[]>)

  const activeCount = fields.filter(f => !f.is_ghost && f.status === 'active').length
  const ghostCount = fields.filter(f => f.is_ghost).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <PanelHeader
        title="DNA Fields"
        subtitle={`${activeCount} active · ${ghostCount} ghost · EA reads these in order`}
        action={
          <button onClick={() => setShowAdd(s => !s)} style={{
            padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
            background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
          }}>+ Add field</button>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {loading ? (
          <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '20px' }}>Loading…</div>
        ) : fields.length === 0 && !showAdd ? (
          <EmptyState icon="⬡" label="No DNA fields yet" hint="EA reads these in order to understand how to work with you." action={
            <button onClick={() => setShowAdd(true)} style={{ padding: '7px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Add first field</button>
          } />
        ) : (
          <>
            {/* Add form */}
            {showAdd && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>New DNA field</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <div style={labelSt}>Layer</div>
                    <select value={newField.layer} onChange={e => setNewField(f => ({ ...f, layer: e.target.value }))} style={inputSt}>
                      {Object.entries(LAYERS).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={labelSt}>Field ID *</div>
                    <input value={newField.field_id} onChange={e => setNewField(f => ({ ...f, field_id: e.target.value }))} placeholder="L1-F1" style={inputSt} />
                  </div>
                  <div>
                    <div style={labelSt}>Field name *</div>
                    <input value={newField.label} onChange={e => setNewField(f => ({ ...f, label: e.target.value }))} placeholder="Focus Lock" style={inputSt} />
                  </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <div style={labelSt}>EA instruction <span style={{ fontWeight: 400, fontStyle: 'italic' }}>(how EA reads this field)</span></div>
                  <textarea value={newField.ea_instruction} onChange={e => setNewField(f => ({ ...f, ea_instruction: e.target.value }))} rows={2}
                    placeholder="e.g. Extract the user's primary focus. Use this to filter out anything not directly serving this goal."
                    style={{ ...inputSt, resize: 'vertical', fontStyle: 'italic', color: 'var(--muted)' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={labelSt}>Content</div>
                  <textarea value={newField.body} onChange={e => setNewField(f => ({ ...f, body: e.target.value }))} rows={3} style={{ ...inputSt, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: '7px', background: 'var(--bg)', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={addField} disabled={saving} style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Save field</button>
                </div>
              </div>
            )}

            {/* Fields by layer */}
            {Object.entries(LAYERS).map(([layer, layerLabel]) => {
              const layerFields = grouped[layer] || []
              if (layerFields.length === 0) return null
              return (
                <div key={layer} style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '10px' }}>
                    {layer} — {layerLabel}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px', alignItems: 'start' }}>
                    {layerFields.map((f, idx) => (
                      <div key={f.id} style={{
                        background: f.is_ghost ? 'var(--surface-2)' : 'var(--bg)',
                        border: `1px solid ${f.is_ghost ? 'var(--border)' : 'var(--border)'}`,
                        borderRadius: '10px', padding: '14px 16px',
                        opacity: f.is_ghost ? 0.5 : 1,
                        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
                        position: 'relative',
                      }}>
                        {/* Field number + controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '5px', flexShrink: 0 }}>
                            #{idx + 1}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: '6px' }}>{f.field_id}</span>
                          <span style={{
                            fontSize: '14px', fontWeight: 700, color: f.is_ghost ? 'var(--dim)' : 'var(--text)', flex: 1,
                            textDecoration: f.is_ghost ? 'line-through' : 'none',
                          }}>{f.label}</span>
                          {f.locked && <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '6px', background: 'rgba(220,38,38,.08)', color: 'var(--danger)', fontWeight: 600 }}>Locked</span>}
                          <button
                            onClick={() => toggleGhost(f)}
                            title={f.is_ghost ? 'Make active' : 'Make ghost (exclude from EA)'}
                            style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: f.is_ghost ? 'rgba(107,114,128,.12)' : 'transparent', color: f.is_ghost ? 'var(--dim)' : 'var(--muted)', cursor: 'pointer' }}>
                            {f.is_ghost ? '👻 Ghost' : 'Ghost'}
                          </button>
                          <button onClick={() => toggleStatus(f)} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: f.status === 'active' ? 'var(--accent-soft)' : 'var(--surface-2)', color: f.status === 'active' ? 'var(--accent)' : 'var(--dim)', cursor: 'pointer' }}>
                            {f.status === 'active' ? 'Active' : 'Paused'}
                          </button>
                          {!f.locked && (
                            <button onClick={() => deleteField(f.id)} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--dim)', cursor: 'pointer' }}>Delete</button>
                          )}
                        </div>

                        {editId === f.id ? (
                          /* ── Edit mode ── */
                          <div>
                            <div style={labelSt}>EA instruction</div>
                            <textarea
                              value={editData.ea_instruction}
                              onChange={e => setEditData(d => ({ ...d, ea_instruction: e.target.value }))}
                              rows={2}
                              placeholder="How should EA read and use this field?"
                              style={{ ...inputSt, resize: 'vertical', fontStyle: 'italic', color: 'var(--muted)', marginBottom: '10px' }}
                            />
                            <div style={labelSt}>Content</div>
                            <textarea
                              value={editData.body}
                              onChange={e => setEditData(d => ({ ...d, body: e.target.value }))}
                              rows={4}
                              style={{ ...inputSt, resize: 'vertical', marginBottom: '10px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => setEditId(null)} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg)', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
                              <button onClick={() => saveEdit(f)} disabled={saving} style={{ padding: '6px 12px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Save</button>
                            </div>
                          </div>
                        ) : (
                          /* ── View mode ── */
                          <div>
                            {/* EA Instruction */}
                            {f.ea_instruction && (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', background: 'rgba(5,150,105,.04)', border: '1px solid rgba(5,150,105,.12)', borderRadius: '7px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', flexShrink: 0, marginTop: '1px' }}>EA</span>
                                <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>{f.ea_instruction}</span>
                              </div>
                            )}
                            {/* Content */}
                            <div style={{ fontSize: '13px', color: f.body ? 'var(--text)' : 'var(--dim)', lineHeight: 1.7, fontStyle: f.body ? 'normal' : 'italic', marginBottom: '10px' }}>
                              {f.body || 'No content yet — click Edit to add.'}
                            </div>
                            {!f.locked && (
                              <button onClick={() => { setEditId(f.id); setEditData({ body: f.body || '', ea_instruction: f.ea_instruction || '' }) }}
                                style={{ fontSize: '11px', padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer' }}>
                                Edit
                              </button>
                            )}
                          </div>
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

const labelSt: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
  borderRadius: '7px', fontSize: '13px', color: 'var(--text)',
  background: 'var(--bg)', outline: 'none', boxSizing: 'border-box',
}
