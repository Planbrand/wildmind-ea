import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AddDealButton } from './AddDealButton'
import { DealMenu } from './DealMenu'

type Deal = {
  id: string
  stage: string
  value_pence: number
  call_date: string | null
  notes: string | null
  updated_at: string
  brands: { name: string; color: string; slug: string } | null
  contacts: { name: string; company: string | null } | null
  leads: { name: string; company: string | null; title: string | null } | null
}

const STAGES = [
  { key: 'replied',       label: 'Replied',        color: '#3b82f6', bg: '#eff6ff' },
  { key: 'call_booked',   label: 'Call booked',    color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'proposal_sent', label: 'Proposal sent',  color: '#f59e0b', bg: '#fffbeb' },
  { key: 'won',           label: 'Won',            color: '#16a34a', bg: '#f0fdf4' },
  { key: 'lost',          label: 'Lost',           color: '#6b7280', bg: '#f3f4f6' },
]

function pence(n: number) {
  if (!n) return '—'
  const p = Math.round(n / 100)
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; view?: string }>
}) {
  const sp = await searchParams
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: brands } = await supabase
    .from('brands').select('id,name,color,slug').order('sort_order')

  let query = supabase
    .from('pipeline_deals')
    .select('*, brands(name,color,slug), contacts(name,company), leads(name,company,title)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (viewName) {
    query = query.contains('view_tags', [viewName])
  }

  const { data: deals } = await query
  const all = (deals || []) as Deal[]

  const totalValue = all.filter(d => d.stage !== 'lost').reduce((s, d) => s + (d.value_pence || 0), 0)
  const wonValue = all.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value_pence || 0), 0)

  function dealName(d: Deal) {
    return d.contacts?.name || d.leads?.name || 'Unknown'
  }
  function dealCompany(d: Deal) {
    return d.contacts?.company || d.leads?.company || null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Pipeline</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {all.filter(d => d.stage !== 'lost').length} active deals ·{' '}
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{pence(wonValue)} won</span>
              {totalValue > 0 && <> · {pence(totalValue)} total</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AddDealButton ownerId={user.id} viewName={viewName} />
          </div>
        </div>

        {/* Brand filter — only shown when no view filter is active */}
        {!viewName && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
            <Link href="/studio/pipeline" style={chip(!sp.brand)}>All brands</Link>
            {brands?.map(b => (
              <Link key={b.id} href={`/studio/pipeline?brand=${b.slug}`} style={chip(sp.brand === b.slug)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block' }} />
                {b.name}
              </Link>
            ))}
          </div>
        )}
        {viewName && (
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Showing deals tagged <strong style={{ color: 'var(--text)' }}>{viewName}</strong>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', height: '100%', minWidth: 'max-content' }}>
          {STAGES.map(stage => {
            const stageDeals = all.filter(d => d.stage === stage.key)
            const stageValue = stageDeals.reduce((s, d) => s + (d.value_pence || 0), 0)

            return (
              <div key={stage.key} style={{ width: 240, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{stage.label}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 6px' }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color }}>{pence(stageValue)}</span>
                  )}
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stageDeals.map(d => {
                    const brand = d.brands as { name: string; color: string } | null
                    const isCallSoon = d.stage === 'call_booked' && d.call_date &&
                      new Date(d.call_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)

                    return (
                      <Link key={d.id} href={`/studio/pipeline/${d.id}`} style={{
                        display: 'block', background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${stage.color}`,
                        borderRadius: '10px', padding: '12px 14px',
                        textDecoration: 'none', position: 'relative',
                        boxShadow: isCallSoon ? `0 0 0 2px ${stage.color}44` : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                            {dealName(d)}
                          </div>
                          <DealMenu dealId={d.id} />
                        </div>
                        {dealCompany(d) && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                            {dealCompany(d)}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          {brand && (
                            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: brand.color + '18', color: brand.color }}>
                              {brand.name}
                            </span>
                          )}
                          {d.value_pence > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color, marginLeft: 'auto' }}>
                              {pence(d.value_pence)}
                            </span>
                          )}
                        </div>
                        {d.stage === 'call_booked' && d.call_date && (
                          <div style={{ fontSize: '10px', color: isCallSoon ? '#dc2626' : 'var(--dim)', marginTop: '6px', fontWeight: isCallSoon ? 700 : 400 }}>
                            📅 {new Date(d.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                        {d.notes && (
                          <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.notes}
                          </div>
                        )}
                      </Link>
                    )
                  })}

                  {stageDeals.length === 0 && (
                    <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--dim)', fontSize: '12px', border: '1px dashed var(--border)', borderRadius: '10px' }}>
                      No deals here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function chip(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px', fontWeight: active ? 600 : 400,
    padding: '4px 12px', borderRadius: '20px',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    textDecoration: 'none', whiteSpace: 'nowrap',
    display: 'flex', alignItems: 'center', gap: '5px',
  }
}
