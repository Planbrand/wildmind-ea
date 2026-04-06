'use client'
import { useState } from 'react'
import { addAgendaEntry, deleteAgendaEntry } from './actions'
import type { EAAgenda } from '@/types/database'

const ENTRY_TYPES = [
  { key: 'note', label: 'Note' },
  { key: 'plan', label: 'Plan' },
  { key: 'reminder', label: 'Reminder' },
  { key: 'event', label: 'Event' },
  { key: 'payment', label: 'Payment' },
  { key: 'win', label: 'Win' },
  { key: 'concern', label: 'Concern' },
  { key: 'other', label: 'Other' },
]

const ENTRY_COLORS: Record<string, string> = {
  note: '#6b7280', plan: '#3b82f6', reminder: '#f59e0b',
  event: '#8b5cf6', payment: '#dc2626', win: '#16a34a',
  concern: '#ef4444', other: '#6b7280',
}

type Props = {
  entries: EAAgenda[]
  brandId: string
  ownerId: string
  slug: string
}

export function AgendaTab({ entries, brandId, ownerId, slug }: Props) {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    body: '',
    entry_type: 'note',
    life_area: '',
    deadline_date: '',
    reminder_at: '',
    priority: 2,
  })
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  async function handleAdd() {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      await addAgendaEntry({ ...form, brandId, ownerId, slug })
      setForm({ title: '', body: '', entry_type: 'note', life_area: '', deadline_date: '', reminder_at: '', priority: 2 })
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteAgendaEntry(id, slug)
  }

  // Calendar helpers
  const { year, month } = calMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = new Date(year, month).toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const entriesByDate: Record<string, EAAgenda[]> = {}
  entries.forEach(e => {
    const date = e.deadline_date || e.reminder_at?.split('T')[0] || e.created_at.split('T')[0]
    if (!entriesByDate[date]) entriesByDate[date] = []
    entriesByDate[date].push(e)
  })

  const dayEntries = selectedDay ? (entriesByDate[selectedDay] || []) : []
  const today = new Date().toISOString().split('T')[0]

  const priorityLabel = (p: number) => p === 1 ? 'High' : p === 2 ? 'Normal' : 'Low'
  const priorityColor = (p: number) => p === 1 ? 'var(--danger)' : p === 2 ? 'var(--accent)' : 'var(--dim)'

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {(['list', 'calendar'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: view === v ? 600 : 400,
              background: view === v ? 'var(--text)' : 'transparent',
              color: view === v ? '#fff' : 'var(--muted)',
              border: 'none', cursor: 'pointer',
            }}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{
          marginLeft: 'auto', padding: '7px 14px', borderRadius: '8px', fontSize: '12px',
          fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
        }}>+ Add note</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: 'var(--dim)', marginBottom: '14px', fontStyle: 'italic' }}>
            Writing in my agenda — a note for {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>

          {/* Type pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {ENTRY_TYPES.map(t => (
              <button key={t.key} onClick={() => setForm(f => ({ ...f, entry_type: t.key }))} style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                border: `1px solid ${form.entry_type === t.key ? ENTRY_COLORS[t.key] : 'var(--border)'}`,
                background: form.entry_type === t.key ? ENTRY_COLORS[t.key] + '18' : 'transparent',
                color: form.entry_type === t.key ? ENTRY_COLORS[t.key] : 'var(--muted)',
                cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>

          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="What should I remember?"
            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '14px', fontWeight: 600, marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }}
          />
          <textarea
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Details… (optional)"
            rows={2}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', resize: 'vertical', marginBottom: '10px', boxSizing: 'border-box', outline: 'none' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <div style={lbl}>Deadline</div>
              <input type="date" value={form.deadline_date} onChange={e => setForm(f => ({ ...f, deadline_date: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={lbl}>Remind me at</div>
              <input type="datetime-local" value={form.reminder_at} onChange={e => setForm(f => ({ ...f, reminder_at: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={lbl}>Priority</div>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} style={inp}>
                <option value={1}>High</option>
                <option value={2}>Normal</option>
                <option value={3}>Low</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleAdd} disabled={saving || !form.title.trim()} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </div>
      )}

      {/* Calendar view */}
      {view === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <button onClick={() => setCalMonth(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '13px' }}>←</button>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{monthName}</div>
              <button onClick={() => setCalMonth(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '6px', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '13px' }}>→</button>
            </div>
            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--dim)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>
            {/* Days grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEntryList = entriesByDate[dateStr] || []
                const isToday = dateStr === today
                const isSelected = dateStr === selectedDay
                return (
                  <button key={day} onClick={() => setSelectedDay(isSelected ? null : dateStr)} style={{
                    padding: '6px 4px', borderRadius: '6px', border: 'none', cursor: 'pointer', textAlign: 'center',
                    background: isSelected ? 'var(--accent)' : isToday ? 'var(--accent-soft)' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? 'var(--accent)' : 'var(--text)',
                    fontWeight: isToday || isSelected ? 700 : 400, fontSize: '13px',
                    position: 'relative',
                  }}>
                    {day}
                    {dayEntryList.length > 0 && (
                      <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '2px', justifyContent: 'center' }}>
                        {dayEntryList.slice(0, 3).map((e, ei) => (
                          <div key={ei} style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : ENTRY_COLORS[e.entry_type] || 'var(--accent)' }} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected day entries */}
          <div>
            {selectedDay ? (
              <>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {dayEntries.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--dim)', padding: '20px 0' }}>Nothing scheduled. Click + Add note to add one.</div>
                ) : dayEntries.map(e => <EntryCard key={e.id} entry={e} onDelete={() => handleDelete(e.id)} />)}
              </>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--dim)', padding: '20px 0' }}>Select a day to see notes</div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 700 }}>
          {entries.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>EA agenda is empty</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Add a note, reminder, or plan. EA will also add observations here as you use the studio.</div>
            </div>
          ) : entries.map(e => <EntryCard key={e.id} entry={e} onDelete={() => handleDelete(e.id)} />)}
        </div>
      )}
    </div>
  )
}

function EntryCard({ entry: e, onDelete }: { entry: EAAgenda; onDelete: () => void }) {
  const color = ENTRY_COLORS[e.entry_type] || 'var(--dim)'
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: color, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: color + '18', color }}>{e.entry_type}</span>
            {e.is_pinned && <span style={{ fontSize: '10px', color: 'var(--accent)' }}>📌</span>}
            {e.priority === 1 && <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--danger)' }}>High priority</span>}
            {e.deadline_date && <span style={{ fontSize: '10px', color: 'var(--warn)', marginLeft: 'auto' }}>⏰ {e.deadline_date}</span>}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: e.body ? '4px' : 0 }}>{e.title}</div>
          {e.body && <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{e.body}</div>}
          {e.reminder_at && (
            <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '6px' }}>
              Reminder: {new Date(e.reminder_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <button onClick={onDelete} style={{ fontSize: '11px', color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px' }}>✕</button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', boxSizing: 'border-box', outline: 'none' }
