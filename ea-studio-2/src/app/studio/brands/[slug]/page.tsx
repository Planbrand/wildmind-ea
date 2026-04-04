import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'

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
  ] = await Promise.all([
    supabase.from('ea_dna').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('layer').order('sort_order'),
    supabase.from('ea_agenda').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('priority').limit(20),
    supabase.from('contacts').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).order('stage').limit(30),
    supabase.from('goals').select('*').eq('owner_id', user.id).eq('brand_id', brand.id).eq('status', 'active').limit(5),
  ])

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'dna', label: 'DNA Fields' },
    { key: 'agenda', label: 'EA Agenda' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'goals', label: 'Goals' },
  ]

  const card = (children: React.ReactNode) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      {children}
    </div>
  )

  const label = (t: string) => (
    <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '12px' }}>{t}</div>
  )

  const stageColor = (s: string) => ({ hot: '#DC2626', warm: '#B45309', cold: '#6B6B7A', client: '#059669' })[s] || '#6B6B7A'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: brand.color, flexShrink: 0 }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{brand.name}</div>
          {brand.description && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{brand.description}</div>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
              MRR: <strong style={{ color: 'var(--text)' }}>{brand.mrr_pence ? pence(brand.mrr_pence) : '—'}</strong>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>
              Pipeline: <strong style={{ color: 'var(--text)' }}>{brand.pipeline_value_pence ? pence(brand.pipeline_value_pence) : '—'}</strong>
            </div>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map(t => (
            <Link key={t.key} href={`/studio/brands/${slug}?tab=${t.key}`} style={{
              padding: '6px 14px', borderRadius: '7px', fontSize: '13px', fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? 'var(--text)' : 'var(--muted)',
              background: tab === t.key ? 'var(--bg)' : 'transparent',
              border: tab === t.key ? '1px solid var(--border)' : '1px solid transparent',
            }}>{t.label}</Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {card(<>
              {label('About this brand')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  ['Slug', brand.slug],
                  ['Main inbox', brand.main_inbox || '—'],
                  ['Website', brand.website || '—'],
                  ['Daily capacity', brand.daily_capacity + ' emails'],
                  ['Inbox count', brand.inbox_count + ' inboxes'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </>)}
            {card(<>
              {label('Active goals')}
              {goals && goals.length > 0 ? goals.map(g => (
                <div key={g.id} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 600 }}>{g.title}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{g.progress_pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--border-mid)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${g.progress_pct}%`, background: 'var(--accent)', borderRadius: '2px' }} />
                  </div>
                </div>
              )) : <EmptyState label="No active goals" hint="Goals linked to this brand appear here" />}
            </>)}
            {card(<>
              {label('Top contacts')}
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
            </>)}
            {card(<>
              {label('EA Agenda — pinned')}
              {agenda && agenda.filter(a => a.is_pinned).slice(0, 4).length > 0
                ? agenda.filter(a => a.is_pinned).slice(0, 4).map(a => (
                  <div key={a.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{a.title}</div>
                    {a.body && <div style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '2px' }}>{a.body.slice(0, 100)}</div>}
                  </div>
                ))
                : <EmptyState label="No pinned notes" hint="EA will add observations for this brand here" />}
            </>)}
          </div>
        )}

        {/* ── DNA FIELDS ── */}
        {tab === 'dna' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 700 }}>
            {dnaFields && dnaFields.length > 0 ? dnaFields.map(f => (
              <div key={f.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--dim)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 7px' }}>{f.field_id}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                  {f.locked && <span style={{ fontSize: '10px', color: 'var(--dim)', marginLeft: 'auto' }}>🔒 locked</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>{f.body || <span style={{ color: 'var(--dim)', fontStyle: 'italic' }}>Not filled in yet</span>}</div>
              </div>
            )) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No DNA fields for {brand.name} yet</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>Brand DNA fields let EA understand this business deeply — its positioning, voice, goals, and constraints.</div>
                <div style={{ fontSize: '12px', color: 'var(--dim)' }}>Tell EA to build DNA fields for {brand.name} in the Ask EA chat.</div>
              </div>
            )}
          </div>
        )}

        {/* ── AGENDA ── */}
        {tab === 'agenda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: 700 }}>
            {agenda && agenda.length > 0 ? agenda.map(a => (
              <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {a.is_pinned && <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>📌</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{a.title}</div>
                    {a.body && <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{a.body}</div>}
                    <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>{a.entry_type} · {a.life_area || 'general'}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No EA agenda entries for {brand.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>EA will add observations, notes, and insights for this brand as you use it.</div>
              </div>
            )}
          </div>
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
                <EmptyState label={`No contacts for ${brand.name}`} hint="Contacts linked to this brand will appear here" />
              </div>
            )}
          </div>
        )}

        {/* ── GOALS ── */}
        {tab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 700 }}>
            {goals && goals.length > 0 ? goals.map(g => (
              <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{g.title}</div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>{g.progress_pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--border-mid)', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ height: '100%', width: `${g.progress_pct}%`, background: 'var(--accent)', borderRadius: '3px' }} />
                </div>
                {g.description && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>{g.description}</div>}
                {g.target_date && <div style={{ fontSize: '11px', color: 'var(--dim)' }}>Target: {g.target_date}</div>}
              </div>
            )) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <EmptyState label={`No active goals for ${brand.name}`} hint="Goals linked to this brand will appear here" />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
