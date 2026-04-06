import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RecategoriseButton } from './RecategoriseButton'

type Thread = {
  id: string
  subject: string
  from_email: string
  from_name: string | null
  snippet: string | null
  is_read: boolean
  has_draft: boolean
  received_at: string
  inbox: string
  category: string | null
  brand_id: string | null
  brands?: { name: string; color: string; slug: string } | null
}

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'person', label: 'People' },
  { key: 'lead', label: 'Leads' },
  { key: 'promotion', label: 'Promotions' },
  { key: 'automated', label: 'Automated' },
]

const CAT_LABELS: Record<string, string> = {
  person: 'Person', lead: 'Lead', promotion: 'Promo', automated: 'Auto', other: 'Other',
}
const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  person:    { bg: '#eff6ff', text: '#3b82f6' },
  lead:      { bg: '#f0fdf4', text: '#16a34a' },
  promotion: { bg: '#fef9c3', text: '#ca8a04' },
  automated: { bg: '#f3f4f6', text: '#6b7280' },
  other:     { bg: '#f3f4f6', text: '#6b7280' },
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string }>
}) {
  const sp = await searchParams
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const supabase = await createClient()

  // Build thread query
  let query = supabase
    .from('email_threads')
    .select('*, brands(name, color, slug)')
    .order('received_at', { ascending: false })
    .limit(200)

  if (viewName) query = query.contains('view_tags', [viewName])
  if (sp.category) query = query.eq('category', sp.category)

  const { data: threads } = await query


  const count = threads?.length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* ── Category pills ── */}
      <div style={{
        padding: '10px 20px', borderBottom: '1px solid var(--border)',
        display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0,
      }}>
        {CATEGORIES.map(cat => {
          const active = (sp.category || '') === cat.key
          const href = cat.key ? `/studio/inbox?category=${cat.key}` : '/studio/inbox'
          return (
            <Link key={cat.key} href={href} style={{
              fontSize: '12px', fontWeight: active ? 600 : 400,
              padding: '4px 12px', borderRadius: '20px',
              background: active ? 'var(--text)' : 'transparent',
              color: active ? '#fff' : 'var(--muted)',
              border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              {cat.label}
            </Link>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <RecategoriseButton />
          {count} thread{count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Thread list ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {count === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--dim)', fontSize: '13px' }}>
            No threads
          </div>
        ) : (
          (threads as Thread[]).map(t => {
            const date = new Date(t.received_at)
            const isToday = new Date().toDateString() === date.toDateString()
            const dateStr = isToday
              ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            const brand = t.brands
            const cat = t.category || 'other'
            const catStyle = CAT_COLORS[cat] || CAT_COLORS.other

            return (
              <Link key={t.id} href={`/studio/inbox/${t.id}`} style={{
                display: 'flex', alignItems: 'flex-start', gap: '12px',
                padding: '13px 24px',
                borderBottom: '1px solid var(--border)',
                background: t.is_read ? 'transparent' : '#f8f9ff',
                textDecoration: 'none',
              }}>
                {/* Unread dot */}
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 7,
                  background: t.is_read ? 'transparent' : 'var(--accent)',
                }} />

                {/* Main content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{
                      fontSize: '13px', fontWeight: t.is_read ? 400 : 700,
                      color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', flex: 1,
                    }}>
                      {t.from_name || t.from_email}
                    </span>
                    {/* Category badge */}
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                      borderRadius: '20px', flexShrink: 0,
                      background: catStyle.bg, color: catStyle.text,
                    }}>
                      {CAT_LABELS[cat] || 'Other'}
                    </span>
                    {/* Brand badge */}
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

                {/* Date + inbox */}
                <div style={{ flexShrink: 0, textAlign: 'right', paddingTop: '2px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--dim)' }}>{dateStr}</div>
                  <div style={{
                    fontSize: '10px', color: 'var(--dim)', marginTop: '3px',
                    maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.inbox}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

