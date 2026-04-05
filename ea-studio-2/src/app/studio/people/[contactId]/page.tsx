import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  hot:     { bg: '#fef2f2', text: '#dc2626' },
  warm:    { bg: '#fffbeb', text: '#b45309' },
  cold:    { bg: '#f8fafc', text: '#64748b' },
  client:  { bg: '#f0fdf4', text: '#16a34a' },
  partner: { bg: '#eff6ff', text: '#3b82f6' },
  lead:    { bg: '#fdf4ff', text: '#9333ea' },
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ contactId: string }>
}) {
  const { contactId } = await params
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('*, brands(name, color, slug)')
    .eq('id', contactId)
    .single()

  if (!contact) return notFound()

  const brand = contact.brands as { name: string; color: string; slug: string } | null
  const stage = contact.stage || 'cold'
  const sc = STAGE_COLORS[stage] || STAGE_COLORS.cold
  const initials = contact.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  // Get email threads from this contact
  const { data: threads } = contact.email
    ? await supabase
        .from('email_threads')
        .select('id, subject, snippet, received_at, inbox, is_read, has_draft')
        .eq('from_email', contact.email)
        .order('received_at', { ascending: false })
        .limit(20)
    : { data: [] }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{
        padding: '12px 24px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '12px',
        flexShrink: 0, background: 'var(--surface)',
      }}>
        <Link href="/studio/people" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>← Contacts</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{contact.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {contact.email && (
            <a href={`mailto:${contact.email}`} style={{
              padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'var(--accent)', color: '#fff', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              ✉ Send email
            </a>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>

        {/* Left column — profile */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Avatar card */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
              background: sc.bg, color: sc.text, fontSize: '22px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `2px solid ${sc.text}44`,
            }}>
              {initials}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{contact.name}</div>
            {contact.role && <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{contact.role}</div>}
            {contact.company && <div style={{ fontSize: '12px', color: 'var(--dim)' }}>{contact.company}</div>}

            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.text }}>
                {stage}
              </span>
              {contact.tags?.map((tag: string) => (
                <span key={tag} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                  {tag}
                </span>
              ))}
            </div>

            {brand && (
              <div style={{ marginTop: '12px', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: brand.color + '18', color: brand.color, fontWeight: 600, display: 'inline-block' }}>
                {brand.name}
              </div>
            )}
          </div>

          {/* Contact info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '12px' }}>Contact info</div>
            {[
              ['Email', contact.email, contact.email ? `mailto:${contact.email}` : null],
              ['Phone', contact.phone, contact.phone ? `tel:${contact.phone}` : null],
              ['Country', contact.country, null],
              ['Last contact', contact.last_contact_date, null],
            ].map(([label, value, href]) => value ? (
              <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--dim)' }}>{label}</span>
                {href ? (
                  <a href={href as string} style={{ color: 'var(--accent)', textDecoration: 'none', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</a>
                ) : (
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
                )}
              </div>
            ) : null)}
          </div>

          {/* Next action */}
          {contact.next_action && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#b45309', marginBottom: '6px' }}>Next action</div>
              <div style={{ fontSize: '13px', color: '#92400e' }}>{contact.next_action}</div>
            </div>
          )}

          {/* EA note */}
          {contact.ea_note && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '6px' }}>EA note</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{contact.ea_note}</div>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '6px' }}>Notes</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>{contact.notes}</div>
            </div>
          )}
        </div>

        {/* Right column — conversations */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
            Conversations {threads && threads.length > 0 ? `(${threads.length})` : ''}
          </div>

          {!threads || threads.length === 0 ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '40px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '13px', color: 'var(--dim)' }}>No email threads found for {contact.email || 'this contact'}</div>
              {contact.email && (
                <a href={`mailto:${contact.email}`} style={{
                  display: 'inline-block', marginTop: '12px', padding: '8px 20px',
                  borderRadius: '8px', background: 'var(--accent)', color: '#fff',
                  textDecoration: 'none', fontSize: '12px', fontWeight: 600,
                }}>
                  Start a conversation
                </a>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {threads.map((t: {
                id: string; subject: string; snippet: string | null;
                received_at: string; inbox: string; is_read: boolean; has_draft: boolean
              }) => {
                const date = new Date(t.received_at)
                const isToday = new Date().toDateString() === date.toDateString()
                const dateStr = isToday
                  ? date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                  : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

                return (
                  <Link key={t.id} href={`/studio/inbox/${t.id}`} style={{
                    display: 'block', background: 'var(--surface)',
                    border: '1px solid var(--border)', borderRadius: '12px',
                    padding: '14px 18px', textDecoration: 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {!t.is_read && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />}
                          <span style={{ fontSize: '13px', fontWeight: t.is_read ? 500 : 700, color: 'var(--text)' }}>{t.subject}</span>
                          {t.has_draft && (
                            <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>Draft</span>
                          )}
                        </div>
                        {t.snippet && (
                          <div style={{ fontSize: '12px', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.snippet}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '4px' }}>via {t.inbox}</div>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--dim)', flexShrink: 0 }}>{dateStr}</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
