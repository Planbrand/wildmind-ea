'use client'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { importContacts, ContactRow } from './actions'

function parseCSV(text: string): ContactRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse header row — handle quoted fields
  const parseRow = (line: string): string[] => {
    const fields: string[] = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else cur += ch
    }
    fields.push(cur.trim())
    return fields
  }

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_'))

  const col = (headers: string[], ...names: string[]) =>
    names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1

  const iName    = col(headers, 'name', 'full_name', 'contact_name')
  const iEmail   = col(headers, 'email', 'email_address')
  const iPhone   = col(headers, 'phone', 'phone_number', 'mobile', 'tel')
  const iCompany = col(headers, 'company', 'organisation', 'organization', 'company_name')
  const iRole    = col(headers, 'role', 'title', 'job_title', 'position')
  const iCountry = col(headers, 'country', 'location')
  const iStage   = col(headers, 'stage', 'status', 'lead_status')
  const iNotes   = col(headers, 'notes', 'note', 'comments')

  return lines.slice(1).map(line => {
    const cells = parseRow(line)
    const get = (i: number) => (i >= 0 ? cells[i] || '' : '')
    return {
      name:    get(iName),
      email:   get(iEmail),
      phone:   get(iPhone),
      company: get(iCompany),
      role:    get(iRole),
      country: get(iCountry),
      stage:   get(iStage),
      notes:   get(iNotes),
    }
  }).filter(r => r.name.trim())
}

export function UploadContactsButton({ viewName }: { viewName?: string | null }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<ContactRow[]>([])
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ imported?: number; error?: string } | null>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResult(null)
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setRows(parseCSV(text))
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setSaving(true)
    setResult(null)
    try {
      const res = await importContacts(rows, viewName)
      setResult(res)
      if (!res.error) {
        router.refresh()
        setTimeout(() => { setOpen(false); setRows([]); setFileName(''); setResult(null) }, 1200)
      }
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setOpen(false); setRows([]); setFileName(''); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border)',
        background: 'transparent', color: 'var(--muted)', fontSize: '12px',
        fontWeight: 600, cursor: 'pointer',
      }}>
        ↑ Import CSV
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '28px', width: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>Import contacts from CSV</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
              Columns detected: <code style={{ fontSize: '11px', background: 'var(--bg)', padding: '1px 5px', borderRadius: 4 }}>name</code>, email, phone, company, role, country, stage, notes
            </div>

            {/* Drop zone */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '28px', borderRadius: '10px',
              border: '2px dashed var(--border)', cursor: 'pointer',
              background: fileName ? 'var(--bg)' : 'transparent', marginBottom: '16px',
            }}>
              <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
              <span style={{ fontSize: '22px' }}>📄</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                {fileName || 'Click to choose a CSV file'}
              </span>
              {rows.length > 0 && (
                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                  {rows.length} rows ready to import
                </span>
              )}
            </label>

            {/* Preview */}
            {rows.length > 0 && (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {['Name', 'Email', 'Company', 'Stage'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 6).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '6px 10px', color: 'var(--text)', fontWeight: 500 }}>{r.name}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.email || '—'}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.company || '—'}</td>
                        <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{r.stage || 'cold'}</td>
                      </tr>
                    ))}
                    {rows.length > 6 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '6px 10px', color: 'var(--dim)', fontStyle: 'italic' }}>
                          …and {rows.length - 6} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {result && (
              <div style={{
                fontSize: '12px', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px',
                background: result.error ? 'rgba(220,38,38,.06)' : 'rgba(22,163,74,.06)',
                border: `1px solid ${result.error ? 'rgba(220,38,38,.2)' : 'rgba(22,163,74,.2)'}`,
                color: result.error ? '#dc2626' : '#16a34a',
              }}>
                {result.error ? result.error : `✓ Imported ${result.imported} contacts`}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={handleClose} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleImport} disabled={saving || rows.length === 0} style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                background: 'var(--accent)', color: '#fff', fontSize: '13px',
                fontWeight: 600, cursor: rows.length === 0 ? 'not-allowed' : 'pointer',
                opacity: rows.length === 0 ? 0.5 : 1,
              }}>
                {saving ? 'Importing…' : `Import ${rows.length > 0 ? rows.length : ''} contacts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
