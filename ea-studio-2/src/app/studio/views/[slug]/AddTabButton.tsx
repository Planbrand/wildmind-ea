'use client'
import { useState } from 'react'
import { addTabToView } from '../../sections/actions'
import { useRouter } from 'next/navigation'

const LAYOUTS = [
  { key: 'list', label: 'List', icon: '☰' },
  { key: 'table', label: 'Table', icon: '⊞' },
  { key: 'kanban', label: 'Kanban', icon: '⬜' },
  { key: 'calendar', label: 'Calendar', icon: '📅' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'chat', label: 'Chat', icon: '💬' },
]

export function AddTabButton({ viewId, slug }: { viewId: string; slug: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [layout, setLayout] = useState('list')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    try {
      await addTabToView(viewId, name, layout)
      setName('')
      setLayout('list')
      setOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '5px 10px', borderRadius: '7px', fontSize: '12px',
        border: '1px dashed var(--border)', background: 'transparent',
        color: 'var(--dim)', cursor: 'pointer', flexShrink: 0, marginLeft: '4px',
      }}>+ Tab</button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Add tab</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Tab name"
              autoFocus
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }}
            />
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Layout</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {LAYOUTS.map(l => (
                  <button key={l.key} onClick={() => setLayout(l.key)} style={{
                    padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: `1px solid ${layout === l.key ? 'var(--accent)' : 'var(--border)'}`,
                    background: layout === l.key ? 'var(--accent-soft)' : 'transparent',
                    color: layout === l.key ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}>
                    <span style={{ fontSize: '16px' }}>{l.icon}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving || !name.trim()} style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Adding…' : 'Add tab'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
