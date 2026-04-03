'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'
import type { UserHabit } from '@/types/database'

const CATEGORIES = ['morning','evening','weekly','health','work','social']
const CAT_COLOR: Record<string,string> = { morning:'#F59E0B', evening:'#8B5CF6', weekly:'#6366F1', health:'#059669', work:'#0EA5E9', social:'#EC4899' }
const today = new Date().toISOString().slice(0, 10)

export default function HabitsPage() {
  const supabase = createClient()
  const [habits, setHabits] = useState<UserHabit[]>([])
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ habit_name:'', category:'morning', frequency:'daily', target_time:'' })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: h }, { data: logs }] = await Promise.all([
      supabase.from('user_habits').select('*').eq('owner_id', user.id).eq('is_active', true).order('sort_order'),
      supabase.from('habit_logs').select('habit_id').eq('owner_id', user.id).eq('log_date', today).eq('completed', true),
    ])
    setHabits(h || [])
    setLoggedToday(new Set((logs || []).map(l => l.habit_id)))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleHabit(habitId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const done = loggedToday.has(habitId)
    if (done) {
      await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('log_date', today)
      setLoggedToday(prev => { const s = new Set(prev); s.delete(habitId); return s })
    } else {
      await supabase.from('habit_logs').upsert({ owner_id: user.id, habit_id: habitId, log_date: today, completed: true })
      setLoggedToday(prev => new Set([...prev, habitId]))
      // bump streak
      const habit = habits.find(h => h.id === habitId)
      if (habit) {
        const newStreak = habit.current_streak + 1
        await supabase.from('user_habits').update({ current_streak: newStreak, best_streak: Math.max(newStreak, habit.best_streak) }).eq('id', habitId)
        setHabits(prev => prev.map(h => h.id === habitId ? { ...h, current_streak: newStreak } : h))
      }
    }
  }

  async function addHabit() {
    if (!form.habit_name.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('user_habits').insert({
      owner_id: user.id, ...form, sort_order: habits.length
    }).select().single()
    if (data) { setHabits(prev => [...prev, data]); setForm({ habit_name:'', category:'morning', frequency:'daily', target_time:'' }); setShowAdd(false) }
  }

  const completedCount = habits.filter(h => loggedToday.has(h.id)).length

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="Habits"
        subtitle={loading ? '' : `${completedCount}/${habits.length} done today`}
        action={
          <button onClick={() => setShowAdd(s => !s)} style={{ padding:'7px 14px', borderRadius:'7px', fontSize:'12px', fontWeight:600, background:'var(--accent)', color:'#fff', border:'none', cursor:'pointer' }}>
            + Add habit
          </button>
        }
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {showAdd && (
          <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'10px', padding:'16px', marginBottom:'14px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 120px auto', gap:'10px', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Habit name *</div>
                <input value={form.habit_name} onChange={e => setForm(f => ({...f, habit_name: e.target.value}))} placeholder="Morning pages" style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Category</div>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Frequency</div>
                <select value={form.frequency} onChange={e => setForm(f => ({...f, frequency: e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }}>
                  <option value="daily">Daily</option><option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize:'10px', fontWeight:700, color:'var(--dim)', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'.06em' }}>Time</div>
                <input type="time" value={form.target_time} onChange={e => setForm(f => ({...f, target_time: e.target.value}))} style={{ width:'100%', padding:'8px 10px', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'13px', color:'var(--text)', outline:'none' }} />
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button onClick={addHabit} style={{ padding:'8px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:'7px', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>Save</button>
                <button onClick={() => setShowAdd(false)} style={{ padding:'8px 14px', background:'var(--bg)', color:'var(--muted)', border:'1px solid var(--border)', borderRadius:'7px', fontSize:'12px', cursor:'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div style={{ fontSize:'13px', color:'var(--muted)', padding:'20px' }}>Loading…</div> : habits.length === 0 ? (
          <EmptyState icon="↻" label="No habits yet" hint="Track your routines and EA will notice your patterns." />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'10px' }}>
            {habits.map(h => {
              const done = loggedToday.has(h.id)
              return (
                <div key={h.id} style={{ background:'var(--bg)', border:`1px solid ${done ? 'rgba(5,150,105,.3)' : 'var(--border)'}`, borderRadius:'10px', padding:'16px', boxShadow:'0 1px 2px rgba(0,0,0,.04)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                    <div>
                      <div style={{ fontSize:'13px', fontWeight:700, color:'var(--text)', marginBottom:'4px' }}>{h.habit_name}</div>
                      <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                        <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background: CAT_COLOR[h.category]+'18', color: CAT_COLOR[h.category], fontWeight:600 }}>{h.category}</span>
                        <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'10px', background:'var(--surface-2)', color:'var(--dim)' }}>{h.frequency}</span>
                        {h.target_time && <span style={{ fontSize:'10px', color:'var(--dim)' }}>{h.target_time}</span>}
                      </div>
                    </div>
                    <button onClick={() => toggleHabit(h.id)} style={{
                      width:28, height:28, borderRadius:'50%', flexShrink:0,
                      background: done ? 'var(--accent)' : 'transparent',
                      border: `2px solid ${done ? 'var(--accent)' : 'var(--border-mid)'}`,
                      color: done ? '#fff' : 'transparent', fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                    }}>✓</button>
                  </div>
                  <div style={{ display:'flex', gap:'16px', marginBottom:'8px' }}>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'22px', fontWeight:700, color:'var(--accent)', lineHeight:1 }}>{h.current_streak}</div>
                      <div style={{ fontSize:'9px', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.06em' }}>streak</div>
                    </div>
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'22px', fontWeight:700, color:'var(--muted)', lineHeight:1 }}>{h.best_streak}</div>
                      <div style={{ fontSize:'9px', color:'var(--dim)', textTransform:'uppercase', letterSpacing:'.06em' }}>best</div>
                    </div>
                  </div>
                  {h.ea_note && <div style={{ fontSize:'11px', color:'var(--dim)', fontStyle:'italic', borderTop:'1px solid var(--border)', paddingTop:'8px' }}>EA: {h.ea_note}</div>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
