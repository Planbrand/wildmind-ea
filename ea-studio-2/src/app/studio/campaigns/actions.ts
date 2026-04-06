'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCampaign(ownerId: string, name: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('campaigns').insert({
    owner_id: ownerId,
    name,
    status: 'draft',
  }).select('id').single()
  revalidatePath('/studio/campaigns')
  return data?.id
}

export async function saveCampaignIcp(campaignId: string, icp: {
  titles: string
  industries: string
  location: string
  company_size: string
  keywords: string
  max_leads: number
}) {
  const supabase = await createClient()
  await supabase.from('campaigns')
    .update({ icp_json: icp, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
  revalidatePath(`/studio/campaigns/${campaignId}`)
}

export async function upsertCampaignEmail(
  campaignId: string,
  sequenceNum: number,
  subject: string,
  body: string,
  delayDays: number
) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('campaign_emails')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('sequence_num', sequenceNum)
    .single()

  if (existing) {
    await supabase.from('campaign_emails')
      .update({ subject, body, delay_days: delayDays })
      .eq('id', existing.id)
  } else {
    await supabase.from('campaign_emails').insert({
      campaign_id: campaignId,
      sequence_num: sequenceNum,
      subject,
      body,
      delay_days: delayDays,
    })
  }
  revalidatePath(`/studio/campaigns/${campaignId}`)
}

export async function deleteCampaignEmail(campaignId: string, sequenceNum: number) {
  const supabase = await createClient()
  await supabase.from('campaign_emails')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('sequence_num', sequenceNum)
  revalidatePath(`/studio/campaigns/${campaignId}`)
}

export async function renameCampaign(campaignId: string, name: string) {
  const supabase = await createClient()
  await supabase.from('campaigns')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
  revalidatePath(`/studio/campaigns/${campaignId}`)
  revalidatePath('/studio/campaigns')
}

export async function fillLeadsFromALeads(campaignId: string, ownerId: string, brandId: string | null) {
  const supabase = await createClient()

  const { data: campaign } = await supabase
    .from('campaigns')
    .select('icp_json, name')
    .eq('id', campaignId)
    .single()

  if (!campaign?.icp_json) throw new Error('No ICP set')
  const icp = campaign.icp_json as {
    titles: string; industries: string; location: string
    company_size: string; keywords: string; max_leads: number
  }

  const res = await fetch('https://api.aleads.io/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer 371a521bdfa8f6093758b825f420d102`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_titles: icp.titles.split(',').map(s => s.trim()).filter(Boolean),
      industries: icp.industries.split(',').map(s => s.trim()).filter(Boolean),
      location: icp.location,
      company_size: icp.company_size,
      keywords: icp.keywords.split(',').map(s => s.trim()).filter(Boolean),
      limit: icp.max_leads || 50,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`A-Leads API error: ${res.status} — ${err}`)
  }

  const { leads: rawLeads } = await res.json() as {
    leads: Array<{
      name?: string; email?: string; company?: string
      title?: string; linkedin?: string; location?: string
    }>
  }

  if (!rawLeads?.length) return 0

  const { data: existing } = await supabase
    .from('leads')
    .select('email')
    .eq('campaign_id', campaignId)

  const existingEmails = new Set((existing || []).map(l => l.email))
  const toInsert = rawLeads
    .filter(l => l.email && !existingEmails.has(l.email))
    .map(l => ({
      owner_id: ownerId,
      brand_id: brandId,
      campaign_id: campaignId,
      name: l.name || null,
      email: l.email || null,
      company: l.company || null,
      title: l.title || null,
      linkedin: l.linkedin || null,
      location: l.location || null,
      status: 'new',
      source: 'cold_email',
    }))

  if (toInsert.length > 0) {
    await supabase.from('leads').insert(toInsert)
  }

  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)

  await supabase.from('campaigns')
    .update({ lead_count: count || 0, updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath(`/studio/campaigns/${campaignId}`)
  return toInsert.length
}

export async function submitForApproval(campaignId: string) {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('name, email, company, title, location')
    .eq('campaign_id', campaignId)
    .limit(5)

  const { data: emails } = await supabase
    .from('campaign_emails')
    .select('subject, body, sequence_num')
    .eq('campaign_id', campaignId)
    .order('sequence_num')

  const firstEmail = emails?.[0]

  const sampleLeads = (leads || []).map(l => ({
    name: l.name || 'Unknown',
    company: l.company || '',
    title: l.title || '',
    location: l.location || '',
    why_fits: `${l.title || 'Decision maker'} at ${l.company || 'a relevant company'} — matches your ICP`,
  }))

  const sampleEmails = (leads || []).map(l => ({
    lead_name: l.name || 'there',
    subject: (firstEmail?.subject || '').replace(/\{\{name\}\}/gi, (l.name || '').split(' ')[0]).replace(/\{\{company\}\}/gi, l.company || ''),
    body: (firstEmail?.body || '').replace(/\{\{name\}\}/gi, (l.name || '').split(' ')[0]).replace(/\{\{company\}\}/gi, l.company || ''),
  }))

  const { data: existing } = await supabase
    .from('campaign_approvals')
    .select('id')
    .eq('campaign_id', campaignId)
    .single()

  if (existing) {
    await supabase.from('campaign_approvals')
      .update({ sample_leads: sampleLeads, sample_emails: sampleEmails, status: 'pending', feedback: null, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('campaign_approvals').insert({
      campaign_id: campaignId,
      sample_leads: sampleLeads,
      sample_emails: sampleEmails,
      status: 'pending',
    })
  }

  await supabase.from('campaigns')
    .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  revalidatePath('/studio/campaigns')
  revalidatePath(`/studio/campaigns/${campaignId}`)
}

export async function updateCampaignStatus(id: string, status: string) {
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/studio/campaigns')
  revalidatePath(`/studio/campaigns/${id}`)
}

export async function approveCampaign(id: string) {
  const supabase = await createClient()
  await supabase.from('campaigns').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', id)
  await supabase.from('campaign_approvals').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('campaign_id', id)
  revalidatePath('/studio/campaigns')
  revalidatePath('/studio/dashboard')
}

export async function requestChanges(campaignId: string, feedback: string) {
  const supabase = await createClient()
  await supabase.from('campaign_approvals')
    .update({ status: 'changes_requested', feedback, updated_at: new Date().toISOString() })
    .eq('campaign_id', campaignId)
  await supabase.from('campaigns')
    .update({ status: 'draft', approval_notes: feedback, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
  revalidatePath('/studio/campaigns')
}
