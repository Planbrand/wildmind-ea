import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CampaignEditor } from './CampaignEditor'

type IcpJson = {
  titles: string
  industries: string
  location: string
  company_size: string
  keywords: string
  max_leads: number
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*, brands(name,color,slug)')
    .eq('id', id)
    .single()

  if (!campaign) return notFound()

  if (campaign.status === 'pending_approval') {
    redirect(`/studio/campaigns/${id}/approve`)
  }

  const { data: emails } = await supabase
    .from('campaign_emails')
    .select('*')
    .eq('campaign_id', id)
    .order('sequence_num')

  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, email, company, title, location, status')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: leadCount } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)

  const brand = campaign.brands as { name: string; color: string; slug: string } | null
  const icp = campaign.icp_json as IcpJson | null

  const STATUS_META: Record<string, { label: string; color: string }> = {
    draft:            { label: 'Draft',          color: '#6b7280' },
    pending_approval: { label: 'Needs approval', color: '#b45309' },
    active:           { label: 'Live',           color: '#15803d' },
    paused:           { label: 'Paused',         color: '#6b7280' },
    completed:        { label: 'Completed',      color: '#374151' },
  }
  const meta = STATUS_META[campaign.status] || STATUS_META.draft
  const canSubmit = campaign.status === 'draft' && (leadCount || 0) > 0 && (emails || []).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
          <Link href="/studio/campaigns" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>← Campaigns</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{campaign.name}</span>
          {brand && (
            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: brand.color + '18', color: brand.color }}>
              {brand.name}
            </span>
          )}
          <span style={{ fontSize: '11px', fontWeight: 700, color: meta.color }}>● {meta.label}</span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {leadCount || 0} leads · {(emails || []).length} email{(emails || []).length !== 1 ? 's' : ''} in sequence
          {campaign.approval_notes && (
            <span style={{ color: '#dc2626', marginLeft: '12px' }}>⚠ Changes requested</span>
          )}
        </div>
      </div>

      {campaign.approval_notes && (
        <div style={{ padding: '12px 24px', background: '#fef2f2', borderBottom: '1px solid #fecaca', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '2px' }}>Changes requested</div>
          <div style={{ fontSize: '13px', color: '#7f1d1d' }}>{campaign.approval_notes}</div>
        </div>
      )}

      <CampaignEditor
        campaignId={id}
        ownerId={user.id}
        brandId={campaign.brand_id}
        icp={icp}
        emails={emails || []}
        leads={leads || []}
        leadCount={leadCount || 0}
        canSubmit={canSubmit}
      />
    </div>
  )
}
