'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createSection, createView } from '@/app/studio/sections/actions'

type Section = { id: string; name: string; icon: string | null; sort_order: number }
type View = { id: string; section_id: string | null; name: string; slug: string; color: string; icon: string | null; is_studio: boolean; sort_order: number }

const NAV = [
  { section: 'Business', items: [
    { key: 'pipeline',   label: 'Pipeline',  icon: <PipelineIcon /> },
    { key: 'finance',    label: 'Finance',   icon: <FinanceIcon /> },
    { key: 'inbox',      label: 'Inbox',     icon: <InboxIcon /> },
    { key: 'campaigns',  label: 'Campaigns', icon: <CampaignIcon /> },
    { key: 'agents',     label: 'Agents',    icon: <AgentIcon /> },
  ]},
  { section: 'Personal', items: [
    { key: 'tasks',      label: 'Tasks',     icon: <TaskIcon /> },
    { key: 'goals',      label: 'Goals',     icon: <GoalIcon /> },
    { key: 'habits',     label: 'Habits',    icon: <HabitIcon /> },
    { key: 'people',     label: 'People',    icon: <PeopleIcon /> },
  ]},
  { section: 'EA', items: [
    { key: 'ea-dna',     label: 'DNA Fields', icon: <DnaIcon /> },
    { key: 'coach',      label: 'Ask EA',     icon: <CoachIcon /> },
  ]},
]

export default function StudioShell({
  children, userName, userEmail: _userEmail, sections, views,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  sections: Section[]
  views: View[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const currentKey = pathname.split('/studio/')[1]?.split('/')[0] || 'dashboard'

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [addingSectionName, setAddingSectionName] = useState('')
  const [showAddSection, setShowAddSection] = useState(false)
  const [addingView, setAddingView] = useState<string | null>(null) // section id
  const [newViewName, setNewViewName] = useState('')
  const [newViewColor, setNewViewColor] = useState('#059669')
  const [saving, setSaving] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
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

  async function handleAddView() {
    if (!newViewName.trim() || !addingView) return
    setSaving(true)
    try {
      const v = await createView(addingView, newViewName, newViewColor, '')
      setNewViewName('')
      setNewViewColor('#059669')
      setAddingView(null)
      if (v?.slug) router.push(`/studio/views/${v.slug}`)
      else router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const initials = userName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  const COLORS = ['#059669', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#f97316']

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 228, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Logo */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--text)', color: '#fff', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, letterSpacing: '-.5px' }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-.2px' }}>Wild<span style={{ color: 'var(--accent)' }}>mind</span></div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Dashboard */}
          <div style={{ padding: '8px 10px 0' }}>
            <Link href="/studio/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: currentKey === 'dashboard' ? 600 : 400, color: currentKey === 'dashboard' ? 'var(--text)' : 'var(--muted)', background: currentKey === 'dashboard' ? 'var(--bg)' : 'transparent', textDecoration: 'none', marginBottom: '2px' }}>
              <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: currentKey === 'dashboard' ? 1 : 0.6 }}><HomeIcon /></span>
              Home
            </Link>
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '6px 10px' }} />

          {/* Sections + Views */}
          {sections.length > 0 && (
            <div style={{ padding: '0 10px' }}>
              {sections.map(sec => {
                const secViews = views.filter(v => v.section_id === sec.id).sort((a, b) => a.sort_order - b.sort_order)
                const isCollapsed = collapsed[sec.id]
                return (
                  <div key={sec.id} style={{ marginBottom: '4px' }}>
                    <button onClick={() => setCollapsed(c => ({ ...c, [sec.id]: !c[sec.id] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>
                      <span style={{ fontSize: '9px', opacity: 0.5 }}>{isCollapsed ? '▶' : '▼'}</span>
                      {sec.icon && <span>{sec.icon}</span>}
                      {sec.name}
                    </button>
                    {!isCollapsed && (
                      <>
                        {secViews.map(v => {
                          const isActive = pathname === `/studio/views/${v.slug}` || pathname.startsWith(`/studio/views/${v.slug}?`)
                          return (
                            <Link key={v.id} href={`/studio/views/${v.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px 6px 22px', borderRadius: '7px', fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text)' : 'var(--muted)', background: isActive ? 'var(--bg)' : 'transparent', textDecoration: 'none', marginBottom: '1px' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
                              {v.is_studio && <span style={{ fontSize: '8px', color: 'var(--accent)', fontWeight: 700 }}>ALL</span>}
                            </Link>
                          )
                        })}
                        {/* Add view inline form */}
                        {addingView === sec.id ? (
                          <div style={{ padding: '6px 8px 6px 22px' }}>
                            <input
                              value={newViewName}
                              onChange={e => setNewViewName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddView(); if (e.key === 'Escape') setAddingView(null) }}
                              placeholder="View name…"
                              autoFocus
                              style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                              {COLORS.map(c => (
                                <button key={c} onClick={() => setNewViewColor(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: newViewColor === c ? '2px solid var(--text)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => setAddingView(null)} style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '5px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>Cancel</button>
                              <button onClick={handleAddView} disabled={saving} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Create</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingView(sec.id); setNewViewName('') }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px 5px 22px', borderRadius: '7px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px', color: 'var(--dim)', width: '100%', textAlign: 'left' }}>
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Add view
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )
              })}

              {/* Add section */}
              {showAddSection ? (
                <div style={{ padding: '6px 8px', marginBottom: '4px' }}>
                  <input
                    value={addingSectionName}
                    onChange={e => setAddingSectionName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddSection(); if (e.key === 'Escape') setShowAddSection(false) }}
                    placeholder="Section name…"
                    autoFocus
                    style={{ width: '100%', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--accent)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => setShowAddSection(false)} style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '5px', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleAddSection} disabled={saving} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '5px', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>Create</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddSection(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', color: 'var(--dim)', marginBottom: '6px', width: '100%', textAlign: 'left' }}>
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span> Add section
                </button>
              )}
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 10px' }} />

          {/* Static nav */}
          <nav style={{ padding: '4px 10px 8px' }}>
            {NAV.map((group, gi) => (
              <div key={gi} style={{ marginBottom: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dim)', padding: '8px 8px 4px', letterSpacing: '.04em' }}>{group.section}</div>
                {group.items.map(item => {
                  const active = currentKey === item.key
                  return (
                    <Link key={item.key} href={`/studio/${item.key}`} style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? 'var(--text)' : 'var(--muted)', background: active ? 'var(--bg)' : 'transparent', textDecoration: 'none', marginBottom: '1px' }}>
                      <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Sign out */}
        <div style={{ padding: '10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={signOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: 'none', fontSize: '13px', color: 'var(--muted)', textAlign: 'left' }}>
            <SignOutIcon /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  )
}

function HomeIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> }
function InboxIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg> }
function TaskIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> }
function GoalIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="3" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="21" /></svg> }
function PipelineIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }
function FinanceIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> }
function CampaignIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> }
function AgentIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> }
function HabitIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> }
function PeopleIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
function DnaIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg> }
function CoachIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> }
function SignOutIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> }
