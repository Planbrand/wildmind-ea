import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

function pence(n: number) {
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000)    return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const sp = await searchParams
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let tasksQ = supabase.from('tasks').select('*').eq('owner_id', user.id).eq('is_done', false).order('sort_order').limit(6)
  let goalsQ = supabase.from('goals').select('*').eq('owner_id', user.id).eq('status', 'active').order('created_at').limit(3)
  let contactsQ = supabase.from('contacts').select('*').eq('owner_id', user.id).in('stage', ['hot', 'warm']).order('last_contact_date', { ascending: false }).limit(5)
  if (viewName) {
    tasksQ = tasksQ.contains('view_tags', [viewName])
    goalsQ = goalsQ.contains('view_tags', [viewName])
    contactsQ = contactsQ.contains('view_tags', [viewName])
  }

  const [
    { data: brands },
    { data: tasks },
    { data: goals },
    { data: contacts },
    { data: profile },
    { data: flags },
    { data: agenda },
  ] = await Promise.all([
    supabase.from('brands').select('*').eq('owner_id', user.id).eq('is_active', true).order('sort_order'),
    tasksQ,
    goalsQ,
    contactsQ,
    supabase.from('user_profile').select('*').eq('user_id', user.id).single(),
    supabase.from('ea_flags').select('*').eq('owner_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(3),
    supabase.from('ea_agenda').select('*').eq('owner_id', user.id).eq('is_pinned', true).order('priority').limit(4),
  ])

  const totalMrr = (brands || []).reduce((s, b) => s + b.mrr_pence, 0)
  const totalPipeline = (brands || []).reduce((s, b) => s + b.pipeline_value_pence, 0)
  const urgentTasks = (tasks || []).filter(t => t.column_key === 'urgent')
  const todayTasks = (tasks || []).filter(t => t.column_key === 'today')

  const card = (children: React.ReactNode, span = 1) => (
    <div style={{
      background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px',
      padding:'16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)',
      gridColumn: `span ${span}`
    }}>{children}</div>
  )
  const label = (t: string) => (
    <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', marginBottom:'10px' }}>{t}</div>
  )

  const stageColor = (s: string) => ({ hot:'#DC2626', warm:'#B45309', cold:'#6B6B7A', client:'#059669' })[s] || '#6B6B7A'
  const stageBg   = (s: string) => ({ hot:'rgba(220,38,38,.08)', warm:'rgba(180,83,9,.08)', cold:'var(--surface-2)', client:'var(--accent-soft)' })[s] || 'var(--surface-2)'

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title={`Good morning${profile?.display_name ? `, ${profile.display_name}` : ''} ·`}
        subtitle={viewName ? `Overview · ${viewName}` : new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
      />
      <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:'10px', alignContent:'start' }}>

          {/* Stats strip */}
          {card(
            <div style={{ display:'flex', gap:0 }}>
              {[
                { label:'Total MRR', value: totalMrr ? pence(totalMrr) : '—', sub: `${brands?.length || 0} brands` },
                { label:'ARR run rate', value: totalMrr ? pence(totalMrr * 12) : '—', sub: 'annually' },
                { label:'Pipeline', value: totalPipeline ? pence(totalPipeline) : '—', sub: 'active deals' },
                { label:'Hot leads', value: String((contacts || []).filter(c => c.stage === 'hot').length), sub: 'need action' },
              ].map((s, i, arr) => (
                <div key={s.label} style={{ flex:1, padding:'0 20px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  {label(s.label)}
                  <div style={{ fontSize:'22px', fontWeight:700, color:'var(--text)', letterSpacing:'-.5px' }}>{s.value}</div>
                  <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{s.sub}</div>
                </div>
              ))}
            </div>, 12
          )}

          {/* Active goals */}
          {card(
            <>
              {label('Active goals')}
              {goals && goals.length > 0 ? goals.map(g => (
                <div key={g.id} style={{ marginBottom:'14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
                    <span style={{ fontWeight:600, color:'var(--text)' }}>{g.title}</span>
                    <span style={{ color:'var(--accent)', fontWeight:700 }}>{g.progress_pct}%</span>
                  </div>
                  <div style={{ height:'4px', background:'var(--border-mid)', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${g.progress_pct}%`, background:'var(--accent)', borderRadius:'2px' }} />
                  </div>
                  {g.target_date && <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'4px' }}>Target: {g.target_date}</div>}
                </div>
              )) : (
                <EmptyState label="No active goals" hint="Add a goal to track your progress" />
              )}
              <Link href="/studio/goals" style={{ fontSize:'11px', color:'var(--accent)', fontWeight:600 }}>Manage goals →</Link>
            </>, 5
          )}

          {/* Pinned EA agenda */}
          {card(
            <>
              {label('EA notes — pinned')}
              {agenda && agenda.length > 0 ? agenda.map(a => (
                <div key={a.id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:'12px' }}>
                  <div style={{ fontWeight:600, color:'var(--text)', marginBottom:'2px' }}>{a.title}</div>
                  {a.body && <div style={{ color:'var(--muted)', fontSize:'11px', lineHeight:1.5 }}>{a.body.slice(0, 120)}{a.body.length > 120 ? '…' : ''}</div>}
                  <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'4px', textTransform:'uppercase', letterSpacing:'.04em' }}>{a.entry_type} · {a.life_area || 'general'}</div>
                </div>
              )) : (
                <EmptyState label="No pinned notes" hint="EA will pin important observations here" />
              )}
              <Link href="/studio/ea-agenda" style={{ fontSize:'11px', color:'var(--accent)', fontWeight:600, marginTop:'8px', display:'block' }}>Open EA agenda →</Link>
            </>, 4
          )}

          {/* Flags */}
          {card(
            <>
              {label('Active flags')}
              {flags && flags.length > 0 ? flags.map(f => (
                <div key={f.id} style={{ display:'flex', gap:'8px', padding:'7px 0', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background: f.type === 'red' ? 'var(--danger)' : 'var(--accent)', flexShrink:0, marginTop:3 }} />
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)' }}>{f.title}</div>
                    {f.body && <div style={{ fontSize:'11px', color:'var(--muted)' }}>{f.body.slice(0, 80)}</div>}
                  </div>
                </div>
              )) : (
                <EmptyState label="No active flags" hint="EA flags patterns it notices" />
              )}
            </>, 3
          )}

          {/* Tasks */}
          {card(
            <>
              {label('Tasks')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                {[{ key:'urgent', label:'Urgent', color:'var(--danger)', items: urgentTasks }, { key:'today', label:'Today', color:'var(--warn)', items: todayTasks }].map(col => (
                  <div key={col.key}>
                    <div style={{ fontSize:'10px', fontWeight:700, color: col.color, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'6px' }}>{col.label}</div>
                    {col.items.length > 0 ? col.items.map(t => (
                      <div key={t.id} style={{ display:'flex', gap:'7px', alignItems:'flex-start', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:'12px' }}>
                        <div style={{ width:13, height:13, borderRadius:'50%', border:'1.5px solid var(--dim)', flexShrink:0, marginTop:1 }} />
                        <span style={{ color:'var(--text)' }}>{t.text}</span>
                      </div>
                    )) : (
                      <div style={{ fontSize:'11px', color:'var(--dim)' }}>Nothing here</div>
                    )}
                  </div>
                ))}
              </div>
              <Link href="/studio/tasks" style={{ fontSize:'11px', color:'var(--accent)', fontWeight:600, marginTop:'10px', display:'block' }}>All tasks →</Link>
            </>, 6
          )}

          {/* Hot/warm contacts */}
          {card(
            <>
              {label('Pipeline — hot & warm')}
              {contacts && contacts.length > 0 ? contacts.map(c => {
                const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: stageColor(c.stage), color:'#fff', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{initials}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize:'11px', color:'var(--muted)' }}>{c.company || c.role || '—'}</div>
                    </div>
                    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: stageBg(c.stage), color: stageColor(c.stage), fontWeight:600, flexShrink:0 }}>
                      {c.stage.charAt(0).toUpperCase() + c.stage.slice(1)}
                    </span>
                  </div>
                )
              }) : (
                <EmptyState label="No hot/warm contacts" hint="Add contacts to your pipeline" />
              )}
              <Link href="/studio/pipeline" style={{ fontSize:'11px', color:'var(--accent)', fontWeight:600, marginTop:'8px', display:'block' }}>Open pipeline →</Link>
            </>, 6
          )}

        </div>
      </div>
    </div>
  )
}
