import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BankSync } from './BankSync'
import { DateFilter } from './DateFilter'
import { AddExpenseButton } from './AddExpenseButton'
import { deleteExpense } from './actions'

function pence(n: number) {
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

function getDateRange(range: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  switch (range) {
    case 'last_month': return { from: new Date(y, m - 1, 1).toISOString().split('T')[0], to: new Date(y, m, 0).toISOString().split('T')[0] }
    case 'last_3_months': return { from: new Date(y, m - 3, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] }
    case 'last_6_months': return { from: new Date(y, m - 6, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] }
    case 'this_year': return { from: `${y}-01-01`, to: `${y}-12-31` }
    default: return { from: new Date(y, m, 1).toISOString().split('T')[0], to: new Date(y, m + 1, 0).toISOString().split('T')[0] }
  }
}

const FREQ_LABEL: Record<string, string> = { one_time: 'One time', monthly: 'Monthly', yearly: 'Yearly' }

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tab?: string; view?: string }>
}) {
  const sp = await searchParams
  const range = sp.range || 'this_month'
  const tab = sp.tab || 'overview'
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const { from, to } = getDateRange(range)
  const today = new Date().toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let txInQ = supabase.from('finance_transactions').select('*').eq('owner_id', user.id).eq('direction', 'in').gte('date', from).lte('date', to).order('date', { ascending: false })
  let txOutQ = supabase.from('finance_transactions').select('*').eq('owner_id', user.id).eq('direction', 'out').gte('date', from).lte('date', to).order('date', { ascending: false })
  let expQ = supabase.from('expenses').select('*').eq('owner_id', user.id).gte('date', from).lte('date', to).order('date', { ascending: false })

  if (viewName) {
    txInQ = txInQ.contains('view_tags', [viewName])
    txOutQ = txOutQ.contains('view_tags', [viewName])
    expQ = expQ.contains('view_tags', [viewName])
  }

  const [
    { data: brands },
    { data: txIn },
    { data: txOut },
    { data: bankConn },
    { data: expenses },
  ] = await Promise.all([
    supabase.from('brands').select('id,name,color,slug,mrr_pence').eq('owner_id', user.id).order('sort_order'),
    txInQ,
    txOutQ,
    supabase.from('bank_connections').select('account_name,last_synced').eq('owner_id', user.id).maybeSingle(),
    expQ,
  ])

  const totalMrr = (brands || []).reduce((s, b) => s + (b.mrr_pence || 0), 0)
  const totalIn = (txIn || []).reduce((s, t) => s + (t.amount_pence || 0), 0)
  const totalOut = (txOut || []).reduce((s, t) => s + (t.amount_pence || 0), 0)
  const totalExpenses = (expenses || []).reduce((s, e) => s + (e.amount_pence || 0), 0)
  const todayIn = (txIn || []).filter(t => t.date === today).reduce((s, t) => s + t.amount_pence, 0)
  const todayOut = (txOut || []).filter(t => t.date === today).reduce((s, t) => s + t.amount_pence, 0)
  const targetMrr = 3000000
  const progress = totalMrr ? Math.round((totalMrr / targetMrr) * 100) : 0

  const tlParams = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TRUELAYER_CLIENT_ID!,
    redirect_uri: process.env.TRUELAYER_REDIRECT_URI!,
    scope: 'info accounts balance transactions offline_access',
    providers: 'mock',
  })
  const authUrl = `https://auth.truelayer-sandbox.com/?${tlParams}`

  const brandMap = Object.fromEntries((brands || []).map(b => [b.id, b]))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Finances</div>
          <BankSync connected={!!bankConn} accountName={bankConn?.account_name || null} lastSynced={bankConn?.last_synced || null} authUrl={authUrl} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'expenses', label: `Expenses${(expenses || []).length > 0 ? ` (${expenses!.length})` : ''}` },
          ].map(t => (
            <Link key={t.key} href={`/studio/finance?tab=${t.key}&range=${range}`} style={{
              padding: '6px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? 'var(--accent)' : 'transparent',
              color: tab === t.key ? '#fff' : 'var(--muted)',
              textDecoration: 'none', border: '1px solid ' + (tab === t.key ? 'var(--accent)' : 'var(--border)'),
            }}>
              {t.label}
            </Link>
          ))}
        </div>

        <DateFilter active={range} tab={tab} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {tab === 'overview' && (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {[
                { label: 'MRR', value: pence(totalMrr), sub: `Target £30k · ${progress}%`, color: '#16a34a' },
                { label: 'In this period', value: pence(totalIn), sub: todayIn ? `${pence(todayIn)} today` : 'Nothing today', color: '#16a34a' },
                { label: 'Out this period', value: pence(totalOut), sub: todayOut ? `${pence(todayOut)} today` : 'Nothing today', color: '#dc2626' },
                { label: 'Net this period', value: pence(totalIn - totalOut), sub: totalIn - totalOut >= 0 ? 'Positive' : 'Negative', color: totalIn - totalOut >= 0 ? '#16a34a' : '#dc2626' },
              ].map(k => (
                <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', borderTop: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '4px' }}>{k.label}</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-.5px', marginBottom: '2px' }}>{k.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Target progress */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>£30k/month target — June 2026</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{progress}%</div>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', width: `${Math.min(progress, 100)}%`, background: 'var(--accent)', borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--dim)' }}>
                Current MRR: {pence(totalMrr)} · Gap: {pence(Math.max(0, targetMrr - totalMrr))} · House fund target: Jan 2027
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Brand MRR */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px' }}>MRR by brand</div>
                {(brands || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--dim)' }}>No brands yet</div>
                ) : (
                  brands!.map(b => (
                    <Link key={b.id} href={`/studio/brands/${b.slug}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: '12px', color: 'var(--text)' }}>{b.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: b.mrr_pence ? '#16a34a' : 'var(--dim)' }}>{b.mrr_pence ? pence(b.mrr_pence) : '£0'}</span>
                    </Link>
                  ))
                )}
              </div>

              {/* Money in */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>💰 Coming in</div>
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>{pence(totalIn)}</span>
                </div>
                {(txIn || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--dim)' }}>No income — try a wider date range</div>
                ) : (
                  (txIn || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--text)', fontWeight: 500 }}>{t.description}</div>
                        <div style={{ color: 'var(--dim)', fontSize: '10px' }}>{t.date}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#16a34a', flexShrink: 0 }}>{pence(t.amount_pence)}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Money out */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>💸 Going out</div>
                  <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>{pence(totalOut)}</span>
                </div>
                {(txOut || []).length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'var(--dim)' }}>No expenses — try a wider date range</div>
                ) : (
                  (txOut || []).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                      <div>
                        <div style={{ color: 'var(--text)', fontWeight: 500 }}>{t.description}</div>
                        <div style={{ color: 'var(--dim)', fontSize: '10px' }}>{t.date}</div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#dc2626', flexShrink: 0 }}>{pence(t.amount_pence)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {tab === 'expenses' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Expenses</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{pence(totalExpenses)} total · {(expenses || []).length} entries</div>
              </div>
              <AddExpenseButton brands={brands || []} />
            </div>

            {(expenses || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dim)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                No expenses in this period. Click + Add expense to log one.
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Merchant', 'Description', 'Frequency', 'Brands', 'Amount', ''].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(expenses || []).map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{e.date}</td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{e.merchant}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--muted)' }}>{FREQ_LABEL[e.frequency] || e.frequency}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {(e.brand_ids || []).length === 0 ? (
                              <span style={{ fontSize: '11px', color: 'var(--dim)' }}>—</span>
                            ) : (
                              (e.brand_ids || []).map((bid: string) => {
                                const b = brandMap[bid]
                                return b ? (
                                  <span key={bid} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: b.color + '18', color: b.color }}>
                                    {b.name}
                                  </span>
                                ) : null
                              })
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>{pence(e.amount_pence)}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <form action={async () => { 'use server'; await deleteExpense(e.id) }}>
                            <button type="submit" style={{ fontSize: '11px', color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
