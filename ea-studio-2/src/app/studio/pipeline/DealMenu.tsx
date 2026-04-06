'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DealMenu({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function deleteDeal(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this deal?')) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('pipeline_deals').delete().eq('id', dealId)
    router.refresh()
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}
      onClick={e => { e.preventDefault(); e.stopPropagation() }}>
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        style={{
          width: 24, height: 24, borderRadius: '6px', border: 'none',
          background: 'transparent', cursor: 'pointer', color: 'var(--dim)',
          fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1,
        }}>
        ···
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 99,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          minWidth: 120, padding: '4px',
        }}>
          <button
            onClick={deleteDeal}
            disabled={deleting}
            style={{
              width: '100%', textAlign: 'left', padding: '7px 12px',
              fontSize: '12px', fontWeight: 500, color: '#dc2626',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderRadius: '5px',
            }}>
            {deleting ? 'Deleting…' : 'Delete deal'}
          </button>
        </div>
      )}
    </div>
  )
}
