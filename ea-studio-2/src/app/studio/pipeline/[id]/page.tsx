import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

function pence(n: number) {
  if (!n) return '—'
  const p = Math.round(n / 100)
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

const STAGE_COLORS: Record<string, string> = {
  replied: '#3b82f6', call_booked: '#8b5cf6', proposal_sent: '#f59e0b', won: '#16a34a', lost: '#6b7280',
}
const STAGE_LABELS: Record<string, string> = {
  replied: 'Replied', call_booked: 'Call Booked', proposal_sent: 'Proposal Sent', won: 'Won', lost: 'Lost',
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: deal } = await supabase
    .from('pipeline_deals')
    .select('*, brands(name,color,slug), contacts(name,company,email,phone), leads(name,company,title)')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single()

  if (!deal) return notFound()

  const color = STAGE_COLORS[deal.stage] || '#6b7280'
  const person = deal.contacts || deal.leads
  const brand = deal.brands as { name: string; color: string; slug: string } | null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Link href="/studio/pipeline" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}>← Pipeline</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
            {(person as any)?.name || 'Deal'}
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', background: color + '18', color }}>
            {STAGE_LABELS[deal.stage] || deal.stage}
          </span>
          {deal.value_pence > 0 && (
            <span style={{ fontSize: '14px', fontWeight: 700, color }}>
              {pence(deal.value_pence)}
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 600 }}>
          {/* Contact info */}
          {person && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Contact</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{(person as any).name}</div>
              {(person as any).company && <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>{(person as any).company}</div>}
              {(person as any).title && <div style={{ fontSize: '12px', color: 'var(--dim)', marginBottom: '4px' }}>{(person as any).title}</div>}
              {(person as any).email && <div style={{ fontSize: '12px', color: 'var(--accent)' }}>{(person as any).email}</div>}
              {(person as any).phone && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{(person as any).phone}</div>}
            </div>
          )}

          {/* Notes */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Notes</div>
            {deal.notes ? (
              <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{deal.notes}</div>
            ) : (
              <div style={{ fontSize: '13px', color: 'var(--dim)', fontStyle: 'italic' }}>No notes yet</div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Details</div>
            {[
              { label: 'Value', value: pence(deal.value_pence) },
              { label: 'Stage', value: STAGE_LABELS[deal.stage] || deal.stage },
              { label: 'Call date', value: deal.call_date ? new Date(deal.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
              { label: 'Updated', value: new Date(deal.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                <span style={{ color: 'var(--dim)' }}>{row.label}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            {brand && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: '12px' }}>
                <span style={{ color: 'var(--dim)' }}>Brand</span>
                <Link href={`/studio/brands/${brand.slug}`} style={{ color: brand.color, fontWeight: 600, textDecoration: 'none' }}>{brand.name}</Link>
              </div>
            )}
          </div>

          {/* Stage progression */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '12px' }}>Stage</div>
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: deal.stage === key ? STAGE_COLORS[key] : 'var(--border)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: deal.stage === key ? 'var(--text)' : 'var(--dim)', fontWeight: deal.stage === key ? 700 : 400 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
