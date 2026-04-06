'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { createSection, createView } from '@/app/studio/sections/actions'

type Section = { id: string; name: string; icon: string | null; sort_order: number }
type View = { id: string; section_id: string | null; name: string; slug: string; color: string; icon: string | null; is_studio: boolean; sort_order: number }

const COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#f97316']

export default function ViewsBar({ sections, views }: { sections: Section[]; views: View[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeViewName = searchParams.get('view') // e.g. "brumah"

  const [addingView, setAddingView] = useState<string | null>(null)
  const [newViewName, setNewViewName] = useState('')
  const [newViewColor, setNewViewColor] = useState('#059669')
  const [showAddSection, setShowAddSection] = useState(false)
  const [addingSectionName, setAddingSectionName] = useState('')
  const [saving, setSaving] = useState(false)

  function selectView(v: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (v.is_studio || activeViewName === v.name) {
      params.delete('view')
    } else {
      params.set('view', v.name)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  async function handleAddView() {
    if (!newViewName.trim() || !addingView) return
    setSaving(true)
    try {
      await createView(addingView, newViewName, newViewColor, '')
      setNewViewName('')
      setNewViewColor('#059669')
      setAddingView(null)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSection() {
    if (!addingSectionName.trim()) return
    setSaving(true)
    try {
      await createSection(addingSectionName, '')
      setAddingSectionName('')
      setShowAddSection(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  if (sections.length === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexShrink: 0,
      background: 'var(--surface)', borderBottom: '1px solid var(--border)',
      padding: '0 16px', minHeight: 40, overflowX: 'auto', gap: 0,
    }}>
      <span style={labelStyle}>Views</span>
      <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 10px' }} />

      {sections.map((sec, i) => {
        const secViews = views
          .filter(v => v.section_id === sec.id)
          .sort((a, b) => a.sort_order - b.sort_order)

        return (
          <div key={sec.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {i > 0 && <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 8px' }} />}

            <span style={labelStyle}>{sec.icon && `${sec.icon} `}{sec.name}</span>

            {secViews.map(v => {
              const isActive = v.is_studio ? !activeViewName : activeViewName === v.name
              return (
                <button
                  key={v.id}
                  onClick={() => selectView(v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? v.color + '22' : 'transparent',
                    color: isActive ? v.color : 'var(--muted)',
                    border: `1px solid ${isActive ? v.color + '66' : 'var(--border)'}`,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? v.color : 'var(--dim)', flexShrink: 0 }} />
                  {v.name}
                  {v.is_studio && <span style={{ fontSize: 8, color: 'var(--accent)', fontWeight: 700, marginLeft: 2 }}>ALL</span>}
                </button>
              )
            })}

            {/* Add view for this section */}
            {addingView === sec.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <input
                  autoFocus
                  value={newViewName}
                  onChange={e => setNewViewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddView(); if (e.key === 'Escape') setAddingView(null) }}
                  placeholder="View name…"
                  style={{ width: 110, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewViewColor(c)}
                      style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: newViewColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
                    />
                  ))}
                </div>
                <button onClick={handleAddView} disabled={saving} style={smallBtnAccent}>Create</button>
                <button onClick={() => setAddingView(null)} style={smallBtnGhost}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingView(sec.id); setNewViewName('') }}
                style={{ padding: '2px 7px', borderRadius: 20, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--dim)', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}
              >
                +
              </button>
            )}
          </div>
        )
      })}

      <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0, margin: '0 8px' }} />

      {/* Add section */}
      {showAddSection ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <input
            autoFocus
            value={addingSectionName}
            onChange={e => setAddingSectionName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false) }}
            placeholder="Section name…"
            style={{ width: 120, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', fontSize: 12, outline: 'none' }}
          />
          <button onClick={handleAddSection} disabled={saving} style={smallBtnAccent}>Create</button>
          <button onClick={() => setShowAddSection(false)} style={smallBtnGhost}>✕</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddSection(true)}
          style={{ padding: '3px 10px', borderRadius: 20, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--dim)', fontSize: 11, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          + Section
        </button>
      )}

      {/* Active view indicator */}
      {activeViewName && (
        <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--dim)', fontWeight: 600 }}>Filtered:</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{activeViewName}</span>
          <button
            onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.delete('view'); const qs = p.toString(); router.replace(qs ? `${pathname}?${qs}` : pathname) }}
            style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--dim)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--dim)',
  textTransform: 'uppercase', letterSpacing: '.06em',
  marginRight: 6, flexShrink: 0, whiteSpace: 'nowrap',
}

const smallBtnAccent: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 5, border: 'none',
  background: 'var(--accent)', color: '#fff', fontSize: 11, cursor: 'pointer',
}

const smallBtnGhost: React.CSSProperties = {
  padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
}
