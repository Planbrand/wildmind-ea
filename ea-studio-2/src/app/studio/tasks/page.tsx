'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import PanelHeader from '@/components/ui/PanelHeader'
import EmptyState from '@/components/ui/EmptyState'

type Task = {
  id: string
  text: string
  column_key: 'urgent' | 'today' | 'week' | 'done'
  is_done: boolean
  sort_order: number
  owner_id: string
}

const COLUMNS: { key: Task['column_key']; label: string; color: string; bg: string }[] = [
  { key: 'urgent', label: 'Urgent',    color: 'var(--danger)',  bg: 'rgba(220,38,38,.06)' },
  { key: 'today',  label: 'Today',     color: 'var(--warn)',    bg: 'rgba(180,83,9,.06)'  },
  { key: 'week',   label: 'This Week', color: 'var(--muted)',   bg: 'var(--surface-2)'    },
  { key: 'done',   label: 'Done',      color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
]

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks]         = useState<Task[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [addingTo, setAddingTo]   = useState<Task['column_key'] | null>(null)
  const [draftText, setDraftText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', user.id)
        .order('sort_order')
        .then(({ data }) => setTasks((data as Task[]) || []))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (addingTo && inputRef.current) inputRef.current.focus()
  }, [addingTo])

  async function toggleDone(task: Task) {
    const next = !task.is_done
    const nextKey: Task['column_key'] = next ? 'done' : 'today'
    setTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, is_done: next, column_key: nextKey } : t)
    )
    await supabase
      .from('tasks')
      .update({ is_done: next, column_key: nextKey })
      .eq('id', task.id)
  }

  async function addTask(col: Task['column_key']) {
    const text = draftText.trim()
    if (!text || !userId) { setAddingTo(null); setDraftText(''); return }

    const optimistic: Task = {
      id: crypto.randomUUID(),
      text,
      column_key: col,
      is_done: false,
      sort_order: 9999,
      owner_id: userId,
    }
    setTasks(prev => [...prev, optimistic])
    setDraftText('')
    setAddingTo(null)

    const { data } = await supabase
      .from('tasks')
      .insert({ text, column_key: col, is_done: false, sort_order: 9999, owner_id: userId })
      .select()
      .single()

    if (data) {
      setTasks(prev => prev.map(t => t.id === optimistic.id ? (data as Task) : t))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, col: Task['column_key']) {
    if (e.key === 'Enter') addTask(col)
    if (e.key === 'Escape') { setAddingTo(null); setDraftText('') }
  }

  const label = (t: string, color = 'var(--dim)') => (
    <div style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color, marginBottom:'10px' }}>{t}</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      <PanelHeader
        title="Tasks"
        subtitle="Manage your task board"
        action={
          <button
            onClick={() => { setAddingTo('today'); setDraftText('') }}
            style={{ fontSize:'12px', fontWeight:600, color:'var(--accent)', background:'var(--accent-soft)', border:'none', borderRadius:'6px', padding:'6px 12px', cursor:'pointer' }}
          >
            + Add task
          </button>
        }
      />
      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'12px', alignItems:'start' }}>
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.column_key === col.key)
            return (
              <div
                key={col.key}
                style={{
                  background: col.bg,
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {label(col.label, col.color)}

                {colTasks.length === 0 && addingTo !== col.key && (
                  <div style={{ fontSize:'11px', color:'var(--dim)', padding:'4px 0 10px' }}>No tasks here</div>
                )}

                {colTasks.map(task => (
                  <div
                    key={task.id}
                    style={{ display:'flex', gap:'8px', alignItems:'flex-start', padding:'6px 0', borderBottom:'1px solid var(--border)' }}
                  >
                    <button
                      onClick={() => toggleDone(task)}
                      style={{
                        width: 15, height: 15, borderRadius: '50%',
                        border: `1.5px solid ${task.is_done ? col.color : 'var(--dim)'}`,
                        background: task.is_done ? col.color : 'transparent',
                        flexShrink: 0, marginTop: 2, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                      aria-label="Toggle done"
                    >
                      {task.is_done && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span style={{
                      fontSize: '12px',
                      color: task.is_done ? 'var(--dim)' : 'var(--text)',
                      textDecoration: task.is_done ? 'line-through' : 'none',
                      lineHeight: 1.5,
                    }}>
                      {task.text}
                    </span>
                  </div>
                ))}

                {addingTo === col.key && (
                  <div style={{ marginTop: '6px' }}>
                    <input
                      ref={inputRef}
                      value={draftText}
                      onChange={e => setDraftText(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, col.key)}
                      onBlur={() => addTask(col.key)}
                      placeholder="Task name…"
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        fontSize: '12px', padding: '6px 8px',
                        border: '1px solid var(--border-mid)', borderRadius: '6px',
                        background: 'var(--bg)', color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <div style={{ fontSize:'10px', color:'var(--dim)', marginTop:'3px' }}>Enter to save · Esc to cancel</div>
                  </div>
                )}

                {addingTo !== col.key && (
                  <button
                    onClick={() => { setAddingTo(col.key); setDraftText('') }}
                    style={{
                      marginTop: '8px', fontSize: '11px', color: col.color,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '4px 0', textAlign: 'left', fontWeight: 600,
                    }}
                  >
                    + Add task
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
