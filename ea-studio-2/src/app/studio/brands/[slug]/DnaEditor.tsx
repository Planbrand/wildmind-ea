'use client'
import { useState, useTransition } from 'react'
import { updateDnaField, addDnaField, deleteDnaField } from './actions'

type DnaField = {
  id: string; field_id: string; label: string; body: string | null; locked: boolean; layer: string
}

export function DnaEditor({ fields, brandId, ownerId, slug }: {
  fields: DnaField[]; brandId: string; ownerId: string; slug: string
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editBody, setEditBody] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addLayer, setAddLayer] = useState('L1')
  const [addLabel, setAddLabel] = useState('')
  const [addBody, setAddBody] = useState('')
  const [isPending, startTransition] = useTransition()

  function startEdit(f: DnaField) {
    setEditing(f.id)
    setEditLabel(f.label)
    setEditBody(f.body || '')
  }

  function saveEdit(id: string) {
    startTransition(async () => {
      await updateDnaField(id, editLabel, editBody, slug)
      setEditing(null)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this DNA field?')) return
    startTransition(async () => {
      await deleteDnaField(id, slug)
    })
  }

  function handleAdd() {
    if (!addLabel.trim()) return
    startTransition(async () => {
      await addDnaField(brandId, ownerId, addLayer, addLabel, addBody, slug)
      setShowAdd(false)
      setAddLabel('')
      setAddBody('')
    })
  }

  const layers = ['L1', 'L2', 'L3']
  const layerLabel: Record<string, string> = { L1: 'Layer 1 — Identity', L2: 'Layer 2 — Active State', L3: 'Layer 3 — Strategy' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 700 }}>
      {layers.map(layer => {
        const layerFields = fields.filter(f => f.layer === layer)
        if (layerFields.length === 0) return null
        return (
          <div key={layer}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '8px 0 4px' }}>
              {layerLabel[layer]}
            </div>
            {layerFields.map(f => (
              <div key={f.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '16px 18px', marginBottom: '8px',
              }}>
                {editing === f.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      style={inputStyle}
                      placeholder="Field name"
                    />
                    <textarea
                      value={editBody}
                      onChange={e => setEditBody(e.target.value)}
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
                      placeholder="Content"
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => saveEdit(f.id)} disabled={isPending} style={btnPrimary}>
                        {isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditing(null)} style={btnGhost}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 7px' }}>{f.field_id}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{f.label}</span>
                      {!f.locked && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => startEdit(f)} style={btnSmall}>Edit</button>
                          <button onClick={() => handleDelete(f.id)} style={{ ...btnSmall, color: '#ef4444' }}>Delete</button>
                        </div>
                      )}
                      {f.locked && <span style={{ fontSize: '10px', color: 'var(--dim)' }}>🔒</span>}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
                      {f.body || <span style={{ fontStyle: 'italic', color: 'var(--dim)' }}>Not filled in yet</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {/* Add new field */}
      {showAdd ? (
        <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>New DNA Field</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <select value={addLayer} onChange={e => setAddLayer(e.target.value)} style={inputStyle}>
              <option value="L1">L1 — Identity</option>
              <option value="L2">L2 — Active State</option>
              <option value="L3">L3 — Strategy</option>
            </select>
            <input value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Field name" style={inputStyle} />
            <textarea value={addBody} onChange={e => setAddBody(e.target.value)} placeholder="Content" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleAdd} disabled={isPending || !addLabel.trim()} style={btnPrimary}>
                {isPending ? 'Adding…' : 'Add field'}
              </button>
              <button onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', borderRadius: '10px',
          border: '1px dashed var(--border)', background: 'transparent',
          fontSize: '13px', color: 'var(--muted)', cursor: 'pointer',
          width: '100%',
        }}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add DNA field
        </button>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--border)', fontSize: '13px',
  color: 'var(--text)', background: 'var(--bg)',
  fontFamily: 'inherit', boxSizing: 'border-box',
}
const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', borderRadius: '7px', border: 'none',
  background: 'var(--accent)', color: '#fff', fontSize: '12px',
  fontWeight: 600, cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  padding: '7px 16px', borderRadius: '7px',
  border: '1px solid var(--border)', background: 'transparent',
  fontSize: '12px', color: 'var(--muted)', cursor: 'pointer',
}
const btnSmall: React.CSSProperties = {
  padding: '4px 10px', borderRadius: '6px',
  border: '1px solid var(--border)', background: 'transparent',
  fontSize: '11px', color: 'var(--muted)', cursor: 'pointer',
}
