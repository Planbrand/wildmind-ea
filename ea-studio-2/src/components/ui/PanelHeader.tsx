export default function PanelHeader({ title, subtitle, action }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'14px 20px', borderBottom:'1px solid var(--border)',
      background:'var(--bg)', flexShrink:0
    }}>
      <div>
        <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text)' }}>{title}</div>
        {subtitle && <div style={{ fontSize:'11px', color:'var(--muted)', marginTop:'2px' }}>{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
