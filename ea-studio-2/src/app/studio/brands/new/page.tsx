'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function NewBrandPage() {
  const supabase = createClient()
  const router = useRouter()
  const [form, setForm] = useState({ name:'', slug:'', color:'#059669', main_inbox:'', description:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleName(name: string) {
    setForm(f => ({ ...f, name, slug: slugify(name) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }
    const { error: err } = await supabase.from('brands').insert({
      owner_id: user.id, name: form.name.trim(), slug: form.slug || slugify(form.name),
      color: form.color, main_inbox: form.main_inbox || null, description: form.description || null, sort_order: 99
    })
    if (err) { setError(err.message); setSaving(false); return }
    router.push('/studio/dashboard'); router.refresh()
  }

  const inp = (label: string, key: keyof typeof form, extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => (
    <div>
      <div style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>{label}</div>
      <input
        value={form[key]} onChange={e => key === 'name' ? handleName(e.target.value) : setForm(f => ({...f, [key]: e.target.value}))}
        style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', color:'var(--text)', outline:'none' }}
        {...extra}
      />
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="New brand" subtitle="Add a new brand to your workspace" />
      <div style={{ flex:1, overflowY:'auto', padding:'24px', display:'flex', justifyContent:'center' }}>
        <div style={{ width:'100%', maxWidth:480 }}>
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'12px', padding:'28px' }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {inp('Brand name *', 'name', { placeholder:'e.g. Brumah', required: true })}
              {inp('Slug (URL key)', 'slug', { placeholder:'e.g. brumah' })}
              <div>
                <div style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Brand colour</div>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))}
                    style={{ width:42, height:36, padding:'2px', border:'1px solid var(--border)', borderRadius:'7px', cursor:'pointer' }} />
                  <input value={form.color} onChange={e => setForm(f => ({...f, color: e.target.value}))} placeholder="#059669"
                    style={{ flex:1, padding:'9px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
                </div>
              </div>
              {inp('Main inbox email', 'main_inbox', { type:'email', placeholder:'info@yourbrand.com' })}
              {inp('Description', 'description', { placeholder:'What does this brand do?' })}
              {error && <div style={{ fontSize:'12px', color:'var(--danger)', background:'rgba(220,38,38,.06)', border:'1px solid rgba(220,38,38,.2)', borderRadius:'6px', padding:'8px 12px' }}>{error}</div>}
              <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'4px' }}>
                <button type="button" onClick={() => router.back()} style={{ padding:'9px 16px', border:'1px solid var(--border)', borderRadius:'8px', background:'var(--bg)', color:'var(--muted)', fontSize:'13px', cursor:'pointer' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding:'9px 20px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, cursor:'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Creating…' : 'Create brand'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
