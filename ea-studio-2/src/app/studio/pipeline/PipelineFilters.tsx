'use client'

import { useState } from 'react'
import Link from 'next/link'
import EmptyState from '@/components/ui/EmptyState'

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

type FilterKey = 'all' | 'hot' | 'warm' | 'cold' | 'client'

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
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',    label: 'All' },
  { key: 'hot',    label: 'Hot' },
  { key: 'warm',   label: 'Warm' },
  { key: 'cold',   label: 'Cold' },
  { key: 'client', label: 'Clients' },
]

export default function PipelineFilters({ contacts }: { contacts: Contact[] }) {
  const [active, setActive] = useState<FilterKey>('all')

  const filtered = active === 'all' ? contacts : contacts.filter(c => c.stage === active)

  const thStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
    color: 'var(--dim)', padding: '8px 12px', textAlign: 'left',
    borderBottom: '1px solid var(--border)', background: 'var(--surface)',
    whiteSpace: 'nowrap',
  }

  return (
    <>
      {/* Filter tabs */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'14px' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            style={{
              fontSize: '12px', fontWeight: 600, padding: '5px 12px',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: active === f.key ? 'var(--accent)' : 'var(--surface-2)',
              color: active === f.key ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >
            {f.label}
            <span style={{ fontSize:'10px', marginLeft:'4px', opacity:.7 }}>
              ({f.key === 'all' ? contacts.length : contacts.filter(c => c.stage === f.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState icon="👤" label="No contacts here" hint="Add contacts to build your pipeline" />
      ) : (
        <div style={{ border:'1px solid var(--border)', borderRadius:'10px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Company</th>
                <th style={thStyle}>Stage</th>
                <th style={thStyle}>Deal value</th>
                <th style={thStyle}>Last contact</th>
                <th style={thStyle}>Next action</th>
                <th style={{ ...thStyle, textAlign:'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const isLast = i === filtered.length - 1
                const tdStyle: React.CSSProperties = {
                  padding: '10px 12px', fontSize: '12px', color: 'var(--text)',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  verticalAlign: 'middle',
                }
                return (
                  <tr
                    key={c.id}
                    style={{ background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: stageColor(c.stage), color: '#fff',
                          fontSize: '10px', fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {initials(c.name)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--muted)' }}>{c.company || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, padding: '3px 9px',
                        borderRadius: '10px', letterSpacing: '.04em',
                        background: stageBg(c.stage), color: stageColor(c.stage),
                        textTransform: 'uppercase',
                      }}>
                        {stageLabel(c.stage)}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {pence(c.deal_value_pence)}
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--muted)' }}>{formatDate(c.last_contact_date)}</td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', maxWidth: '200px' }}>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {c.next_action || '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Link
                        href={`/studio/pipeline/${c.id}/edit`}
                        style={{
                          fontSize: '11px', fontWeight: 600, color: 'var(--accent)',
                          textDecoration: 'none', padding: '4px 10px',
                          border: '1px solid var(--border-mid)', borderRadius: '5px',
                          background: 'var(--bg)',
                        }}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
