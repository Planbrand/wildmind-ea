import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'

type Thread = {
  id: string
  thread_id: string
  subject: string
  from_email: string
  from_name: string | null
  snippet: string | null
  is_read: boolean
  has_draft: boolean
  received_at: string
  inbox: string
  brand_id: string | null
  brands?: { name: string; color: string; slug: string } | null
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; unread?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('email_threads')
    .select('*, brands(name, color, slug)')
    .order('received_at', { ascending: false })
    .limit(200)

  if (sp.brand) {
    // filter by brand slug
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', sp.brand)
      .single()
    if (brand) query = query.eq('brand_id', brand.id)
  }

  if (sp.unread === '1') {
    query = query.eq('is_read', false)
  }

  const { data: threads, error } = await query

  const isEmpty = !threads || threads.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <PanelHeader
        title="Inbox"
        subtitle={isEmpty ? 'No threads synced yet' : `${threads.length} thread${threads.length !== 1 ? 's' : ''}`}
      />

      {isEmpty ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: '32px', marginBottom: '16px', opacity: 0.3 }}>✉</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              No threads yet
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7 }}>
              Run <code style={{ background: 'var(--bg)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>python scripts/wildmind_email.py sync</code> to pull emails from Gmail into Supabase.
            </div>
            {error && (
              <div style={{ marginTop: '16px', fontSize: '12px', color: '#ef4444', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px' }}>
                DB error: {error.message}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {/* Filter bar */}
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexShrink: 0 }}>
            <a href="/studio/inbox" style={filterChipStyle(!sp.unread)}>All</a>
            <a href="/studio/inbox?unread=1" style={filterChipStyle(sp.unread === '1')}>Unread</a>
          </div>

          {/* Thread list */}
          <div>
            {(threads as Thread[]).map(t => {
              const brand = t.brands
              const date = new Date(t.received_at)
              const isToday = new Date().toDateString() === date.toDateString()
              const dateStr = isToday
                ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

              return (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '14px 24px',
                  borderBottom: '1px solid var(--border)',
                  background: t.is_read ? 'transparent' : 'var(--accent-soft)',
                  cursor: 'pointer',
                }}>
                  {/* Unread dot */}
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                    background: t.is_read ? 'transparent' : 'var(--accent)',
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '13px', fontWeight: t.is_read ? 400 : 700,
                        color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>
                        {t.from_name || t.from_email}
                      </span>
                      {brand && (
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                          borderRadius: '20px', flexShrink: 0,
                          background: brand.color + '22', color: brand.color,
                        }}>
                          {brand.name}
                        </span>
                      )}
                      {t.has_draft && (
                        <span style={{
                          fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                          borderRadius: '20px', flexShrink: 0,
                          background: '#f0fdf4', color: '#16a34a',
                        }}>
                          Draft
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '13px', fontWeight: t.is_read ? 400 : 600,
                      color: t.is_read ? 'var(--muted)' : 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px',
                    }}>
                      {t.subject}
                    </div>
                    {t.snippet && (
                      <div style={{
                        fontSize: '12px', color: 'var(--dim)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.snippet}
                      </div>
                    )}
                  </div>

                  {/* Date */}
                  <div style={{ fontSize: '11px', color: 'var(--dim)', flexShrink: 0, marginTop: 2 }}>
                    {dateStr}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function filterChipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px', fontWeight: active ? 600 : 400,
    padding: '4px 12px', borderRadius: '20px',
    background: active ? 'var(--text)' : 'transparent',
    color: active ? 'var(--bg)' : 'var(--muted)',
    border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
    cursor: 'pointer', textDecoration: 'none',
  }
}
