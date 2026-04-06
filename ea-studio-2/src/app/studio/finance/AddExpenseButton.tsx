'use client'
import { useState } from 'react'
import { addExpense } from './actions'

const CURRENCIES = ['GBP', 'USD', 'EUR', 'TRY', 'CAD', 'AUD']
const CURRENCY_SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', TRY: '₺', CAD: 'C$', AUD: 'A$' }

export function AddExpenseButton({ viewName }: { viewName?: string | null }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [form, setForm] = useState({
    amount: '',
    merchant: '',
    frequency: 'one_time',
    currency: 'GBP',
    description: '',
    date: new Date().toISOString().split('T')[0],
  })

  async function handleSubmit() {
    if (!form.amount || !form.merchant) return
    setSaving(true)
    setErr(null)
    try {
      const result = await addExpense({
        amount: parseFloat(form.amount),
        merchant: form.merchant,
        frequency: form.frequency,
        currency: form.currency,
        description: form.description,
        date: form.date,
        view_tags: viewName ? [viewName] : [],
      })
      if (result.error) {
        setErr(result.error)
      } else {
        setOpen(false)
        setForm({ amount: '', merchant: '', frequency: 'one_time', currency: 'GBP', description: '', date: new Date().toISOString().split('T')[0] })
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const sym = CURRENCY_SYMBOLS[form.currency] || form.currency

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '7px 16px', borderRadius: '8px', border: 'none',
        background: 'var(--accent)', color: '#fff', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer',
      }}>
        + Add expense
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '28px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>Add expense</div>

            {/* Amount + Currency + Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Amount ({sym})</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  autoFocus style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} style={inputStyle}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            {/* Merchant */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Where spent (merchant)</label>
              <input placeholder="e.g. AWS, Figma, Office supplies" value={form.merchant}
                onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                style={inputStyle} />
            </div>

            {/* Frequency */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Frequency</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { key: 'one_time', label: 'One time' },
                  { key: 'monthly', label: 'Monthly' },
                  { key: 'yearly', label: 'Yearly' },
                ].map(f => (
                  <button key={f.key} onClick={() => setForm(fm => ({ ...fm, frequency: f.key }))} style={{
                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: form.frequency === f.key ? 'var(--accent)' : 'transparent',
                    color: form.frequency === f.key ? '#fff' : 'var(--muted)',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea placeholder="What was this for?" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {err && (
              <div style={{ fontSize: '12px', color: '#dc2626', background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                {err}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{
                padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.amount || !form.merchant} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: '13px',
                fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || !form.amount || !form.merchant ? 0.6 : 1,
              }}>
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box',
}
