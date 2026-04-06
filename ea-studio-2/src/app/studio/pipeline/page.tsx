import { createClient } from '@/lib/supabase/server'
import { AddDealButton } from './AddDealButton'
import { KanbanBoard } from './KanbanBoard'

type Deal = {
  id: string
  stage: string
  value_pence: number
  call_date: string | null
  notes: string | null
  updated_at: string
  brands: { name: string; color: string; slug: string } | null
  contacts: { name: string; company: string | null } | null
  leads: { name: string; company: string | null; title: string | null } | null
}

function pence(n: number) {
  if (!n) return '—'
  const p = Math.round(n / 100)
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const sp = await searchParams
  const viewName = sp.view ? decodeURIComponent(sp.view) : null
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let query = supabase
    .from('pipeline_deals')
    .select('*, brands(name,color,slug), contacts(name,company), leads(name,company,title)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  if (viewName) {
    query = query.contains('view_tags', [viewName])
  }

  const { data: deals } = await query
  const all = (deals || []) as Deal[]

  const totalValue = all.filter(d => d.stage !== 'lost').reduce((s, d) => s + (d.value_pence || 0), 0)
  const wonValue = all.filter(d => d.stage === 'won').reduce((s, d) => s + (d.value_pence || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Pipeline</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {all.filter(d => d.stage !== 'lost').length} active deals ·{' '}
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{pence(wonValue)} won</span>
              {totalValue > 0 && <> · {pence(totalValue)} total</>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AddDealButton ownerId={user.id} viewName={viewName} />
          </div>
        </div>

        {viewName && (
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Filtered: <strong style={{ color: 'var(--text)' }}>{viewName}</strong>
          </div>
        )}
      </div>

      {/* Kanban board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px' }}>
        <KanbanBoard initialDeals={all} />
      </div>
    </div>
  )
}

