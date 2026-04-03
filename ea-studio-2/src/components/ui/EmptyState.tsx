export default function EmptyState({ icon, label, hint, action }: {
  icon?: string
  label: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:'10px', textAlign:'center' }}>
      {icon && <div style={{ fontSize:'28px', color:'var(--border-mid)' }}>{icon}</div>}
      <div style={{ fontSize:'13px', fontWeight:600, color:'var(--muted)' }}>{label}</div>
      {hint && <div style={{ fontSize:'11px', color:'var(--dim)' }}>{hint}</div>}
      {action && <div style={{ marginTop:'8px' }}>{action}</div>}
    </div>
  )
}
