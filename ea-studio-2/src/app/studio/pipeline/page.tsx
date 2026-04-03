import { createClient } from '@/lib/supabase/server'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import Link from 'next/link'
import PipelineFilters from './PipelineFilters'

type Contact = {
  id: string
  name: string
  company: string | null
  role: string | null
  stage: 'hot' | 'warm' | 'cold' | 'client'
  deal_value_pence: number | null
  last_contact_date: string | null
  next_action: string | null
  owner_id: string
}

function pence(n: number | null) {
  if (!n) return '—'
  const p = Math.round(n / 100)
  if (p >= 1000000) return '£' + (p / 1000000).toFixed(1) + 'm'
  if (p >= 1000)    return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

function stageColor(s: string) {
  return ({ hot:'#DC2626', warm:'#B45309', cold:'#6B6B7A', client:'#059669' } as Record<string,string>)[s] || '#6B6B7A'
}
function stageBg(s: string) {
  return ({ hot:'rgba(220,38,38,.1)', warm:'rgba(180,83,9,.1)', cold:'var(--surface-2)', client:'var(--accent-soft)' } as Record<string,string>)[s] || 'var(--surface-2)'
}
function stageLabel(s: string) {
  return ({ hot:'Hot', warm:'Warm', cold:'Cold', client:'Client' } as Record<string,string>)[s] || s
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .eq('owner_id', user.id)
    .order('last_contact_date', { ascending: false })

  const all = (contacts as Contact[]) || []

  const addBtn = (
    <Link
      href="/studio/pipeline/new"
      style={{ fontSize:'12px', fontWeight:600, color:'var(--accent)', background:'var(--accent-soft)', border:'none', borderRadius:'6px', padding:'6px 12px', textDecoration:'none', display:'inline-block' }}
    >
      + Add contact
    </Link>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="Pipeline" subtitle={`${all.length} contacts`} action={addBtn} />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>

        {/* Filter tabs — client component */}
        <PipelineFilters contacts={all} />

      </div>
    </div>
  )
}
