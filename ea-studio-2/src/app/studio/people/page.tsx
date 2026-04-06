import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  role: string | null
  company: string | null
  country: string | null
  stage: string
  tags: string[] | null
  is_person: boolean | null
  notes: string | null
  ea_note: string | null
  next_action: string | null
  last_contact_date: string | null
  brand_id: string | null
  brands?: { name: string; color: string; slug: string } | null
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  hot:     { bg: '#fef2f2', text: '#dc2626' },
  warm:    { bg: '#fffbeb', text: '#b45309' },
  cold:    { bg: '#f8fafc', text: '#64748b' },
  client:  { bg: '#f0fdf4', text: '#16a34a' },
  partner: { bg: '#eff6ff', text: '#3b82f6' },
  lead:    { bg: '#fdf4ff', text: '#9333ea' },
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; group?: string; view?: string }>
}) {
  const sp = await searchParams
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const supabase = await createClient()

  let query = supabase
    .from('contacts')
    .select('*, brands(name,color,slug)')
    .order('name')
    .limit(500)

  if (viewName) query = query.contains('view_tags', [viewName])
  if (sp.stage) query = query.eq('stage', sp.stage)

  const { data: contacts } = await query
  const all = (contacts || []) as Contact[]

  // Primary = is_person true or null (default before column existed)
  // Other = explicitly is_person = false
  const people = all.filter(c => c.is_person !== false)
  const others = all.filter(c => c.is_person === false)
  const showOthers = sp.group === 'other'
  const displayed = showOthers ? others : people

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Contacts</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {people.length} people · {others.length} other
            </div>
          </div>
        </div>

        {/* People / Other toggle */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <Link href="/studio/people" style={toggleStyle(!showOthers)}>
            People ({people.length})
          </Link>
          <Link href="/studio/people?group=other" style={toggleStyle(showOthers)}>
            Other ({others.length})
          </Link>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {displayed.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--dim)', fontSize: '13px' }}>
            No contacts here yet
          </div>
        ) : (
          displayed.map(c => {
            const stage = c.stage || 'cold'
            const sc = STAGE_COLORS[stage] || STAGE_COLORS.cold
            const initials = c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            const brand = c.brands as { name: string; color: string; slug: string } | null

            return (
              <Link key={c.id} href={`/studio/people/${c.id}`} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '12px 24px', borderBottom: '1px solid var(--border)',
                textDecoration: 'none',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: sc.bg, color: sc.text, fontSize: '12px', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${sc.text}33`,
                }}>
                  {initials}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: sc.bg, color: sc.text }}>
                      {stage}
                    </span>
                    {c.tags?.map(tag => (
                      <span key={tag} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {c.company && <span>{c.company}</span>}
                    {c.company && c.role && <span style={{ color: 'var(--border)' }}>·</span>}
                    {c.role && <span style={{ color: 'var(--dim)' }}>{c.role}</span>}
                    {c.email && <span style={{ color: 'var(--dim)' }}>{c.email}</span>}
                  </div>
                  {c.next_action && (
                    <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '2px' }}>→ {c.next_action}</div>
                  )}
                </div>

                {/* Brand + arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {brand && (
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: brand.color + '22', color: brand.color }}>
                      {brand.name}
                    </span>
                  )}
                  <span style={{ color: 'var(--dim)', fontSize: '14px' }}>›</span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px', fontWeight: active ? 700 : 400,
    padding: '5px 14px', borderRadius: '20px',
    background: active ? 'var(--text)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'),
    textDecoration: 'none',
  }
}

