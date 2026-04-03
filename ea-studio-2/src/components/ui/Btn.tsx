'use client'
export default function Btn({ children, onClick, variant = 'ghost', type = 'button', disabled }: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'fill' | 'ghost' | 'danger'
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    fill:  { background:'var(--accent)', color:'#fff', border:'none' },
    ghost: { background:'var(--bg)', color:'var(--muted)', border:'1px solid var(--border)' },
    danger:{ background:'transparent', color:'var(--danger)', border:'1px solid rgba(220,38,38,.25)' },
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      fontFamily:'inherit', ...styles[variant]
    }}>
      {children}
    </button>
  )
}
