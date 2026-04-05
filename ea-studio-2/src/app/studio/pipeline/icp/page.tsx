import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type ICP = {
  id: string
  name: string
  description: string
  job_titles: string[]
  seniority_levels: string[]
  industries: string[]
  company_sizes: string[]
  locations: string[]
  keywords: string[]
  pain_points: string
  value_prop: string
  disqualifiers: string
  aleads_search: Record<string, string[]>
  brand_id: string
  brands?: { name: string; color: string; slug: string } | null
}

export default async function IcpPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  const { data: brands } = await supabase
    .from('brands').select('id,name,color,slug').order('sort_order')

  let query = supabase
    .from('icp_profiles')
    .select('*, brands(name,color,slug)')
    .order('sort_order')

  if (sp.brand && brands) {
    const brand = (brands as { id: string; slug: string }[]).find(b => b.slug === sp.brand)
    if (brand) query = query.eq('brand_id', (brand as { id: string }).id)
  }

  const { data: icps } = await query
  const allIcps = (icps || []) as ICP[]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>ICP Profiles</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {allIcps.length} ideal customer profiles across your brands
            </div>
          </div>
          <Link href="/studio/pipeline" style={{ fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}>← Pipeline</Link>
        </div>

        {/* Brand filter */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          <Link href="/studio/pipeline/icp" style={chipStyle(!sp.brand)}>All brands</Link>
          {(brands as { id: string; name: string; color: string; slug: string }[])?.map(b => (
            <Link key={b.id} href={`/studio/pipeline/icp?brand=${b.slug}`} style={chipStyle(sp.brand === b.slug)}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, display: 'inline-block', marginRight: 5 }} />
              {b.name}
            </Link>
          ))}
        </div>
      </div>

      {/* ICP Cards */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))', gap: '16px' }}>
          {allIcps.map(icp => {
            const brand = icp.brands as { name: string; color: string; slug: string } | null

            // Build A-Leads search URL
            const searchParams = new URLSearchParams()
            icp.aleads_search?.job_titles?.forEach(t => searchParams.append('titles[]', t))
            icp.aleads_search?.locations?.forEach(l => searchParams.append('locations[]', l))

            return (
              <div key={icp.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '14px', overflow: 'hidden',
              }}>
                {/* Card header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{icp.name}</div>
                      {brand && (
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', background: brand.color + '22', color: brand.color }}>
                          {brand.name}
                        </span>
                      )}
                    </div>
                    <a
                      href="https://app.a-leads.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flexShrink: 0, padding: '7px 14px', borderRadius: '8px',
                        background: '#18181b', color: '#fff', fontSize: '11px', fontWeight: 600,
                        textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      Search in A-Leads ↗
                    </a>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>{icp.description}</div>
                </div>

                {/* Fields grid */}
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <FieldBlock label="Job Titles" items={icp.job_titles} color="#6366f1" />
                  <FieldBlock label="Locations" items={icp.locations} color="#0ea5e9" />
                  <FieldBlock label="Industries" items={icp.industries} color="#059669" />
                  <FieldBlock label="Company Sizes" items={icp.company_sizes} color="#f59e0b" />
                  {icp.keywords?.length > 0 && (
                    <div style={{ gridColumn: '1/-1' }}>
                      <FieldBlock label="Keywords" items={icp.keywords} color="#8b5cf6" />
                    </div>
                  )}
                </div>

                {/* Pain / Value / Disqualifiers */}
                <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <TextBlock label="Pain points" text={icp.pain_points} accent="#dc2626" bg="#fef2f2" />
                  <TextBlock label="Value proposition" text={icp.value_prop} accent="#16a34a" bg="#f0fdf4" />
                  <TextBlock label="Disqualifiers" text={icp.disqualifiers} accent="#64748b" bg="#f8fafc" />
                </div>

                {/* A-Leads search config */}
                <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '8px' }}>
                    A-Leads Search Config
                  </div>
                  <pre style={{
                    fontSize: '11px', color: 'var(--muted)', background: 'transparent',
                    margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontFamily: 'monospace',
                  }}>
                    {JSON.stringify(icp.aleads_search, null, 2)}
                  </pre>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FieldBlock({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dim)', marginBottom: '6px' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {items?.map(item => (
          <span key={item} style={{
            fontSize: '11px', padding: '3px 9px', borderRadius: '20px',
            background: color + '15', color: color, fontWeight: 600,
          }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function TextBlock({ label, text, accent, bg }: { label: string; text: string; accent: string; bg: string }) {
  return (
    <div style={{ borderRadius: '8px', background: bg, padding: '10px 14px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: accent, marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>{text}</div>
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: '12px', fontWeight: active ? 600 : 400,
    padding: '4px 12px', borderRadius: '20px',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
    textDecoration: 'none', whiteSpace: 'nowrap' as const,
    display: 'flex', alignItems: 'center',
  }
}
