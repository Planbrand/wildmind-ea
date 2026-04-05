import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BankSync } from './BankSync'

function pence(n: number) {
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export default async function FinancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [
    { data: brands },
    { data: txIn },
    { data: txOut },
    { data: bankConn },
  ] = await Promise.all([
    supabase.from('brands').select('id,name,color,slug,mrr_pence').eq('owner_id', user.id).order('sort_order'),
    supabase.from('finance_transactions').select('*').eq('owner_id', user.id).eq('direction', 'in').gte('date', monthStart).lte('date', monthEnd).order('date'),
    supabase.from('finance_transactions').select('*').eq('owner_id', user.id).eq('direction', 'out').gte('date', monthStart).lte('date', monthEnd).order('date'),
    supabase.from('bank_connections').select('account_name,last_synced').eq('owner_id', user.id).maybeSingle(),
  ])

  const totalMrr = (brands || []).reduce((s, b) => s + (b.mrr_pence || 0), 0)
  const totalIn = (txIn || []).reduce((s, t) => s + (t.amount_pence || 0), 0)
  const totalOut = (txOut || []).reduce((s, t) => s + (t.amount_pence || 0), 0)
  const todayIn = (txIn || []).filter(t => t.date === today).reduce((s, t) => s + t.amount_pence, 0)
  const todayOut = (txOut || []).filter(t => t.date === today).reduce((s, t) => s + t.amount_pence, 0)

  const targetMrr = 3000000
  const progress = totalMrr ? Math.round((totalMrr / targetMrr) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Finances</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </div>
          </div>
          <BankSync
            connected={!!bankConn}
            accountName={bankConn?.account_name || null}
            lastSynced={bankConn?.last_synced || null}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'MRR', value: pence(totalMrr), sub: `Target £30k · ${progress}%`, color: '#16a34a' },
            { label: 'In this month', value: pence(totalIn), sub: todayIn ? `${pence(todayIn)} today` : 'Nothing today', color: '#16a34a' },
            { label: 'Out this month', value: pence(totalOut), sub: todayOut ? `${pence(todayOut)} today` : 'Nothing today', color: '#dc2626' },
            { label: 'Net this month', value: pence(totalIn - totalOut), sub: totalIn - totalOut >= 0 ? 'Positive' : 'Negative', color: totalIn - totalOut >= 0 ? '#16a34a' : '#dc2626' },
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
                  <span style={{ fontSize: '12px', fontWeight: 700, color: b.mrr_pence ? '#16a34a' : 'var(--dim)' }}>
                    {b.mrr_pence ? pence(b.mrr_pence) : '£0'}
                  </span>
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
              <div style={{ fontSize: '12px', color: 'var(--dim)' }}>No income this month — connect bank to sync</div>
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
              <div style={{ fontSize: '12px', color: 'var(--dim)' }}>No expenses this month — connect bank to sync</div>
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
      </div>
    </div>
  )
}
