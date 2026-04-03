import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'

const LIFE_AREAS = ['health','mind','relationships','finance','brands','purpose','fun'] as const
const AREA_ICONS: Record<string,string> = { health:'♥', mind:'◈', relationships:'◉', finance:'£', brands:'⬡', purpose:'✦', fun:'♪' }

export default async function LifePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const card = (children: React.ReactNode) => (
    <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)', marginBottom:'10px' }}>
      {children}
    </div>
  )
  const lbl = (t: string) => (
    <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', marginBottom:'10px' }}>{t}</div>
  )
  const row = (label: string, value: string | null | undefined) => value ? (
    <div style={{ display:'flex', gap:'12px', padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:'12px' }}>
      <span style={{ color:'var(--dim)', width:140, flexShrink:0 }}>{label}</span>
      <span style={{ color:'var(--text)' }}>{value}</span>
    </div>
  ) : null

  const matrix = profile?.life_matrix as Record<string, { status?: string; focus?: string; score?: number }> | null

  const editBtn = (
    <Link href="/studio/life/edit" style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--bg)', color:'var(--muted)', border:'1px solid var(--border)', textDecoration:'none' }}>
      Edit profile
    </Link>
  )

  if (!profile?.identity_core && !profile?.archetype) {
    return (
      <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
        <PanelHeader title="Life" subtitle="Your full life context — EA learns from this" action={editBtn} />
        <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
          <EmptyState icon="♡" label="Your life profile is empty" hint="Fill it in so EA can understand you as a whole person — not just as a founder." action={editBtn} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="Life" subtitle="Your full life context — EA learns from this" action={editBtn} />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', alignContent:'start' }}>

          {/* Identity */}
          <div>
            {card(<>
              {lbl('Identity')}
              {profile.archetype && <div style={{ display:'inline-block', background:'var(--accent-soft)', color:'var(--accent)', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', marginBottom:'10px' }}>{profile.archetype}</div>}
              {profile.identity_core && <p style={{ fontSize:'13px', color:'var(--text)', lineHeight:1.7, marginBottom:'10px' }}>{profile.identity_core}</p>}
              {profile.one_sentence && <p style={{ fontSize:'12px', color:'var(--muted)', fontStyle:'italic', lineHeight:1.6 }}>"{profile.one_sentence}"</p>}
              {profile.mission_statement && <>
                <div style={{ height:'1px', background:'var(--border)', margin:'12px 0' }} />
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'.06em' }}>Mission</div>
                <p style={{ fontSize:'12px', color:'var(--text)', lineHeight:1.6 }}>{profile.mission_statement}</p>
              </>}
              {profile.core_values && profile.core_values.length > 0 && <>
                <div style={{ height:'1px', background:'var(--border)', margin:'12px 0' }} />
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.06em' }}>Core values</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {profile.core_values.map((v: string) => (
                    <span key={v} style={{ fontSize:'11px', padding:'3px 9px', borderRadius:'20px', background:'var(--surface-2)', color:'var(--muted)' }}>{v}</span>
                  ))}
                </div>
              </>}
            </>)}

            {card(<>
              {lbl('Patterns EA has learned')}
              {row('Thinking style', profile.thinking_style)}
              {row('Decision style', profile.decision_style)}
              {row('Energy pattern', profile.energy_pattern)}
              {row('Stress signals', profile.stress_signals)}
              {row('Drift patterns', profile.drift_patterns)}
              {row('Growth edge', profile.growth_edge)}
              {!profile.thinking_style && !profile.decision_style && <div style={{ fontSize:'12px', color:'var(--dim)' }}>EA will fill these in as it learns your patterns.</div>}
            </>)}

            {card(<>
              {lbl('Physical & context')}
              {row('Sleep target', profile.sleep_target_hrs ? `${profile.sleep_target_hrs} hrs` : null)}
              {row('Exercise', profile.exercise_routine)}
              {row('Current physical', profile.current_physical)}
              {row('Relationship', profile.relationship_status)}
              {row('Living situation', profile.living_situation)}
              {row('Biggest constraint', profile.biggest_constraint)}
            </>)}
          </div>

          {/* Life matrix */}
          <div>
            {card(<>
              {lbl('Life matrix')}
              {LIFE_AREAS.map(area => {
                const data = matrix?.[area] || {}
                const score = data.score ?? 5
                return (
                  <div key={area} style={{ marginBottom:'14px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                      <div style={{ display:'flex', gap:'7px', alignItems:'center' }}>
                        <span style={{ fontSize:'12px', color:'var(--dim)' }}>{AREA_ICONS[area]}</span>
                        <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text)', textTransform:'capitalize' }}>{area}</span>
                      </div>
                      <span style={{ fontSize:'11px', fontWeight:700, color:'var(--accent)' }}>{score}/10</span>
                    </div>
                    <div style={{ height:'4px', background:'var(--border-mid)', borderRadius:'2px', overflow:'hidden', marginBottom:'4px' }}>
                      <div style={{ height:'100%', width:`${score * 10}%`, background: score >= 7 ? 'var(--accent)' : score >= 4 ? 'var(--warn)' : 'var(--danger)', borderRadius:'2px' }} />
                    </div>
                    {data.status && <div style={{ fontSize:'11px', color:'var(--muted)' }}>{data.status}</div>}
                    {data.focus && <div style={{ fontSize:'10px', color:'var(--dim)', fontStyle:'italic' }}>Focus: {data.focus}</div>}
                  </div>
                )
              })}
            </>)}
          </div>

        </div>
      </div>
    </div>
  )
}
