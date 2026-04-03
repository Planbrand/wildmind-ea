'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Brand = { id: string; name: string; color: string; slug: string; mrr_pence: number; inbox_count: number }

const NAV = [
  { section: 'Workspace', items: [
    { key: 'dashboard',  label: 'Dashboard',    icon: '⊞' },
    { key: 'inbox',      label: 'Inbox',        icon: '✉' },
    { key: 'tasks',      label: 'Tasks',        icon: '✓' },
    { key: 'goals',      label: 'Goals',        icon: '◎' },
  ]},
  { section: 'Business', items: [
    { key: 'pipeline',   label: 'Pipeline',     icon: '◉' },
    { key: 'finance',    label: 'Finance',      icon: '£' },
    { key: 'agents',     label: 'Agents',       icon: '⚡' },
  ]},
  { section: 'Life', items: [
    { key: 'life',       label: 'Life',         icon: '♡' },
    { key: 'habits',     label: 'Habits',       icon: '↻' },
    { key: 'people',     label: 'People',       icon: '◉' },
  ]},
  { section: 'EA Mind', items: [
    { key: 'ea-agenda',  label: 'EA Agenda',    icon: '✦' },
    { key: 'ea-dna',     label: 'DNA Fields',   icon: '⬡' },
    { key: 'coach',      label: 'Ask EA',       icon: '✧' },
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
  const [activeBrand, setActiveBrand] = useState<Brand | null>(brands[0] || null)

  const currentSection = pathname.split('/studio/')[1]?.split('/')[0] || 'dashboard'

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 210, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding:'16px 14px 12px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ fontFamily:'Times New Roman, Times, serif', fontSize:'16px', fontWeight:700 }}>
            Wild<span style={{ color:'var(--accent)' }}>mind</span>
          </div>
          <div style={{ fontSize:'10px', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.08em', marginTop:'2px' }}>EA Studio</div>
        </div>

        {/* Brand switcher */}
        {brands.length > 0 && (
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
            <div style={{ fontSize:'9px', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--dim)', padding:'0 4px 6px' }}>Brands</div>
            {brands.map(b => (
              <div
                key={b.id}
                onClick={() => setActiveBrand(b)}
                style={{
                  display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px',
                  borderRadius:'7px', cursor:'pointer', fontSize:'12px',
                  color: activeBrand?.id === b.id ? 'var(--text)' : 'var(--muted)',
                  background: activeBrand?.id === b.id ? 'rgba(5,150,105,.08)' : 'transparent',
                  fontWeight: activeBrand?.id === b.id ? 600 : 500,
                }}
              >
                <div style={{ width:8, height:8, borderRadius:'50%', background:b.color, flexShrink:0 }} />
                <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.name}</span>
                <span style={{ fontSize:'10px', color:'var(--dim)', fontWeight:400 }}>{b.inbox_count}</span>
              </div>
            ))}
            <Link href="/studio/brands/new" style={{
              display:'flex', alignItems:'center', gap:'8px', padding:'6px 8px',
              borderRadius:'7px', fontSize:'11px', color:'var(--dim)',
              border:'1px dashed var(--border-mid)', marginTop:'4px'
            }}>
              + Add brand
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex:1, overflowY:'auto', padding:'6px 0' }}>
          {NAV.map(group => (
            <div key={group.section}>
              <div style={{ fontSize:'10px', fontWeight:600, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--dim)', padding:'10px 14px 4px' }}>
                {group.section}
              </div>
              {group.items.map(item => {
                const active = currentSection === item.key
                return (
                  <Link
                    key={item.key}
                    href={`/studio/${item.key}`}
                    style={{
                      display:'flex', alignItems:'center', gap:'9px',
                      padding:'8px 14px', fontSize:'13px', fontWeight: active ? 600 : 500,
                      color: active ? 'var(--accent)' : 'var(--muted)',
                      background: active ? 'rgba(5,150,105,.08)' : 'transparent',
                      borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
                      textDecoration:'none',
                    }}
                  >
                    <span style={{ fontSize:'13px', width:16, textAlign:'center', opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer / user */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'9px', padding:'6px 8px', borderRadius:'8px', cursor:'pointer' }}
            onClick={signOut}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--accent)', color:'#fff', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {userName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{userName}</div>
              <div style={{ fontSize:'10px', color:'var(--dim)' }}>Sign out</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {children}
      </main>
    </div>
  )
}
