'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Brand = { id: string; name: string; color: string; slug: string }

const STAGES = [
  { key: 'replied', label: 'Replied' },
  { key: 'call_booked', label: 'Call booked' },
  { key: 'proposal_sent', label: 'Proposal sent' },
  { key: 'won', label: 'Won' },
]

export function AddDealButton({ brands, ownerId }: { brands: Brand[]; ownerId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', company: '', brand_id: brands[0]?.id || '',
    stage: 'replied', value: '', call_date: '', notes: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function submit() {
    if (!form.name.trim()) return
    startTransition(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      // Create a contact record first so the deal join works
      let contact_id: string | null = null
      const { data: contact } = await supabase.from('contacts').insert({
        owner_id: ownerId,
        brand_id: form.brand_id || null,
        name: form.name.trim(),
        company: form.company.trim() || null,
        stage: 'warm',
      }).select('id').single()
      if (contact) contact_id = contact.id

      await supabase.from('pipeline_deals').insert({
        owner_id: ownerId,
        brand_id: form.brand_id || null,
        contact_id,
        stage: form.stage,
        value_pence: form.value ? Math.round(parseFloat(form.value) * 100) : 0,
        call_date: form.call_date || null,
        notes: form.notes || null,
      })

      setOpen(false)
      setForm({ name: '', company: '', brand_id: brands[0]?.id || '', stage: 'replied', value: '', call_date: '', notes: '' })
      router.refresh()
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        + Add deal
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Add deal</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <Field label="Contact name *" value={form.name} onChange={v => set('name', v)} />
              <Field label="Company" value={form.company} onChange={v => set('company', v)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={lbl}>Stage</div>
                  <select value={form.stage} onChange={e => set('stage', e.target.value)} style={inp}>
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <Field label="Value (£)" value={form.value} onChange={v => set('value', v)} type="number" />
              </div>
              {form.stage === 'call_booked' && (
                <Field label="Call date & time" value={form.call_date} onChange={v => set('call_date', v)} type="datetime-local" />
              )}
              {brands.length > 0 && (
                <div>
                  <div style={lbl}>Brand</div>
                  <select value={form.brand_id} onChange={e => set('brand_id', e.target.value)} style={inp}>
                    <option value="">No brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <div style={lbl}>Notes</div>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={btnG}>Cancel</button>
              <button onClick={submit} disabled={isPending || !form.name.trim()} style={btnP}>
                {isPending ? 'Adding…' : 'Add deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <div style={lbl}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inp} />
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnP: React.CSSProperties = { padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const btnG: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }
