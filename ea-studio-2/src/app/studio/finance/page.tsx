import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'

type Brand = {
  id: string
  name: string
  color: string | null
  mrr_pence: number
  pipeline_value_pence: number
  owner_id: string
}

type FinanceRecord = {
  id: string
  record_month: string   // e.g. "2024-01-01"
  mrr_pence: number
  revenue_pence: number
  expenses_pence: number
  owner_id: string
}

function pence(n: number | null | undefined) {
  if (!n) return '£0'
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000)    return '£' + Math.round(p / 1000).toLocaleString() + 'k'
  return '£' + p.toLocaleString()
}

function formatMonth(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { month:'short', year:'2-digit' })
}

const label = (t: string) => (
  <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--dim)', marginBottom:'6px' }}>{t}</div>
)

export default async function FinancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: brands }, { data: records }] = await Promise.all([
    supabase.from('brands').select('*').eq('owner_id', user.id).eq('is_active', true).order('sort_order'),
    supabase.from('finance_records').select('*').eq('owner_id', user.id).order('record_month', { ascending: false }).limit(7),
  ])

  const allBrands  = (brands as Brand[])         || []
  const allRecords = (records as FinanceRecord[]) || []

  // Reverse so chart reads oldest → newest
  const chartRecords = [...allRecords].reverse()

  const totalMrr      = allBrands.reduce((s, b) => s + (b.mrr_pence || 0), 0)
  const totalArr      = totalMrr * 12
  const totalPipeline = allBrands.reduce((s, b) => s + (b.pipeline_value_pence || 0), 0)

  // Chart: relative bar heights based on mrr_pence
  const maxMrr = chartRecords.length > 0 ? Math.max(...chartRecords.map(r => r.mrr_pence || 0)) : 1

  const statCard = (lbl: string, value: string, sub: string) => (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
      padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,.04)',
    }}>
      {label(lbl)}
      <div style={{ fontSize:'24px', fontWeight:800, color:'var(--text)', letterSpacing:'-.5px', marginBottom:'2px' }}>{value}</div>
      <div style={{ fontSize:'11px', color:'var(--muted)' }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="Finance"
        subtitle="Revenue, pipeline & brand breakdown"
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:'12px', alignItems:'start' }}>

          {/* Stat cards — span 4 each */}
          <div style={{ gridColumn:'span 4' }}>{statCard('Total MRR', pence(totalMrr), 'monthly recurring revenue')}</div>
          <div style={{ gridColumn:'span 4' }}>{statCard('Total ARR', pence(totalArr), 'annualised run rate')}</div>
          <div style={{ gridColumn:'span 4' }}>{statCard('Total pipeline', pence(totalPipeline), 'across all brands')}</div>

          {/* MRR Chart — span 7 */}
          <div style={{
            gridColumn: 'span 7',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,.04)',
          }}>
            {label('MRR trend (last 7 months)')}
            {chartRecords.length === 0 ? (
              <EmptyState label="No finance records" hint="Add monthly finance records to see trends" />
            ) : (
              <>
                <div style={{ display:'flex', alignItems:'flex-end', gap:'8px', height:'120px', padding:'0 4px' }}>
                  {chartRecords.map((r, i) => {
                    const heightPct = maxMrr > 0 ? ((r.mrr_pence || 0) / maxMrr) * 100 : 0
                    const isLatest  = i === chartRecords.length - 1
                    return (
                      <div key={r.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', height:'100%', justifyContent:'flex-end' }}>
                        <div style={{ fontSize:'9px', color:'var(--muted)', fontWeight:600 }}>
                          {pence(r.mrr_pence)}
                        </div>
                        <div
                          title={`${formatMonth(r.record_month)}: ${pence(r.mrr_pence)}`}
                          style={{
                            width: '100%', borderRadius: '4px 4px 0 0',
                            height: `${Math.max(heightPct, 4)}%`,
                            background: isLatest ? 'var(--accent)' : 'var(--accent-soft)',
                            transition: 'height .3s ease',
                            border: isLatest ? '1.5px solid var(--accent)' : '1px solid var(--border-mid)',
                          }}
                        />
                      </div>
                    )
                  })}
                </div>
                {/* Month labels */}
                <div style={{ display:'flex', gap:'8px', padding:'6px 4px 0', borderTop:'1px solid var(--border)' }}>
                  {chartRecords.map(r => (
                    <div key={r.id} style={{ flex:1, textAlign:'center', fontSize:'9px', color:'var(--dim)', fontWeight:600, letterSpacing:'.04em' }}>
                      {formatMonth(r.record_month)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Brand breakdown — span 5 */}
          <div style={{
            gridColumn: 'span 5',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,.04)',
          }}>
            {label('By brand — MRR')}
            {allBrands.length === 0 ? (
              <EmptyState label="No brands" hint="Add brands to see the breakdown" />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
                {allBrands.map(b => {
                  const sharePct = totalMrr > 0 ? Math.round((b.mrr_pence / totalMrr) * 100) : 0
                  const barColor = b.color || 'var(--accent)'
                  return (
                    <div key={b.id} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'5px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                          <div style={{ width:8, height:8, borderRadius:'50%', background: barColor, flexShrink:0 }} />
                          <span style={{ fontSize:'12px', fontWeight:600, color:'var(--text)' }}>{b.name}</span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <span style={{ fontSize:'12px', fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>
                            {pence(b.mrr_pence)}
                          </span>
                          <span style={{ fontSize:'10px', color:'var(--muted)', minWidth:'30px', textAlign:'right' }}>{sharePct}%</span>
                        </div>
                      </div>
                      {/* Mini bar */}
                      <div style={{ height:'3px', background:'var(--border-mid)', borderRadius:'2px', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${sharePct}%`, background: barColor, borderRadius:'2px' }} />
                      </div>
                      <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'3px' }}>
                        Pipeline: {pence(b.pipeline_value_pence)}
                      </div>
                    </div>
                  )
                })}
                {/* Totals row */}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 2px', marginTop:'4px' }}>
                  <span style={{ fontSize:'12px', fontWeight:700, color:'var(--text)' }}>Total</span>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <span style={{ fontSize:'13px', fontWeight:800, color:'var(--accent)', fontVariantNumeric:'tabular-nums' }}>
                      {pence(totalMrr)}
                    </span>
                    <span style={{ fontSize:'10px', color:'var(--muted)' }}>MRR</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Finance records table — full width */}
          {allRecords.length > 0 && (
            <div style={{
              gridColumn: 'span 12',
              background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
              padding: '16px', boxShadow: '0 1px 2px rgba(0,0,0,.04)',
            }}>
              {label('Recent records')}
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['Month', 'MRR', 'Revenue', 'Expenses', 'Net'].map(h => (
                      <th key={h} style={{
                        fontSize:'10px', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase',
                        color:'var(--dim)', padding:'6px 10px', textAlign: h === 'Month' ? 'left' : 'right',
                        borderBottom:'1px solid var(--border)',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allRecords.map((r, i) => {
                    const net = (r.revenue_pence || 0) - (r.expenses_pence || 0)
                    const isLast = i === allRecords.length - 1
                    const tdBase: React.CSSProperties = {
                      padding:'8px 10px', fontSize:'12px', fontVariantNumeric:'tabular-nums',
                      borderBottom: isLast ? 'none' : '1px solid var(--border)',
                      verticalAlign:'middle',
                    }
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)' }}>
                        <td style={{ ...tdBase, fontWeight:600, color:'var(--text)' }}>{formatMonth(r.record_month)}</td>
                        <td style={{ ...tdBase, textAlign:'right', color:'var(--accent)', fontWeight:600 }}>{pence(r.mrr_pence)}</td>
                        <td style={{ ...tdBase, textAlign:'right', color:'var(--text)' }}>{pence(r.revenue_pence)}</td>
                        <td style={{ ...tdBase, textAlign:'right', color:'var(--muted)' }}>{pence(r.expenses_pence)}</td>
                        <td style={{ ...tdBase, textAlign:'right', color: net >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight:700 }}>
                          {net >= 0 ? '+' : ''}{pence(net)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
