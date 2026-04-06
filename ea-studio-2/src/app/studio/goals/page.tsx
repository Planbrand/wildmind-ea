'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Goal = {
  id: string
  title: string
  description: string | null
  goal_type: string
  status: string
  progress_pct: number
  target_date: string | null
  ea_insight: string | null
  priority: number
  parent_goal_id: string | null
  financial_target_pence: number | null
  related_brand_ids: string[]
  people_to_reach: string[]
  brand_id: string | null
  owner_id: string
  created_at: string
}

const PRIORITY_CONFIG = {
  1: { label: 'North Star', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', icon: '⭐' },
  2: { label: 'High', color: '#ef4444', bg: 'rgba(239,68,68,.08)', icon: '🔴' },
  3: { label: 'Medium', color: '#3b82f6', bg: 'rgba(59,130,246,.08)', icon: '🔵' },
  4: { label: 'Low', color: '#6b7280', bg: 'rgba(107,114,128,.08)', icon: '⚪' },
  5: { label: 'Backlog', color: '#9ca3af', bg: 'rgba(156,163,175,.06)', icon: '📋' },
} as Record<number, { label: string; color: string; bg: string; icon: string }>

function pConfig(p: number) {
  return PRIORITY_CONFIG[p] || PRIORITY_CONFIG[4]
}

function formatMoney(pence: number | null) {
  if (!pence) return null
  const amount = pence / 100
  return amount >= 1000 ? `£${(amount / 1000).toFixed(0)}k` : `£${amount.toFixed(0)}`
}

function GoalCard({ goal, children, onSelect, selected }: {
  goal: Goal
  children?: Goal[]
  onSelect: (g: Goal | null) => void
  selected: boolean
}) {
  const p = pConfig(goal.priority)
  const [expanded, setExpanded] = useState(true)
  const hasChildren = children && children.length > 0

  return (
    <div>
      <div
        onClick={() => onSelect(selected ? null : goal)}
        style={{
          background: 'var(--surface)',
          border: `1px solid ${goal.priority === 1 ? p.color : 'var(--border)'}`,
          borderLeft: `3px solid ${p.color}`,
          borderRadius: '10px',
          padding: '14px 16px',
          cursor: 'pointer',
          boxShadow: goal.priority === 1 ? `0 0 0 1px ${p.color}22` : 'none',
          transition: 'border-color .15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{goal.title}</span>
              {goal.priority === 1 && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: p.color, background: p.bg, padding: '2px 8px', borderRadius: '10px' }}>
                  ⭐ North Star
                </span>
              )}
              {goal.financial_target_pence != null && (
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: '6px' }}>
                  {formatMoney(goal.financial_target_pence)}
                </span>
              )}
              {goal.target_date && (
                <span style={{ fontSize: '10px', color: 'var(--dim)' }}>→ {goal.target_date}</span>
              )}
            </div>
            {goal.description && (
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '6px' }}>{goal.description}</div>
            )}
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ height: '100%', width: `${goal.progress_pct}%`, background: p.color, borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: p.color, fontWeight: 700 }}>{goal.progress_pct}%</span>
              <span style={{ fontSize: '10px', color: 'var(--dim)' }}>{p.label}</span>
              {goal.status !== 'active' && (
                <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: '4px' }}>{goal.status}</span>
              )}
            </div>
          </div>
          {hasChildren && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(x => !x) }}
              style={{ fontSize: '10px', color: 'var(--dim)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
            >
              {expanded ? '▾' : '▸'} {children!.length}
            </button>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ marginLeft: 20, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4, borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>
          {children!.map(c => (
            <GoalCard key={c.id} goal={c} onSelect={onSelect} selected={false} />
          ))}
        </div>
      )}
    </div>
  )
}

function AddGoalForm({ onSave, onCancel, parentId, viewName }: { onSave: () => void; onCancel: () => void; parentId?: string; viewName?: string | null }) {
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(3)
  const [targetDate, setTargetDate] = useState('')
  const [financialTarget, setFinancialTarget] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('goals').insert({
      owner_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      target_date: targetDate || null,
      financial_target_pence: financialTarget ? Math.round(parseFloat(financialTarget) * 100) : null,
      parent_goal_id: parentId || null,
      status: 'active',
      progress_pct: 0,
      goal_type: 'business',
      view_tags: viewName ? [viewName] : [],
    })
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{parentId ? 'Add sub-goal' : 'Create goal'}</div>
      <input
        value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title" autoFocus
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', outline: 'none' }}
      />
      <textarea
        value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Priority</div>
          <select
            value={priority} onChange={e => setPriority(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', outline: 'none' }}
          >
            {[1, 2, 3, 4, 5].map(n => (
              <option key={n} value={n}>{pConfig(n).label}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Target date</div>
          <input
            type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Financial target (£)</div>
          <input
            type="number" value={financialTarget} onChange={e => setFinancialTarget(e.target.value)} placeholder="0"
            style={{ width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !title.trim()}
          style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Create'}
        </button>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const rawView = searchParams.get('view')
  const viewName = rawView ? decodeURIComponent(rawView) : null
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let q = supabase.from('goals').select('*').eq('owner_id', user.id).order('priority').order('created_at')
    if (viewName) q = q.contains('view_tags', [viewName])
    const { data } = await q
    setGoals((data as Goal[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [viewName])

  const filtered = goals.filter(g => filter === 'all' ? true : g.status === filter)
  const roots = filtered.filter(g => !g.parent_goal_id)
  const childrenOf = (id: string) => filtered.filter(g => g.parent_goal_id === id)
  const northStar = goals.find(g => g.priority === 1 && g.status === 'active')

  const activeCount = goals.filter(g => g.status === 'active').length

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Goals</div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '13px' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: northStar ? '10px' : 0 }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Goals</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{activeCount} active</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {(['active', 'all', 'completed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: filter === f ? 600 : 400,
                border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                background: filter === f ? 'var(--accent-soft)' : 'transparent',
                color: filter === f ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer', textTransform: 'capitalize',
              }}>{f}</button>
            ))}
            <button onClick={() => { setShowForm(true); setSelected(null) }} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
            }}>+ Goal</button>
          </div>
        </div>
        {northStar && !showForm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: '8px' }}>
            <span style={{ fontSize: '14px' }}>⭐</span>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.06em' }}>North Star</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{northStar.title}</div>
            </div>
            {northStar.financial_target_pence && (
              <div style={{ marginLeft: 'auto', fontSize: '13px', fontWeight: 700, color: '#f59e0b' }}>{formatMoney(northStar.financial_target_pence)}</div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 800 }}>
        {showForm && (
          <AddGoalForm
            onSave={() => { setShowForm(false); load() }}
            onCancel={() => setShowForm(false)}
            viewName={viewName}
          />
        )}

        {roots.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>No goals yet</div>
            <div style={{ marginBottom: '16px' }}>Goals drive EA — create one to give it direction</div>
            <button onClick={() => setShowForm(true)} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              Create your North Star goal
            </button>
          </div>
        ) : (
          roots.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              children={childrenOf(g.id)}
              onSelect={setSelected}
              selected={selected?.id === g.id}
            />
          ))
        )}
      </div>
    </div>
  )
}
