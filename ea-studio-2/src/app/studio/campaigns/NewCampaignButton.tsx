'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCampaign } from './actions'

type Brand = { id: string; name: string; color: string; slug: string }

export function NewCampaignButton({ brands, ownerId }: { brands: Brand[]; ownerId: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [form, setForm] = useState({ name: '', brand_id: brands[0]?.id || '' })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function submit() {
    if (!form.name.trim() || !form.brand_id) return
    startTransition(async () => {
      const id = await createCampaign(ownerId, form.brand_id, form.name)
      setOpen(false)
      setForm({ name: '', brand_id: brands[0]?.id || '' })
      if (id) router.push(`/studio/campaigns/${id}`)
      else router.refresh()
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}>
        + New campaign
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', width: '100%', maxWidth: 440 }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>New campaign</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={lbl}>Campaign name</div>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. UK ecom brands — basket builder Q2" style={inp} autoFocus />
              </div>
              <div>
                <div style={lbl}>Brand</div>
                <select value={form.brand_id} onChange={e => set('brand_id', e.target.value)} style={inp}>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                You&apos;ll set up the ICP, email sequence, and lead list next. Nothing sends until you approve it.
              </p>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setOpen(false)} style={btnG}>Cancel</button>
              <button onClick={submit} disabled={isPending || !form.name.trim() || !form.brand_id} style={btnP}>
                {isPending ? 'Creating…' : 'Create campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const lbl: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '5px' }
const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', fontFamily: 'inherit', boxSizing: 'border-box' }
const btnP: React.CSSProperties = { padding: '8px 20px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const btnG: React.CSSProperties = { padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', fontSize: '13px', color: 'var(--muted)', cursor: 'pointer' }
