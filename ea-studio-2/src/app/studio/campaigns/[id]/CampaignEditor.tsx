'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveCampaignIcp,
  upsertCampaignEmail,
  deleteCampaignEmail,
  fillLeadsFromALeads,
  submitForApproval,
} from '../actions'

type Icp = {
  titles: string
  industries: string
  location: string
  company_size: string
  keywords: string
  max_leads: number
}

type Email = {
  id: string
  sequence_num: number
  subject: string | null
  body: string | null
  delay_days: number
}

type Lead = {
  id: string
  name: string | null
  email: string | null
  company: string | null
  title: string | null
  location: string | null
  status: string
}

export function CampaignEditor({
  campaignId, ownerId, brandId, icp, emails, leads, leadCount, canSubmit,
}: {
  campaignId: string
  ownerId: string
  brandId: string | null
  icp: Icp | null
  emails: Email[]
  leads: Lead[]
  leadCount: number
  canSubmit: boolean
}) {
  const [tab, setTab] = useState<'setup' | 'leads'>('setup')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [icpForm, setIcpForm] = useState<Icp>({
    titles:       icp?.titles       || '',
    industries:   icp?.industries   || '',
    location:     icp?.location     || '',
    company_size: icp?.company_size || '',
    keywords:     icp?.keywords     || '',
    max_leads:    icp?.max_leads    || 100,
  })
  const [icpSaved, setIcpSaved] = useState(false)

  const [emailForms, setEmailForms] = useState<Email[]>(
    emails.length > 0 ? emails : [{ id: '', sequence_num: 1, subject: '', body: '', delay_days: 0 }]
  )
  const [emailSaved, setEmailSaved] = useState<number | null>(null)

  const [fillError, setFillError] = useState<string | null>(null)
  const [fillCount, setFillCount] = useState<number | null>(null)

  function setIcp(k: keyof Icp, v: string | number) {
    setIcpForm(p => ({ ...p, [k]: v }))
    setIcpSaved(false)
  }

  function saveIcp() {
    startTransition(async () => {
      await saveCampaignIcp(campaignId, icpForm)
      setIcpSaved(true)
      router.refresh()
    })
  }

  function setEmail(idx: number, k: keyof Email, v: string | number) {
    setEmailForms(prev => prev.map((e, i) => i === idx ? { ...e, [k]: v } : e))
    setEmailSaved(null)
  }

  function saveEmail(idx: number) {
    const e = emailForms[idx]
    startTransition(async () => {
      await upsertCampaignEmail(campaignId, e.sequence_num, e.subject || '', e.body || '', e.delay_days)
      setEmailSaved(e.sequence_num)
      router.refresh()
    })
  }

  function addFollowUp() {
    const nextNum = Math.max(...emailForms.map(e => e.sequence_num)) + 1
    setEmailForms(prev => [...prev, { id: '', sequence_num: nextNum, subject: '', body: '', delay_days: nextNum === 2 ? 3 : 7 }])
  }

  function removeEmail(idx: number) {
    const e = emailForms[idx]
    if (e.id) {
      startTransition(async () => {
        await deleteCampaignEmail(campaignId, e.sequence_num)
        setEmailForms(prev => prev.filter((_, i) => i !== idx))
        router.refresh()
      })
    } else {
      setEmailForms(prev => prev.filter((_, i) => i !== idx))
    }
  }

  function fillLeads() {
    setFillError(null)
    setFillCount(null)
    startTransition(async () => {
      try {
        const n = await fillLeadsFromALeads(campaignId, ownerId, brandId)
        setFillCount(n)
        router.refresh()
      } catch (err) {
        setFillError(err instanceof Error ? err.message : 'Failed to fill leads')
      }
    })
  }

  function submit() {
    startTransition(async () => {
      await submitForApproval(campaignId)
      router.push(`/studio/campaigns/${campaignId}/approve`)
    })
  }

  const icpReady = icpForm.titles.trim() && icpForm.industries.trim()
  const emailReady = emailForms[0]?.subject?.trim() && emailForms[0]?.body?.trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex' }}>
          {(['setup', 'leads'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 18px', fontSize: '13px', fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
            }}>
              {t === 'setup' ? 'Setup' : `Leads (${leadCount})`}
            </button>
          ))}
        </div>
        <button
          onClick={submit}
          disabled={isPending || !canSubmit}
          title={!canSubmit ? 'Add leads and at least one email first' : ''}
          style={{
            padding: '7px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
            background: canSubmit ? '#16a34a' : 'var(--border)',
            color: canSubmit ? '#fff' : 'var(--dim)',
            border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {isPending ? 'Saving…' : '→ Submit for approval'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {tab === 'setup' && (
          <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '28px' }}>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Ideal Customer Profile</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Who should we target?</div>
                </div>
                {icpSaved && <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>✓ Saved</span>}
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field label="Job titles *" placeholder="CEO, Founder, Head of Marketing" value={icpForm.titles} onChange={v => setIcp('titles', v)} hint="Comma-separated" />
                  <Field label="Industries *" placeholder="ecommerce, fashion, retail" value={icpForm.industries} onChange={v => setIcp('industries', v)} hint="Comma-separated" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field label="Location" placeholder="United Kingdom" value={icpForm.location} onChange={v => setIcp('location', v)} />
                  <Field label="Company size" placeholder="10-500" value={icpForm.company_size} onChange={v => setIcp('company_size', v)} hint="e.g. 10-200 employees" />
                </div>
                <Field label="Keywords / pain points" placeholder="scaling, conversions, DTC brand, growing revenue" value={icpForm.keywords} onChange={v => setIcp('keywords', v)} hint="Comma-separated" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <L>Max leads to pull</L>
                    <input type="number" min={10} max={500} value={icpForm.max_leads} onChange={e => setIcp('max_leads', parseInt(e.target.value) || 50)} style={inp} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={saveIcp} disabled={isPending || !icpReady} style={btnP}>
                      {isPending ? 'Saving…' : 'Save ICP'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
