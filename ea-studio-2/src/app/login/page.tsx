'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/studio')
    router.refresh()
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ fontFamily:'Times New Roman, Times, serif', fontSize:'28px', fontWeight:700, color:'var(--text)', marginBottom:'6px' }}>
            Wild<span style={{ color:'var(--accent)' }}>mind</span>
          </div>
          <div style={{ fontSize:'13px', color:'var(--muted)' }}>EA Studio — sign in to your workspace</div>
        </div>

        <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'14px', padding:'32px', boxShadow:'0 4px 24px rgba(0,0,0,.06)' }}>
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'6px' }}>Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', color:'var(--text)', outline:'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize:'11px', fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.06em', display:'block', marginBottom:'6px' }}>Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border)', borderRadius:'8px', fontSize:'13px', color:'var(--text)', outline:'none' }}
              />
            </div>
            {error && (
              <div style={{ fontSize:'12px', color:'var(--danger)', background:'rgba(220,38,38,.06)', border:'1px solid rgba(220,38,38,.2)', borderRadius:'6px', padding:'8px 12px' }}>
                {error}
              </div>
            )}
            <button
              type="submit" disabled={loading}
              style={{ padding:'11px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:600, opacity: loading ? 0.7 : 1, marginTop:'4px' }}
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:'20px', fontSize:'12px', color:'var(--muted)' }}>
            No account?{' '}
            <Link href="/signup" style={{ color:'var(--accent)', fontWeight:600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
