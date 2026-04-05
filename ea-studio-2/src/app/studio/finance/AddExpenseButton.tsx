'use client'
import { useState } from 'react'
import { addExpense } from './actions'

type Brand = { id: string; name: string; color: string }

export function AddExpenseButton({ brands }: { brands: Brand[] }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    amount: '',
    merchant: '',
    frequency: 'one_time',
    description: '',
    date: new Date().toISOString().split('T')[0],
    brand_ids: [] as string[],
  })

  function toggleBrand(id: string) {
    setForm(f => ({
      ...f,
      brand_ids: f.brand_ids.includes(id)
        ? f.brand_ids.filter(b => b !== id)
        : [...f.brand_ids, id],
    }))
  }

  async function handleSubmit() {
    if (!form.amount || !form.merchant) return
    setSaving(true)
    try {
      await addExpense({
        amount: parseFloat(form.amount),
        merchant: form.merchant,
        frequency: form.frequency,
        description: form.description,
        date: form.date,
        brand_ids: form.brand_ids,
      })
      setOpen(false)
      setForm({ amount: '', merchant: '', frequency: 'one_time', description: '', date: new Date().toISOString().split('T')[0], brand_ids: [] })
    } finally {
      setSaving(false)
    }
  }

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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '20px' }}>Add expense</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Amount (£)</label>
                <input type="number" step="0.01" placeholder="0.00" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Where spent (merchant)</label>
              <input placeholder="e.g. AWS, Figma, Office supplies" value={form.merchant}
                onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
                style={inputStyle} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Frequency</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['one_time', 'monthly', 'yearly'].map(freq => (
                  <button key={freq} onClick={() => setForm(f => ({ ...f, frequency: freq }))} style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                    border: '1px solid var(--border)', cursor: 'pointer',
                    background: form.frequency === freq ? 'var(--accent)' : 'transparent',
                    color: form.frequency === freq ? '#fff' : 'var(--muted)',
                  }}>
                    {freq === 'one_time' ? 'One time' : freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Description (optional)</label>
              <textarea placeholder="What was this for?" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Brands (which brands use this?)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {brands.map(b => (
                  <button key={b.id} onClick={() => toggleBrand(b.id)} style={{
                    padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                    border: `1px solid ${form.brand_ids.includes(b.id) ? b.color : 'var(--border)'}`,
                    background: form.brand_ids.includes(b.id) ? b.color + '22' : 'transparent',
                    color: form.brand_ids.includes(b.id) ? b.color : 'var(--muted)',
                    cursor: 'pointer',
                  }}>
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={{
                padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.amount || !form.merchant} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: '13px',
                fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
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
