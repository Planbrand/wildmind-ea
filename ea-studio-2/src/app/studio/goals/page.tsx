import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

type Milestone = {
  id: string
  title: string
  is_done: boolean
  goal_id: string
}

type Goal = {
  id: string
  title: string
  goal_type: 'business' | 'personal' | 'health' | 'relationship'
  progress_pct: number
  current_value: number | null
  target_value: number | null
  unit: string | null
  target_date: string | null
  ea_insight: string | null
  status: 'active' | 'paused' | 'completed'
  owner_id: string
  goal_milestones: Milestone[]
}

function goalTypeColor(t: string): string {
  return ({
    business:     'var(--accent)',
    personal:     '#8B5CF6',
    health:       'var(--danger)',
    relationship: '#3B82F6',
  } as Record<string, string>)[t] || 'var(--muted)'
}
function goalTypeBg(t: string): string {
  return ({
    business:     'var(--accent-soft)',
    personal:     'rgba(139,92,246,.1)',
    health:       'rgba(220,38,38,.08)',
    relationship: 'rgba(59,130,246,.1)',
  } as Record<string, string>)[t] || 'var(--surface-2)'
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    active:    { label: 'Active',    color: 'var(--accent)', bg: 'var(--accent-soft)' },
    paused:    { label: 'Paused',    color: 'var(--muted)',  bg: 'var(--surface-2)'  },
    completed: { label: 'Completed', color: 'var(--dim)',    bg: 'var(--surface-2)'  },
  }
  return map[s] || map.paused
}

function formatDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

const label = (t: string) => (
  <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', marginBottom:'8px' }}>{t}</div>
)

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: goals } = await supabase
    .from('goals')
    .select('*, goal_milestones(*)')
    .eq('owner_id', user.id)
    .order('status')
    .order('created_at')

  const all = (goals as Goal[]) || []

  const addBtn = (
    <Link
      href="/studio/goals/new"
      style={{ fontSize:'12px', fontWeight:600, color:'var(--accent)', background:'var(--accent-soft)', border:'none', borderRadius:'6px', padding:'6px 12px', textDecoration:'none', display:'inline-block' }}
    >
      + Add goal
    </Link>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="Goals" subtitle={`${all.filter(g => g.status === 'active').length} active`} action={addBtn} />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {all.length === 0 ? (
          <EmptyState
            icon="🎯"
            label="No goals yet"
            hint="Add your first goal to start tracking progress"
            action={<Link href="/studio/goals/new" style={{ fontSize:'12px', fontWeight:600, color:'var(--accent)', textDecoration:'none' }}>+ Add goal</Link>}
          />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '14px',
            alignItems: 'start',
          }}>
            {all.map(goal => {
              const typeColor = goalTypeColor(goal.goal_type)
              const typeBg    = goalTypeBg(goal.goal_type)
              const status    = statusBadge(goal.status)
              const milestones = goal.goal_milestones || []
              const doneMilestones = milestones.filter(m => m.is_done).length

              return (
                <div
                  key={goal.id}
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '16px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.04)',
                  }}
                >
                  {/* Header row */}
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px', gap:'8px' }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text)', marginBottom:'6px', lineHeight:1.3 }}>
                        {goal.title}
                      </div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        {/* Goal type badge */}
                        <span style={{
                          fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px',
                          background: typeBg, color: typeColor, textTransform:'uppercase', letterSpacing:'.06em',
                        }}>
                          {goal.goal_type}
                        </span>
                        {/* Status badge */}
                        <span style={{
                          fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'10px',
                          background: status.bg, color: status.color, textTransform:'uppercase', letterSpacing:'.06em',
                        }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize:'18px', fontWeight:800, color: typeColor, flexShrink:0, lineHeight:1 }}>
                      {goal.progress_pct ?? 0}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height:'6px', background:'var(--border-mid)', borderRadius:'3px', overflow:'hidden', marginBottom:'10px' }}>
                    <div style={{
                      height:'100%',
                      width: `${Math.min(100, Math.max(0, goal.progress_pct ?? 0))}%`,
                      background: typeColor,
                      borderRadius:'3px',
                      transition: 'width .3s ease',
                    }} />
                  </div>

                  {/* Value + date */}
                  {(goal.current_value != null || goal.target_value != null || goal.target_date) && (
                    <div style={{ display:'flex', gap:'16px', marginBottom:'10px', flexWrap:'wrap' }}>
                      {(goal.current_value != null || goal.target_value != null) && (
                        <div>
                          {label('Progress')}
                          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>
                            {goal.current_value ?? '—'}
                            {goal.target_value != null && <span style={{ color:'var(--muted)', fontWeight:400 }}> / {goal.target_value}</span>}
                            {goal.unit && <span style={{ fontSize:'11px', color:'var(--muted)', marginLeft:'3px' }}>{goal.unit}</span>}
                          </div>
                        </div>
                      )}
                      {goal.target_date && (
                        <div>
                          {label('Target date')}
                          <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text)' }}>{formatDate(goal.target_date)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* EA insight */}
                  {goal.ea_insight && (
                    <div style={{
                      background: 'rgba(5,150,105,.07)',
                      border: '1px solid rgba(5,150,105,.2)',
                      borderRadius: '7px',
                      padding: '8px 10px',
                      marginBottom: '10px',
                    }}>
                      <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--accent)', marginBottom:'4px' }}>EA insight</div>
                      <div style={{ fontSize:'12px', color:'var(--text)', lineHeight:1.55 }}>{goal.ea_insight}</div>
                    </div>
                  )}

                  {/* Milestones */}
                  {milestones.length > 0 && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                        {label('Milestones')}
                        <span style={{ fontSize:'10px', color:'var(--muted)', marginTop:'-8px' }}>{doneMilestones}/{milestones.length}</span>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                        {milestones.map(m => (
                          <div key={m.id} style={{ display:'flex', gap:'7px', alignItems:'flex-start', fontSize:'12px' }}>
                            <div style={{
                              width: 13, height: 13, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                              border: `1.5px solid ${m.is_done ? 'var(--accent)' : 'var(--dim)'}`,
                              background: m.is_done ? 'var(--accent)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {m.is_done && (
                                <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                                  <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span style={{
                              color: m.is_done ? 'var(--dim)' : 'var(--text)',
                              textDecoration: m.is_done ? 'line-through' : 'none',
                              lineHeight: 1.5,
                            }}>
                              {m.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
