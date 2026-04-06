'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateDealStage } from './actions'

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

const STAGES = [
  { key: 'replied',       label: 'Replied',        color: '#3b82f6' },
  { key: 'call_booked',   label: 'Call booked',    color: '#8b5cf6' },
  { key: 'proposal_sent', label: 'Proposal sent',  color: '#f59e0b' },
  { key: 'won',           label: 'Won',            color: '#16a34a' },
  { key: 'lost',          label: 'Lost',           color: '#6b7280' },
]

function pence(n: number) {
  if (!n) return '—'
  const p = Math.round(n / 100)
  if (p >= 1000) return '£' + Math.round(p / 1000) + 'k'
  return '£' + p.toLocaleString()
}

export function KanbanBoard({ initialDeals }: { initialDeals: Deal[] }) {
  const router = useRouter()
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const draggingId = useRef<string | null>(null)
  const didDrag = useRef(false)

  function dealName(d: Deal) {
    return d.contacts?.name || d.leads?.name || 'Unknown'
  }
  function dealCompany(d: Deal) {
    return d.contacts?.company || d.leads?.company || null
  }

  function onDragStart(e: React.DragEvent, id: string) {
    draggingId.current = id
    didDrag.current = false
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function onDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(stageKey)
  }

  function onDragEnd() {
    setDragOver(null)
    draggingId.current = null
  }

  async function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault()
    setDragOver(null)
    const id = draggingId.current || e.dataTransfer.getData('text/plain')
    if (!id) return

    const deal = deals.find(d => d.id === id)
    if (!deal || deal.stage === stageKey) return

    didDrag.current = true

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: stageKey } : d))

    const result = await updateDealStage(id, stageKey)
    if (result.error) {
      // Revert on error
      setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: deal.stage } : d))
    } else {
      router.refresh()
    }
  }

  return (
    <div style={{ display: 'flex', gap: '12px', height: '100%', minWidth: 'max-content' }}>
      {STAGES.map(stage => {
        const stageDeals = deals.filter(d => d.stage === stage.key)
        const stageValue = stageDeals.reduce((s, d) => s + (d.value_pence || 0), 0)
        const isOver = dragOver === stage.key

        return (
          <div
            key={stage.key}
            style={{ width: 240, display: 'flex', flexDirection: 'column', flexShrink: 0 }}
            onDragOver={e => onDragOver(e, stage.key)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, stage.key)}
          >
            {/* Column header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 10px', marginBottom: '8px',
              borderRadius: '8px',
              background: isOver ? stage.color + '12' : 'transparent',
              border: `1px solid ${isOver ? stage.color + '44' : 'transparent'}`,
              transition: 'all .15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{stage.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 6px' }}>
                  {stageDeals.length}
                </span>
              </div>
              {stageValue > 0 && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color }}>{pence(stageValue)}</span>
              )}
            </div>

            {/* Drop zone + cards */}
            <div style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px',
              borderRadius: '10px', padding: '4px',
              background: isOver ? stage.color + '08' : 'transparent',
              transition: 'background .15s',
              minHeight: 60,
            }}>
              {stageDeals.map(d => {
                const brand = d.brands as { name: string; color: string } | null
                const isCallSoon = d.stage === 'call_booked' && d.call_date &&
                  new Date(d.call_date) < new Date(Date.now() + 24 * 60 * 60 * 1000)

                return (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={e => onDragStart(e, d.id)}
                    onDragEnd={onDragEnd}
                    style={{ cursor: 'grab', userSelect: 'none' }}
                  >
                    <Link
                      href={`/studio/pipeline/${d.id}`}
                      onClick={e => { if (didDrag.current) { e.preventDefault(); didDrag.current = false } }}
                      style={{
                        display: 'block', background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${stage.color}`,
                        borderRadius: '10px', padding: '12px 14px',
                        textDecoration: 'none',
                        boxShadow: isCallSoon ? `0 0 0 2px ${stage.color}44` : 'none',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                        {dealName(d)}
                      </div>
                      {dealCompany(d) && (
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                          {dealCompany(d)}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                        {brand && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', background: brand.color + '18', color: brand.color }}>
                            {brand.name}
                          </span>
                        )}
                        {d.value_pence > 0 && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: stage.color, marginLeft: 'auto' }}>
                            {pence(d.value_pence)}
                          </span>
                        )}
                      </div>
                      {d.stage === 'call_booked' && d.call_date && (
                        <div style={{ fontSize: '10px', color: isCallSoon ? '#dc2626' : 'var(--dim)', marginTop: '6px', fontWeight: isCallSoon ? 700 : 400 }}>
                          📅 {new Date(d.call_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {d.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--dim)', marginTop: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.notes}
                        </div>
                      )}
                    </Link>
                  </div>
                )
              })}

              {stageDeals.length === 0 && (
                <div style={{
                  padding: '20px 10px', textAlign: 'center', color: 'var(--dim)', fontSize: '12px',
                  border: `1px dashed ${isOver ? stage.color : 'var(--border)'}`, borderRadius: '10px',
                  transition: 'border-color .15s',
                }}>
                  {isOver ? 'Drop here' : 'No deals here'}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
