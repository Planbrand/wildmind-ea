import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'

const TYPE_COLOR: Record<string,string> = { inbox:'#059669', followup:'#6366F1', briefing:'#F59E0B', outreach:'#DC2626', custom:'#6B6B7A' }

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: agents } = await supabase.from('agents').select('*, brands(name,color)').eq('owner_id', user.id).order('is_active', { ascending: false }).order('created_at')

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="Agents"
        subtitle="Automation agents running in the background"
        action={
          <button style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>+ Add agent</button>
        }
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {!agents || agents.length === 0 ? (
          <EmptyState icon="⚡" label="No agents yet" hint="Agents handle inbox, follow-ups, briefings, and outreach automatically." />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'10px', alignContent:'start' }}>
            {agents.map((a: any) => (
              <div key={a.id} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderLeft:`3px solid ${a.is_active ? (TYPE_COLOR[a.agent_type]||'var(--accent)') : 'var(--border-mid)'}`, borderRadius:'10px', padding:'16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                  <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)' }}>{a.name}</div>
                  <div style={{ display:'flex', gap:'6px' }}>
                    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: (TYPE_COLOR[a.agent_type]||'#6B6B7A')+'18', color: TYPE_COLOR[a.agent_type]||'#6B6B7A', fontWeight:600 }}>{a.agent_type}</span>
                    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: a.is_active ? 'var(--accent-soft)' : 'var(--surface-2)', color: a.is_active ? 'var(--accent)' : 'var(--dim)', fontWeight:600 }}>{a.is_active ? 'Active' : 'Paused'}</span>
                  </div>
                </div>
                {a.description && <p style={{ fontSize:'12px', color:'var(--muted)', lineHeight:1.5, marginBottom:'10px' }}>{a.description}</p>}
                <div style={{ display:'flex', gap:'14px', fontSize:'11px', color:'var(--dim)' }}>
                  {a.emails_handled > 0 && <span>{a.emails_handled} emails handled</span>}
                  {a.queued_actions > 0 && <span>{a.queued_actions} queued</span>}
                  {a.last_run_at && <span>Last run: {new Date(a.last_run_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' })}</span>}
                </div>
                {a.brands && (
                  <div style={{ marginTop:'8px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background: a.brands.color }} />
                    <span style={{ fontSize:'11px', color:'var(--dim)' }}>{a.brands.name}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Add agent placeholder */}
            <div style={{ background:'transparent', border:'1px dashed var(--border-mid)', borderRadius:'10px', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', cursor:'pointer', minHeight:120 }}>
              <div style={{ fontSize:'24px', color:'var(--dim)' }}>+</div>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--muted)' }}>Add agent</div>
              <div style={{ fontSize:'11px', color:'var(--dim)', textAlign:'center' }}>Outreach, research, pipeline, social</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
