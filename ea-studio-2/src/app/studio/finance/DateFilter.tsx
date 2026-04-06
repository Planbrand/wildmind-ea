'use client'
import { useRouter } from 'next/navigation'

const PRESETS = [
  { label: 'This month', value: 'this_month' },
  { label: 'Last month', value: 'last_month' },
  { label: 'Last 3 months', value: 'last_3_months' },
  { label: 'Last 6 months', value: 'last_6_months' },
  { label: 'This year', value: 'this_year' },
]

export function DateFilter({ active, tab, viewName }: { active: string; tab: string; viewName?: string | null }) {
  const router = useRouter()

  function go(range: string) {
    const vq = viewName ? `&view=${encodeURIComponent(viewName)}` : ''
    router.push(`/studio/finance?tab=${tab}&range=${range}${vq}`)
  }

  return (
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {PRESETS.map(p => (
        <button
          key={p.value}
          onClick={() => go(p.value)}
          style={{
            padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)',
            background: active === p.value ? 'var(--accent)' : 'transparent',
            color: active === p.value ? '#fff' : 'var(--muted)',
            fontSize: '12px', fontWeight: active === p.value ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
