'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Task = {
  id: string
  text: string
  column_key: 'urgent' | 'today' | 'week' | 'ea' | 'done'
  is_done: boolean
  sort_order: number
  owner_id: string
  notes?: string | null
}

const COLUMNS: { key: Task['column_key']; label: string; color: string; bg: string; hint: string }[] = [
  { key: 'urgent', label: 'Urgent',     color: '#dc2626', bg: 'rgba(220,38,38,.05)',   hint: 'Needs doing today' },
  { key: 'today',  label: 'Today',      color: '#b45309', bg: 'rgba(180,83,9,.05)',    hint: 'On your plate' },
  { key: 'week',   label: 'This Week',  color: '#6b7280', bg: 'var(--surface)',         hint: 'Planned for the week' },
  { key: 'ea',     label: 'EA',         color: '#059669', bg: 'rgba(5,150,105,.05)',   hint: 'Delegated to your EA' },
  { key: 'done',   label: 'Done',       color: '#9ca3af', bg: 'transparent',            hint: 'Completed' },
]

type CardModal = { task: Task; editing: boolean; draftText: string; draftNotes: string }

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks]       = useState<Task[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<Task['column_key'] | null>(null)
  const [draftText, setDraftText] = useState('')
  const [modal, setModal]       = useState<CardModal | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('tasks').select('*').eq('owner_id', user.id).order('sort_order')
        .then(({ data }) => setTasks((data as Task[]) || []))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addTask(col: Task['column_key']) {
    const text = draftText.trim()
    if (!text || !userId) { setAddingTo(null); setDraftText(''); return }
    const optimistic: Task = { id: crypto.randomUUID(), text, column_key: col, is_done: false, sort_order: 9999, owner_id: userId }
    setTasks(prev => [...prev, optimistic])
    setDraftText('')
    setAddingTo(null)
    const { data } = await supabase.from('tasks').insert({ text, column_key: col, is_done: false, sort_order: 9999, owner_id: userId }).select().single()
    if (data) setTasks(prev => prev.map(t => t.id === optimistic.id ? (data as Task) : t))
  }

  async function moveTask(task: Task, col: Task['column_key']) {
    const done = col === 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, column_key: col, is_done: done } : t))
    await supabase.from('tasks').update({ column_key: col, is_done: done }).eq('id', task.id)
    if (modal?.task.id === task.id) setModal(m => m ? { ...m, task: { ...m.task, column_key: col, is_done: done } } : null)
  }

  async function toggleDone(task: Task) {
    const next = !task.is_done
    const nextCol: Task['column_key'] = next ? 'done' : 'today'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: next, column_key: nextCol } : t))
    await supabase.from('tasks').update({ is_done: next, column_key: nextCol }).eq('id', task.id)
  }

  async function saveCard() {
    if (!modal) return
    const updated = { ...modal.task, text: modal.draftText.trim() || modal.task.text, notes: modal.draftNotes || null }
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setModal(null)
    await supabase.from('tasks').update({ text: updated.text, notes: updated.notes }).eq('id', updated.id)
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    setModal(null)
    await supabase.from('tasks').delete().eq('id', id)
  }

  function openCard(task: Task) {
    setModal({ task, editing: false, draftText: task.text, draftNotes: task.notes || '' })
  }

  const activeCols = COLUMNS.filter(c => c.key !== 'done')
  const doneCol = COLUMNS.find(c => c.key === 'done')!

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Tasks</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
            {tasks.filter(t => !t.is_done).length} active · {tasks.filter(t => t.is_done).length} done
          </div>
        </div>
        <button onClick={() => { setAddingTo('today'); setDraftText('') }}
          style={{ padding: '6px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          + Add task
        </button>
      </div>

      {/* Board */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '12px', height: '100%', minWidth: 'max-content' }}>
          {activeCols.map(col => {
            const colTasks = tasks.filter(t => t.column_key === col.key)
            return (
              <div key={col.key} style={{ width: 220, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                {/* Column header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', padding: '0 2px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>{col.label}</span>
                  <span style={{ fontSize: '10px', color: 'var(--dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 6px' }}>{colTasks.length}</span>
                  {col.key === 'ea' && <span style={{ fontSize: '9px', color: col.color, fontWeight: 700 }}>✦</span>}
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {colTasks.map(task => (
                    <div key={task.id}
                      onClick={() => openCard(task)}
                      style={{ background: col.bg, border: `1px solid ${task.is_done ? 'var(--border)' : 'var(--border)'}`, borderLeft: `3px solid ${col.color}`, borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', transition: 'opacity .15s' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <button onClick={e => { e.stopPropagation(); toggleDone(task) }}
                          style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${task.is_done ? col.color : 'var(--dim)'}`, background: task.is_done ? col.color : 'transparent', flexShrink: 0, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                          {task.is_done && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                        <span style={{ fontSize: '12px', color: task.is_done ? 'var(--dim)' : 'var(--text)', textDecoration: task.is_done ? 'line-through' : 'none', lineHeight: 1.5, flex: 1 }}>{task.text}</span>
                      </div>
                      {task.notes && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px', marginLeft: '22px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.notes}</div>}
                    </div>
                  ))}

                  {/* Inline add */}
                  {addingTo === col.key ? (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: '8px', padding: '8px 10px' }}>
                      <input autoFocus value={draftText} onChange={e => setDraftText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addTask(col.key); if (e.key === 'Escape') { setAddingTo(null); setDraftText('') } }}
                        onBlur={() => addTask(col.key)}
                        placeholder="Task name…"
                        style={{ width: '100%', fontSize: '12px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', boxSizing: 'border-box' }} />
                      <div style={{ fontSize: '10px', color: 'var(--dim)', marginTop: '4px' }}>Enter to save · Esc to cancel</div>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTo(col.key); setDraftText('') }}
                      style={{ fontSize: '11px', color: 'var(--dim)', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '7px', cursor: 'pointer', padding: '7px 10px', textAlign: 'left', fontWeight: 500, marginTop: colTasks.length > 0 ? 0 : 0 }}>
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* Done column — collapsible */}
          <div style={{ width: 200, display: 'flex', flexDirection: 'column', flexShrink: 0, opacity: 0.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', padding: '0 2px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: doneCol.color }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>Done</span>
              <span style={{ fontSize: '10px', color: 'var(--dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0 6px' }}>{tasks.filter(t => t.is_done).length}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tasks.filter(t => t.is_done).map(task => (
                <div key={task.id} onClick={() => openCard(task)}
                  style={{ border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', cursor: 'pointer', display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                  <button onClick={e => { e.stopPropagation(); toggleDone(task) }}
                    style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid ${doneCol.color}`, background: doneCol.color, flexShrink: 0, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--dim)', textDecoration: 'line-through', lineHeight: 1.5 }}>{task.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card modal */}
      {modal && (
        <div onClick={() => saveCard()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: '14px', padding: '24px', width: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Title */}
            <textarea
              value={modal.draftText}
              onChange={e => setModal(m => m ? { ...m, draftText: e.target.value } : null)}
              rows={2}
              style={{ width: '100%', fontSize: '15px', fontWeight: 700, color: 'var(--text)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4, boxSizing: 'border-box', marginBottom: '12px' }}
            />

            {/* Notes */}
            <textarea
              value={modal.draftNotes}
              onChange={e => setModal(m => m ? { ...m, draftNotes: e.target.value } : null)}
              placeholder="Add notes…"
              rows={3}
              style={{ width: '100%', fontSize: '13px', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, padding: '8px 12px', boxSizing: 'border-box', marginBottom: '16px' }}
            />

            {/* Move to column */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '8px' }}>Move to</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {COLUMNS.map(col => (
                  <button key={col.key} onClick={() => moveTask(modal.task, col.key)}
                    style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: `1px solid ${modal.task.column_key === col.key ? col.color : 'var(--border)'}`, background: modal.task.column_key === col.key ? col.color + '18' : 'transparent', color: modal.task.column_key === col.key ? col.color : 'var(--muted)', cursor: 'pointer' }}>
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => deleteTask(modal.task.id)}
                style={{ fontSize: '12px', color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}>
                Delete
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setModal(null)}
                  style={{ padding: '7px 16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={saveCard}
                  style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
