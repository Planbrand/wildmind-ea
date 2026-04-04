'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Brand = { id: string; name: string; color: string; slug: string; mrr_pence: number; inbox_count: number }

const NAV = [
  { items: [
    { key: 'dashboard',  label: 'Home',         icon: <HomeIcon /> },
    { key: 'inbox',      label: 'Inbox',        icon: <InboxIcon /> },
    { key: 'tasks',      label: 'Tasks',        icon: <TaskIcon /> },
    { key: 'goals',      label: 'Goals',        icon: <GoalIcon /> },
  ]},
  { section: 'Business', items: [
    { key: 'pipeline',   label: 'Pipeline',     icon: <PipelineIcon /> },
    { key: 'finance',    label: 'Finance',      icon: <FinanceIcon /> },
    { key: 'agents',     label: 'Agents',       icon: <AgentIcon /> },
  ]},
  { section: 'Life', items: [
    { key: 'life',       label: 'Life',         icon: <LifeIcon /> },
    { key: 'habits',     label: 'Habits',       icon: <HabitIcon /> },
    { key: 'people',     label: 'People',       icon: <PeopleIcon /> },
  ]},
  { section: 'EA', items: [
    { key: 'ea-agenda',  label: 'EA Agenda',    icon: <AgendaIcon /> },
    { key: 'ea-dna',     label: 'DNA Fields',   icon: <DnaIcon /> },
    { key: 'coach',      label: 'Ask EA',       icon: <CoachIcon /> },
  ]},
]

export default function StudioShell({
  children, userName, userEmail: _userEmail, brands
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  brands: Brand[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const currentSection = pathname.split('/studio/')[1]?.split('/')[0] || 'dashboard'

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', overflow: 'hidden'
      }}>

        {/* Logo + user */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', flexShrink:0, display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'var(--text)', color: '#fff',
            fontSize: '12px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, letterSpacing: '-.5px'
          }}>{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-.2px' }}>
              Wild<span style={{ color: 'var(--accent)' }}>mind</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {userName}
            </div>
          </div>
        </div>

        {/* Brand switcher */}
        {brands.length > 0 && (
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', padding:'4px 8px 6px' }}>Brands</div>
            {brands.map(b => {
              const active = pathname === `/studio/brands/${b.slug}` || pathname.startsWith(`/studio/brands/${b.slug}?`)
              return (
                <Link key={b.id} href={`/studio/brands/${b.slug}`} style={{
                  display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px',
                  borderRadius:'7px', cursor:'pointer', fontSize:'13px',
                  color: active ? 'var(--text)' : 'var(--muted)',
                  background: active ? 'var(--bg)' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  textDecoration:'none',
                }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:b.color, flexShrink:0 }} />
                  <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</span>
                  {b.inbox_count > 0 && <span style={{ fontSize:'10px', color:'var(--muted)' }}>{b.inbox_count}</span>}
                </Link>
              )
            })}
            <Link href="/studio/brands/new" style={{
              display:'flex', alignItems:'center', gap:'6px', padding:'6px 8px',
              borderRadius:'7px', fontSize:'12px', color:'var(--dim)',
              marginTop:'2px'
            }}>
              <span style={{ fontSize:'16px', lineHeight:1 }}>+</span> Add brand
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'8px 10px' }}>
          {NAV.map((group, gi) => (
            <div key={gi} style={{ marginBottom: group.section ? '4px' : '8px' }}>
              {group.section && (
                <div style={{ fontSize:'11px', fontWeight:600, color:'var(--dim)', padding:'8px 8px 4px', letterSpacing:'.04em' }}>
                  {group.section}
                </div>
              )}
              {group.items.map(item => {
                const active = currentSection === item.key
                return (
                  <Link key={item.key} href={`/studio/${item.key}`} style={{
                    display:'flex', alignItems:'center', gap:'9px',
                    padding:'7px 10px', borderRadius:'8px',
                    fontSize:'13px', fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text)' : 'var(--muted)',
                    background: active ? 'var(--bg)' : 'transparent',
                    textDecoration:'none', marginBottom:'1px',
                  }}>
                    <span style={{ width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: active ? 1 : 0.6 }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding:'10px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <button onClick={signOut} style={{
            width:'100%', display:'flex', alignItems:'center', gap:'8px',
            padding:'7px 10px', borderRadius:'8px', cursor:'pointer',
            background:'transparent', border:'none', fontSize:'13px',
            color:'var(--muted)', textAlign:'left',
          }}>
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {children}
      </main>
    </div>
  )
}

/* ── Icons ── */
function HomeIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
function InboxIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
}
function TaskIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
}
function GoalIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><line x1="12" y1="3" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="21" /></svg>
}
function PipelineIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
}
function FinanceIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}
function AgentIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
}
function LifeIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
}
function HabitIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
}
function PeopleIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function AgendaIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
}
function DnaIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
}
function CoachIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
}
function SignOutIcon() {
  return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
}
