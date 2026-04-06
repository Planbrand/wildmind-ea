// Run: node scripts/check-schema.mjs
// Checks which columns are missing from each entity table

const URL = 'https://wyyyrkchkcfqyvcfvobc.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5eXlya2Noa2NmcXl2Y2Z2b2JjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIyNzI1NiwiZXhwIjoyMDkwODAzMjU2fQ.C-oD2MMhGyrg6cbuc8r3X2uvWzopSO7poPtdifqNDig'

const EXPECTED = {
  expenses: ['id','owner_id','brand_id','merchant','description','amount_pence','currency','frequency','date','brand_ids','contact_id','created_at','updated_at','view_tags'],
  tasks: ['id','owner_id','text','column_key','is_done','sort_order','view_tags'],
  pipeline_deals: ['id','owner_id','stage','value_pence','contact_id','view_tags'],
  campaigns: ['id','owner_id','name','status','view_tags'],
  finance_transactions: ['id','owner_id','date','amount_pence','direction','view_tags'],
  goals: ['id','owner_id','title','status','priority','view_tags'],
  contacts: ['id','owner_id','name','stage','view_tags'],
  ea_agenda: ['id','owner_id','title','is_pinned','view_tags'],
}

async function getColumns(table) {
  const res = await fetch(
    `${URL}/rest/v1/${table}?limit=0`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json' } }
  )
  // OPTIONS request to get column info
  const res2 = await fetch(
    `${URL}/rest/v1/${table}?limit=1`,
    { headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Accept: 'application/json', 'Accept-Profile': 'public' } }
  )
  const data = await res2.json()
  if (Array.isArray(data) && data.length > 0) return Object.keys(data[0])
  // If table is empty, try inserting a dummy and rolling back — instead use info schema
  return null
}

async function checkViaInfoSchema(table) {
  // Use PostgREST to query information_schema
  const res = await fetch(
    `${URL}/rest/v1/rpc/get_columns`,
    {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tbl: table })
    }
  )
  return null // fallback if RPC doesn't exist
}

// Use direct REST select with * on each table to discover columns
async function run() {
  console.log('\n=== Schema Check ===\n')
  const missing = {}

  for (const [table, expected] of Object.entries(EXPECTED)) {
    const tableMissing = []
    for (const col of expected) {
      const res = await fetch(
        `${URL}/rest/v1/${table}?select=${col}&limit=1`,
        { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
      )
      if (!res.ok) {
        tableMissing.push(col)
      }
    }
    if (tableMissing.length === 0) {
      console.log(`✅ ${table}: OK`)
    } else {
      console.log(`❌ ${table}: missing → ${tableMissing.join(', ')}`)
      missing[table] = tableMissing
    }
  }

  // Generate fix SQL
  if (Object.keys(missing).length > 0) {
    console.log('\n=== Run this SQL in Supabase SQL Editor ===\n')
    const colDefs = {
      currency:    "TEXT NOT NULL DEFAULT 'GBP'",
      frequency:   "TEXT NOT NULL DEFAULT 'one_time'",
      brand_ids:   "UUID[] NOT NULL DEFAULT '{}'",
      view_tags:   "TEXT[] NOT NULL DEFAULT '{}'",
      amount_pence:"INTEGER NOT NULL DEFAULT 0",
      direction:   "TEXT NOT NULL DEFAULT 'out'",
      sort_order:  "INTEGER NOT NULL DEFAULT 0",
      is_done:     "BOOLEAN NOT NULL DEFAULT FALSE",
      column_key:  "TEXT NOT NULL DEFAULT 'today'",
      stage:       "TEXT NOT NULL DEFAULT 'cold'",
      is_pinned:   "BOOLEAN NOT NULL DEFAULT FALSE",
      priority:    "INTEGER NOT NULL DEFAULT 3",
      status:      "TEXT NOT NULL DEFAULT 'active'",
      updated_at:  "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
      value_pence: "INTEGER NOT NULL DEFAULT 0",
    }
    for (const [table, cols] of Object.entries(missing)) {
      for (const col of cols) {
        const def = colDefs[col] || 'TEXT'
        console.log(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} ${def};`)
      }
    }
  } else {
    console.log('\n✅ All columns present. Schema looks good.')
  }
}

run().catch(console.error)
