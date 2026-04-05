import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ApprovalActions } from './ApprovalActions'

export default async function ApproveCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brands(name,color,slug)')
    .eq('id', id)
    .single()

  if (!campaign) return notFound()

  const { data: approval } = await supabase
    .from('campaign_approvals')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const { data: emails } = await supabase
    .from('campaign_emails')
    .select('*')
    .eq('campaign_id', id)
    .order('sequence_num')

  const brand = campaign.brands as { name: string; color: string; slug: string } | null

  type SampleLead = { name: string; company: string; title: string; location?: string; why_fits: string }
  type SampleEmail = { lead_name: string; subject: string; body: string }

  const sampleLeads = approval?.sample_leads as SampleLead[] | null
  const sampleEmails = approval?.sample_emails as SampleEmail[] | null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link href="/studio/campaigns" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>← Campaigns</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{campaign.name}</span>
        {brand && (
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: brand.color + '18', color: brand.color }}>
            {brand.name}
          </span>
        )}
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#fffbeb', color: '#b45309' }}>
          Waiting for approval
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>

          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Review before sending</div>
            <div style={{ fontSize: '13px', color: '#b45309' }}>
              Check the lead previews and email examples below. Approve to launch to all {campaign.lead_count || '?'} leads, or request changes.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Total leads', value: campaign.lead_count || '—' },
              { label: 'Email sequence', value: `${emails?.length || 0} emails` },
              { label: 'Status', value: 'Pending approval' },
              { label: 'Brand', value: brand?.name || '—' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {emails && emails.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Email sequence</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {emails.map(e => (
                  <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dim)' }}>
                        {e.sequence_num === 1 ? 'Initial' : `Follow-up ${e.sequence_num - 1}`}
                      </span>
                      {e.delay_days > 0 && <span style={{ fontSize: '11px', color: 'var(--dim)' }}>sends day +{e.delay_days}</span>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
                      Subject: {e.subject || '(no subject)'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {e.body || '(no body)'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sampleLeads && sampleLeads.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
                Sample lead previews
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sampleLeads.map((lead, i) => {
                  const email = sampleEmails?.[i]
                  return (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{lead.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                              {lead.title}{lead.title && lead.company ? ' · ' : ''}{lead.company}
                              {lead.location ? ` · ${lead.location}` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#f0fdf4', color: '#16a34a', flexShrink: 0 }}>
                            ICP match
                          </span>
                        </div>
                        {lead.why_fits && (
                          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--dim)', fontStyle: 'italic' }}>
                            &quot;{lead.why_fits}&quot;
                          </div>
                        )}
                      </div>
                      {email && (
                        <div style={{ padding: '14px 18px', background: 'var(--bg)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>
                            Email for {lead.name.split(' ')[0]}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{email.subject}</div>
                          <div style={{ fontSize: '12px', color: 'var(--muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{email.body}</div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {!sampleLeads && !emails?.length && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>No previews yet</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Lead samples will appear here once the campaign is built.</div>
            </div>
          )}

          <ApprovalActions campaignId={id} previousFeedback={approval?.feedback} />
        </div>
      </div>
    </div>
  )
}
