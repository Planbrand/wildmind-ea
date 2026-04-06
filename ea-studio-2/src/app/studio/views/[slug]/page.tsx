import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AddTabButton } from './AddTabButton'
import { ViewChatTab } from './ViewChatTab'
import EmptyState from '@/components/ui/EmptyState'

export default async function ViewPage({ params, searchParams }: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab: activeTabName } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: view } = await supabase
    .from('workspace_views')
    .select('*')
    .eq('owner_id', user.id)
    .eq('slug', slug)
    .single()

  // Optionally fetch section name separately (avoids FK join issues)
  const sectionName = view?.section_id
    ? (await supabase.from('sections').select('name').eq('id', view.section_id).single()).data?.name
    : null

  if (!view) return notFound()

  const { data: tabs } = await supabase
    .from('view_tabs')
    .select('*')
    .eq('view_id', view.id)
    .order('sort_order')

  const allTabs = tabs || []
  const activeTab = allTabs.find(t => t.name === activeTabName) || allTabs[0]

  // Load data based on whether this is a studio view (no filter) or a specific view
  const isStudio = view.is_studio

  const [
    { data: contacts },
    { data: goals },
    { data: dnaFields },
    { data: agenda },
  ] = await Promise.all([
    supabase.from('contacts').select('*').eq('owner_id', user.id)
      .order('stage').limit(100),
    supabase.from('goals').select('*').eq('owner_id', user.id)
      .eq('status', 'active').order('priority').limit(50),
    supabase.from('ea_dna').select('*').eq('owner_id', user.id)
      .is('brand_id', null).order('layer').order('sort_order'),
    supabase.from('ea_agenda').select('*').eq('owner_id', user.id)
      .eq('is_ignored', false).order('priority').order('created_at', { ascending: false }).limit(50),
  ])

  const stageColor = (s: string) => ({ hot: '#DC2626', warm: '#B45309', cold: '#6B6B7A', client: '#059669' })[s] || '#6B6B7A'

  function renderTabContent() {
    if (!activeTab) return <EmptyState label="No tabs" hint="Add a tab using the + button above" />

    switch (activeTab.layout) {
      case 'chat':
        return <ViewChatTab viewId={view.id} viewName={view.name} isStudio={isStudio} />

      case 'list':
        if (activeTab.name === 'DNA Fields') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 720 }}>
              {(dnaFields || []).length === 0
                ? <EmptyState label="No DNA fields" hint="Add fields in EA DNA to see them here" />
                : (dnaFields || []).filter(f => !f.is_ghost).map(f => (
                  <div key={f.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', marginBottom: '4px' }}>{f.field_id}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: f.ea_instruction ? '8px' : '6px' }}>{f.label}</div>
                    {f.ea_instruction && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '8px', padding: '6px 10px', background: 'rgba(5,150,105,.04)', borderRadius: '6px', border: '1px solid rgba(5,150,105,.12)' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', marginRight: '6px' }}>EA</span>{f.ea_instruction}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', color: f.body ? 'var(--text)' : 'var(--dim)', lineHeight: 1.7, fontStyle: f.body ? 'normal' : 'italic' }}>
                      {f.body || 'No content yet'}
                    </div>
                  </div>
                ))
              }
            </div>
          )
        }
        if (activeTab.name === 'Goals') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: 720 }}>
              {(goals || []).length === 0
                ? <EmptyState label="No active goals" hint="Goals drive EA behaviour — create them in each brand" />
                : (goals || []).map(g => (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{g.title}</div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{g.progress_pct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${g.progress_pct}%`, background: 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    {g.target_date && <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '6px' }}>→ {g.target_date}</div>}
                  </div>
                ))
              }
            </div>
          )
        }
        if (activeTab.name === 'EA Agenda') {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: 720 }}>
              {(agenda || []).length === 0
                ? <EmptyState label="No agenda entries" hint="EA adds notes here automatically. Add them from each brand." />
                : (agenda || []).map(a => (
                  <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: a.body ? '4px' : 0 }}>{a.title}</div>
                    {a.body && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{a.body}</div>}
                    {a.deadline_date && <div style={{ fontSize: '10px', color: 'var(--warn)', marginTop: '4px' }}>⏰ {a.deadline_date}</div>}
                  </div>
                ))
              }
            </div>
          )
        }
        return <EmptyState label="Empty tab" hint="This tab has no content yet" />

      case 'table':
        if (activeTab.name === 'Contacts' || activeTab.name === 'Overview') {
          return (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {(contacts || []).length === 0
                ? <div style={{ padding: '40px' }}><EmptyState label="No contacts" hint="Add contacts from the Pipeline section" /></div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                        {['Name', 'Company', 'Stage', 'Email', 'Next action'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(contacts || []).map(c => (
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
                )
              }
            </div>
          )
        }
        return <EmptyState label="Empty tab" hint="This tab has no content configured yet" />

      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--dim)', fontSize: '13px' }}>
            {activeTab.layout} layout — coming soon
          </div>
        )
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {view.icon && <span style={{ fontSize: '16px' }}>{view.icon}</span>}
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: view.color, flexShrink: 0 }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{view.name}</div>
          {sectionName && (
            <span style={{ fontSize: '11px', color: 'var(--dim)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '20px' }}>
              {sectionName}
            </span>
          )}
          {view.is_studio && (
            <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
              Studio — no filters
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', overflowX: 'auto' }}>
          {allTabs.map(t => (
            <Link key={t.id} href={`/studio/views/${slug}?tab=${encodeURIComponent(t.name)}`} style={{
              padding: '5px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: activeTab?.id === t.id ? 600 : 400,
              color: activeTab?.id === t.id ? 'var(--text)' : 'var(--muted)',
              background: activeTab?.id === t.id ? 'var(--bg)' : 'transparent',
              border: activeTab?.id === t.id ? '1px solid var(--border)' : '1px solid transparent',
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}>{t.name}</Link>
          ))}
          <AddTabButton viewId={view.id} slug={slug} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {renderTabContent()}
      </div>
    </div>
  )
}
