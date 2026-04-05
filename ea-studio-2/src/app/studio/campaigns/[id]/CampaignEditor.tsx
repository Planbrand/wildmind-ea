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
    emails.length > 0 ? emails : [{
      id: '', sequence_num: 1, subject: '', body: '', delay_days: 0,
    }]
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
    setEmailForms(prev => [...prev, {
      id: '', sequence_num: nextNum, subject: '', body: '', delay_days: nextNum === 2 ? 3 : 7,
    }])
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
                    <input type="number" min={10} max={500} value={icpForm.max_leads}
                      onChange={e => setIcp('max_leads', parseInt(e.target.value) || 50)}
                      style={inp} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={saveIcp} disabled={isPending || !icpReady} style={btnP}>
                      {isPending ? 'Saving…' : 'Save ICP'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Email sequence</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Use {'{{name}}'} and {'{{company}}'} as placeholders.
                </div>
              </div>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {emailForms.map((e, idx) => (
                  <div key={e.sequence_num} style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--dim)' }}>
                          {e.sequence_num === 1 ? 'Initial email' : `Follow-up ${e.sequence_num - 1}`}
                        </span>
                        {e.sequence_num > 1 && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            sends day +
                            <input type="number" min={1} max={60} value={e.delay_days}
                              onChange={ev => setEmail(idx, 'delay_days', parseInt(ev.target.value) || 1)}
                              style={{ ...inp, width: 48, padding: '2px 6px', fontSize: '11px' }} />
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {emailSaved === e.sequence_num && <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>✓ Saved</span>}
                        {emailForms.length > 1 && (
                          <button onClick={() => removeEmail(idx)} style={{ background: 'none', border: 'none', fontSize: '16px', color: 'var(--dim)', cursor: 'pointer' }}>×</button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <L>Subject line</L>
                        <input type="text" value={e.subject || ''}
                          onChange={ev => setEmail(idx, 'subject', ev.target.value)}
                          placeholder="Quick question about {{company}}'s growth"
                          style={inp} />
                      </div>
                      <div>
                        <L>Body</L>
                        <textarea value={e.body || ''}
                          onChange={ev => setEmail(idx, 'body', ev.target.value)}
                          rows={7}
                          placeholder={`Hi {{name}},\n\nI came across {{company}} and noticed...\n\nWould love to show you what we've built.\n\nBest,\nSezay`}
                          style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => saveEmail(idx)} disabled={isPending} style={btnP}>
                          {isPending ? 'Saving…' : 'Save email'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addFollowUp} style={btnGhost}>+ Add follow-up email</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'leads' && (
          <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Find leads with A-Leads</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {icpReady ? `Will pull up to ${icpForm.max_leads} leads matching your ICP.` : 'Save your ICP first on the Setup tab.'}
                  </div>
                  {fillCount !== null && <div style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700, marginTop: '6px' }}>✓ Added {fillCount} new leads</div>}
                  {fillError && <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>Error: {fillError}</div>}
                </div>
                <button onClick={fillLeads} disabled={isPending || !icpReady} style={{ ...btnP, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {isPending ? 'Pulling…' : `Pull leads (${icpForm.max_leads})`}
                </button>
              </div>
            </div>

            {leads.length > 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                  {leadCount} leads{leadCount > leads.length ? ` (showing first ${leads.length})` : ''}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Company', 'Title', 'Location', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', fontSize: '10px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{l.name || '—'}</div>
                          {l.email && <div style={{ fontSize: '11px', color: 'var(--dim)' }}>{l.email}</div>}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>{l.company || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>{l.title || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--muted)' }}>{l.location || '—'}</td>
                        <td style={{ padding: '10px 14px' }}><StatusBadge s={l.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>🎯</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>No leads yet</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Set your ICP and pull leads from A-Leads above.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:          { color: '#6b7280', bg: '#f3f4f6' },
  contacted:    { color: '#3b82f6', bg: '#eff6ff' },
  replied:      { color: '#8b5cf6', bg: '#f5f3ff' },
  positive:     { color: '#16a34a', bg: '#f0fdf4' },
  negative:     { color: '#dc2626', bg: '#fef2f2' },
  booked:       { color: '#f59e0b', bg: '#fffbeb' },
  won:          { color: '#15803d', bg: '#dcfce7' },
  unsubscribed: { color: '#9ca3af', bg: '#f9fafb' },
}

function StatusBadge({ s }: { s: string }) {
  const c = STATUS_COLORS[s] || STATUS_COLORS.new
  return <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: c.bg, color: c.color }}>{s}</span>
}

function L({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }}>{children}</div>
}

function Field({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; hint?: string
}) {
  return (
    <div style={{ flex: 1 }}>
      <L>{label}</L>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inp} />
      {hint && <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '3px' }}>{hint}</div>}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnP: React.CSSProperties = { padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const btnGhost: React.CSSProperties = { padding: '10px', borderRadius: '8px', width: '100%', border: '1px dashed var(--border)', background: 'transparent', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }
