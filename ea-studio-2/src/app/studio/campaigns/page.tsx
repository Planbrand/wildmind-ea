import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { NewCampaignButton } from './NewCampaignButton'

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  draft:            { label: 'Draft',           color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
  pending_approval: { label: 'Needs approval',  color: '#b45309', bg: '#fffbeb', dot: '#f59e0b' },
  approved:         { label: 'Approved',         color: '#1d4ed8', bg: '#eff6ff', dot: '#3b82f6' },
  active:           { label: 'Live',             color: '#15803d', bg: '#f0fdf4', dot: '#16a34a' },
  paused:           { label: 'Paused',           color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
  completed:        { label: 'Completed',        color: '#374151', bg: '#f9fafb', dot: '#6b7280' },
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; status?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: brands } = await supabase
    .from('brands').select('id,name,color,slug').order('sort_order')

  let query = supabase
    .from('campaigns')
    .select('*, brands(name,color,slug)')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (sp.brand && brands) {
    const b = brands.find(b => b.slug === sp.brand)
    if (b) query = query.eq('brand_id', b.id)
  }
  if (sp.status) query = query.eq('status', sp.status)

  const { data: campaigns } = await query
  const all = campaigns || []

  const pendingApproval = all.filter(c => c.status === 'pending_approval')
  const active = all.filter(c => c.status === 'active')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Campaigns</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {active.length} live · {pendingApproval.length} need approval · {all.length} total
            </div>
          </div>
          <NewCampaignButton brands={brands || []} ownerId={user.id} />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <FilterChip href="/studio/campaigns" active={!sp.status && !sp.brand} label="All" />
          <FilterChip href="/studio/campaigns?status=pending_approval" active={sp.status === 'pending_approval'} label="Needs approval" dot="#f59e0b" />
          <FilterChip href="/studio/campaigns?status=active" active={sp.status === 'active'} label="Live" dot="#16a34a" />
          <FilterChip href="/studio/campaigns?status=draft" active={sp.status === 'draft'} label="Drafts" />
          <FilterChip href="/studio/campaigns?status=completed" active={sp.status === 'completed'} label="Completed" />
        </div>
      </div>

      {pendingApproval.length > 0 && !sp.status && (
        <div style={{ padding: '12px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a', flexShrink: 0 }}>
          <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
            ⏳ {pendingApproval.length} campaign{pendingApproval.length !== 1 ? 's' : ''} waiting for your approval
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {all.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '12px' }}>
            <div style={{ fontSize: '14px', color: 'var(--dim)' }}>No campaigns yet</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', maxWidth: 320 }}>
              Create your first campaign to start finding leads and sending emails.
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                {['Status', 'Campaign', 'Brand', 'Sent', 'Replies', 'Positive', 'Booked', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {all.map(c => {
                const meta = STATUS_META[c.status] || STATUS_META.draft
                const brand = c.brands as { name: string; color: string; slug: string } | null
                const isPending = c.status === 'pending_approval'
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: isPending ? '#fffef5' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
                        <span style={{ fontSize: '11px', fontWeight: 600, color: meta.color }}>{meta.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {brand && (
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: brand.color + '18', color: brand.color }}>
                          {brand.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{c.sent_count || 0}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--muted)' }}>{c.reply_count || 0}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#16a34a', fontWeight: c.positive_count > 0 ? 700 : 400 }}>{c.positive_count || 0}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--accent)', fontWeight: c.booked_count > 0 ? 700 : 400 }}>{c.booked_count || 0}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {isPending ? (
                        <Link href={`/studio/campaigns/${c.id}/approve`} style={{ padding: '5px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 700, background: '#f59e0b', color: '#fff', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Review →
                        </Link>
                      ) : (
                        <Link href={`/studio/campaigns/${c.id}`} style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>View</Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function FilterChip({ href, active, label, dot }: { href: string; active: boolean; label: string; dot?: string }) {
  return (
    <Link href={href} style={{ fontSize: '12px', fontWeight: active ? 600 : 400, padding: '4px 12px', borderRadius: '20px', background: active ? 'var(--text)' : 'transparent', color: active ? '#fff' : 'var(--muted)', border: '1px solid ' + (active ? 'var(--text)' : 'var(--border)'), textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />}
      {label}
    </Link>
  )
}
