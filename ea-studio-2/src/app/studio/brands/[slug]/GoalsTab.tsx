'use client'
import { useState } from 'react'
import { addGoal, deleteGoal } from './actions'
import type { Goal } from '@/types/database'

type Brand = { id: string; name: string; color: string }

type Props = {
  goals: Goal[]
  brandId: string
  ownerId: string
  slug: string
  allBrands: Brand[]
}

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: '⭐ North Star', color: '#f59e0b' },
  2: { label: 'High', color: '#ef4444' },
  3: { label: 'Medium', color: '#3b82f6' },
  4: { label: 'Low', color: '#6b7280' },
  5: { label: 'Backlog', color: '#9ca3af' },
}

function pence(n: number) {
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export function GoalsTab({ goals, brandId, ownerId, slug, allBrands }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [personInput, setPersonInput] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    target_date: '',
    priority: 1,
    financial_target: '',
    related_brand_ids: [] as string[],
    people_to_reach: [] as string[],
  })

  function toggleBrand(id: string) {
    setForm(f => ({
      ...f,
      related_brand_ids: f.related_brand_ids.includes(id)
        ? f.related_brand_ids.filter(b => b !== id)
        : [...f.related_brand_ids, id],
    }))
  }

  function addPerson() {
    const name = personInput.trim()
    if (!name || form.people_to_reach.includes(name)) return
    setForm(f => ({ ...f, people_to_reach: [...f.people_to_reach, name] }))
    setPersonInput('')
  }

  async function handleAdd() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await addGoal({
        brandId,
        ownerId,
        title: form.title,
        description: form.description,
        target_date: form.target_date,
        priority: form.priority,
        financial_target_pence: form.financial_target ? Math.round(parseFloat(form.financial_target) * 100) : null,
        related_brand_ids: form.related_brand_ids,
        people_to_reach: form.people_to_reach,
        slug,
      })
      setForm({ title: '', description: '', target_date: '', priority: 1, financial_target: '', related_brand_ids: [], people_to_reach: [] })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const sorted = [...goals].sort((a, b) => (a.priority || 5) - (b.priority || 5))

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {goals.length === 0 ? 'No goals yet' : `${goals.length} goal${goals.length !== 1 ? 's' : ''} · Priority 1 drives everything`}
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          + Create goal
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>New goal</div>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What is the goal?"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }}
          />

          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Why does this matter? What does success look like?"
            rows={2}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }}
          />

          {/* Priority */}
          <div style={{ marginBottom: '12px' }}>
            <div style={lbl}>Priority</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(PRIORITY_LABELS).map(([p, { label, color }]) => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: Number(p) }))} style={{
                  padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  border: `1px solid ${form.priority === Number(p) ? color : 'var(--border)'}`,
                  background: form.priority === Number(p) ? color + '18' : 'transparent',
                  color: form.priority === Number(p) ? color : 'var(--muted)', cursor: 'pointer',
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <div style={lbl}>Target date</div>
              <input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={lbl}>Financial target (£)</div>
              <input type="number" step="0.01" placeholder="0.00" value={form.financial_target} onChange={e => setForm(f => ({ ...f, financial_target: e.target.value }))} style={inp} />
            </div>
          </div>

          {/* Related brands */}
          {allBrands.filter(b => b.id !== brandId).length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={lbl}>Related brands</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allBrands.filter(b => b.id !== brandId).map(b => (
                  <button key={b.id} onClick={() => toggleBrand(b.id)} style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                    border: `1px solid ${form.related_brand_ids.includes(b.id) ? b.color : 'var(--border)'}`,
                    background: form.related_brand_ids.includes(b.id) ? b.color + '18' : 'transparent',
                    color: form.related_brand_ids.includes(b.id) ? b.color : 'var(--muted)', cursor: 'pointer',
                  }}>{b.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* People to reach */}
          <div style={{ marginBottom: '16px' }}>
            <div style={lbl}>People to reach</div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              <input
                value={personInput}
                onChange={e => setPersonInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPerson()}
                placeholder="Name or email… press Enter"
                style={{ ...inp, flex: 1 }}
              />
              <button onClick={addPerson} style={{ padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Add</button>
            </div>
            {form.people_to_reach.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {form.people_to_reach.map(p => (
                  <span key={p} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {p}
                    <button onClick={() => setForm(f => ({ ...f, people_to_reach: f.people_to_reach.filter(x => x !== p) }))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: '10px', padding: 0 }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.title.trim()} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save goal'}
            </button>
          </div>
        </div>
      )}

      {/* Goals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.length === 0 && !showForm ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No goals yet</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>Goals drive everything EA does for this brand — agenda notes, suggestions, and tasks all follow the goal hierarchy.</div>
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Create first goal</button>
          </div>
        ) : sorted.map((g, idx) => {
          const pri = PRIORITY_LABELS[g.priority] || PRIORITY_LABELS[5]
          return (
            <div key={g.id} style={{ background: 'var(--surface)', border: `1px solid ${idx === 0 ? pri.color + '44' : 'var(--border)'}`, borderRadius: '12px', padding: '16px', borderLeft: `3px solid ${pri.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: pri.color + '18', color: pri.color }}>{pri.label}</span>
                    {g.target_date && <span style={{ fontSize: '10px', color: 'var(--dim)' }}>→ {g.target_date}</span>}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{g.title}</div>
                  {g.description && <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{g.description}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>{g.progress_pct}%</span>
                  <button onClick={() => deleteGoal(g.id, slug)} style={{ fontSize: '11px', color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              </div>
              <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${g.progress_pct}%`, background: pri.color, borderRadius: '2px' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {g.financial_target_pence && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>💰 Target: {pence(g.financial_target_pence)}</span>
                )}
                {g.people_to_reach?.length > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>👤 {g.people_to_reach.join(', ')}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }
