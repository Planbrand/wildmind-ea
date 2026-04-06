import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'
import { DnaEditor } from './DnaEditor'
import { AgendaTab } from './AgendaTab'
import { GoalsTab } from './GoalsTab'

function pence(n: number) {
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export default async function BrandPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab = 'overview' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('owner_id', user.id)
    .eq('slug', slug)
    .single()

  if (!brand) return notFound()

  const [
    { data: dnaFields },
    { data: agenda },
    { data: contacts },
    { data: goals },
    { data: allBrands },
  ] = await Promise.all([
    supabase.from('ea_dna').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('layer').order('sort_order'),
    supabase.from('ea_agenda').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('priority').order('created_at', { ascending: false }),
    supabase.from('contacts').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('stage').limit(50),
    supabase.from('goals').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).eq('status', 'active').order('priority'),
    supabase.from('brands').select('id, name, color').eq('owner_id', user.id).eq('is_active', true),
  ])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'dna', label: 'DNA Fields' },
    { key: 'agenda', label: `EA Agenda${agenda?.length ? ` (${agenda.length})` : ''}` },
    { key: 'contacts', label: `Contacts${contacts?.length ? ` (${contacts.length})` : ''}` },
    { key: 'goals', label: `Goals${goals?.length ? ` (${goals.length})` : ''}` },
  ]

  const stageColor = (s: string) => ({ hot: '#DC2626', warm: '#B45309', cold: '#6B6B7A', client: '#059669' })[s] || '#6B6B7A'

  const topGoal = goals?.[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{brand.name}</div>
          {brand.description && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{brand.description}</div>}
          {topGoal && (
            <div style={{ fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,.1)', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
              ⭐ {topGoal.title}
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
              MRR: <strong style={{ color: 'var(--text)' }}>{brand.mrr_pence ? pence(brand.mrr_pence) : '—'}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
              Pipeline: <strong style={{ color: 'var(--text)' }}>{brand.pipeline_value_pence ? pence(brand.pipeline_value_pence) : '—'}</strong>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map(t => (
            <Link key={t.key} href={`/studio/brands/${slug}?tab=${t.key}`} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              background: tab === t.key ? 'var(--bg)' : 'transparent',
              border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
              textDecoration: 'none',
            }}>{t.label}</Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* About */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={sectionLabel}>About</div>
              {[
                ['Slug', brand.slug],
                ['Main inbox', brand.main_inbox || '—'],
                ['Website', brand.website || '—'],
                ['Daily capacity', brand.daily_capacity + ' emails'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>
            {/* Top goal */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={sectionLabel}>North Star goal</div>
              {goals && goals.length > 0 ? goals.slice(0, 3).map(g => (
                <div key={g.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>{g.title}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{g.progress_pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border-mid)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${g.progress_pct}%`, background: 'var(--accent)', borderRadius: '2px' }} />
                  </div>
                </div>
              )) : <EmptyState label="No active goals" hint="Goals drive EA's behaviour for this brand" />}
            </div>
            {/* Contacts preview */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={sectionLabel}>Top contacts</div>
              {contacts && contacts.slice(0, 5).length > 0 ? contacts.slice(0, 5).map(c => {
                const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: stageColor(c.stage), color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{c.company || c.role || '—'}</div>
                    </div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${stageColor(c.stage)}15`, color: stageColor(c.stage), fontWeight: 600 }}>{c.stage}</span>
                  </div>
                )
              }) : <EmptyState label="No contacts" hint="Contacts linked to this brand appear here" />}
            </div>
            {/* EA Agenda preview */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={sectionLabel}>EA agenda — latest</div>
              {agenda && agenda.slice(0, 4).length > 0
                ? agenda.slice(0, 4).map(a => (
                  <div key={a.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{a.title}</div>
                    {a.deadline_date && <div style={{ fontSize: '10px', color: 'var(--warn)', marginTop: '2px' }}>⏰ {a.deadline_date}</div>}
                  </div>
                ))
                : <EmptyState label="No agenda entries" hint="EA will add notes and observations here" />}
            </div>
          </div>
        )}

        {/* ── DNA FIELDS ── */}
        {tab === 'dna' && (
          <DnaEditor fields={dnaFields || []} brandId={brand.id} ownerId={user.id} slug={slug} />
        )}

        {/* ── AGENDA ── */}
        {tab === 'agenda' && (
          <AgendaTab entries={agenda || []} brandId={brand.id} ownerId={user.id} slug={slug} />
        )}

        {/* ── CONTACTS ── */}
        {tab === 'contacts' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            {contacts && contacts.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    {['Name', 'Company', 'Stage', 'Email', 'Next action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--muted)' }}>{c.company || '—'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${stageColor(c.stage)}15`, color: stageColor(c.stage), fontWeight: 600 }}>{c.stage}</span>
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--muted)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--muted)' }}>{c.next_action || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <EmptyState label={`No contacts for ${brand.name}`} hint="Contacts linked to this brand appear here" />
              </div>
            )}
          </div>
        )}

        {/* ── GOALS ── */}
        {tab === 'goals' && (
          <GoalsTab
            goals={goals || []}
            brandId={brand.id}
            ownerId={user.id}
            slug={slug}
            allBrands={(allBrands || []).map(b => ({ id: b.id, name: b.name, color: b.color }))}
          />
        )}

      </div>
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '.08em',
  textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '12px',
}
