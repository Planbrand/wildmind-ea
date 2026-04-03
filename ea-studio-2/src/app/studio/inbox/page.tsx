import PanelHeader from '@/components/ui/PanelHeader'

export default function InboxPage() {
  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader title="Inbox" subtitle="Email threads synced from your automation scripts" />
      <div style={{ flex:1, overflowY:'auto', padding:'40px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', gap:'16px' }}>
        <div style={{ fontSize:'36px', color:'var(--border-mid)' }}>✉</div>
        <div style={{ fontSize:'15px', fontWeight:700, color:'var(--text)' }}>Inbox syncs from your email automation</div>
        <div style={{ fontSize:'13px', color:'var(--muted)', maxWidth:480, lineHeight:1.8 }}>
          Your 79 Gmail inboxes are managed by your Python automation scripts (<code style={{ fontSize:'12px', background:'var(--surface-2)', padding:'1px 5px', borderRadius:'4px' }}>wildmind_email.py</code>).
          Threads and drafts written by those scripts will appear here automatically once synced to Supabase.
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'10px', padding:'20px 24px', maxWidth:440, textAlign:'left', marginTop:'8px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'12px' }}>To connect your scripts</div>
          {[
            'Add SUPABASE_URL and SUPABASE_SERVICE_KEY to your .env',
            'In wildmind_email.py, import supabase-py and insert threads',
            'Point each inbox to a brand_id from the brands table',
            'Threads will appear here in real time',
          ].map((s, i) => (
            <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'8px', fontSize:'12px', color:'var(--text)' }}>
              <span style={{ width:18, height:18, borderRadius:'50%', background:'var(--accent-soft)', color:'var(--accent)', fontSize:'10px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
