import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface TraceField {
  field_id: string
  label: string
  ea_instruction: string | null
  body: string | null
  was_ghost: boolean
  was_applied: boolean
}

export interface TraceResponse {
  content: string
  trace: TraceField[]
}

export async function POST(request: Request) {
  const { content, view_context } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'No content' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Load all DNA fields (including ghosts, so we can show them as skipped)
  const [{ data: profile }, { data: allDnaFields }, { data: flags }, { data: rules }] = await Promise.all([
    db.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
    db.from('ea_dna').select('*').eq('owner_id', user.id).eq('status', 'active').order('layer').order('sort_order'),
    db.from('ea_flags').select('*').eq('owner_id', user.id).eq('is_active', true),
    db.from('ea_rules').select('*').eq('owner_id', user.id).eq('is_active', true).order('priority'),
  ])

  // Separate active vs ghost fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeDnaFields = (allDnaFields || []).filter((f: any) => !f.is_ghost)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ghostDnaFields = (allDnaFields || []).filter((f: any) => f.is_ghost)

  // Build trace record
  const trace: TraceField[] = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...activeDnaFields.map((f: any) => ({
      field_id: f.field_id,
      label: f.label,
      ea_instruction: f.ea_instruction || null,
      body: f.body || null,
      was_ghost: false,
      was_applied: true,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...ghostDnaFields.map((f: any) => ({
      field_id: f.field_id,
      label: f.label,
      ea_instruction: f.ea_instruction || null,
      body: f.body || null,
      was_ghost: true,
      was_applied: false,
    })),
  ]

  // Build system prompt (same logic as /api/coach)
  const profileSection = profile ? `
## User Profile
Name: ${profile.display_name || 'Unknown'}
Archetype: ${profile.archetype || 'Not set'}
Identity: ${profile.identity_core || 'Not set'}
Mission: ${profile.mission_statement || 'Not set'}
Thinking style: ${profile.thinking_style || 'Not set'}
Energy pattern: ${profile.energy_pattern || 'Not set'}
Drift patterns: ${profile.drift_patterns || 'Not set'}
Growth edge: ${profile.growth_edge || 'Not set'}
Biggest constraint: ${profile.biggest_constraint || 'Not set'}
` : ''

  const dnaSection = activeDnaFields.length > 0 ? `
## DNA Fields
${activeDnaFields.map((f: any) => {
    const instruction = f.ea_instruction ? `\nEA reads this as: ${f.ea_instruction}` : ''
    return `### ${f.field_id}: ${f.label}${instruction}\n${f.body || 'Not set'}`
  }).join('\n\n')}
` : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flagsSection = flags && flags.length > 0 ? `
## Active Flags
${flags.map((f: any) => `- [${f.type.toUpperCase()}] ${f.title}: ${f.body || ''}`).join('\n')}
` : ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rulesSection = rules && rules.length > 0 ? `
## EA Rules (follow these)
${rules.map((r: any) => `- [${r.category}] ${r.rule}`).join('\n')}
` : ''

  const viewSection = view_context
    ? `\n## Current View Context\nView: ${view_context.view_name}${view_context.is_studio ? ' (Studio — full access)' : ' (Scoped view)'}\n`
    : ''

  const systemPrompt = `You are Wildmind EA — a personal executive assistant and life coach. Your mission is helping the user achieve the best version of themselves.

You are direct, focused, and honest. You push back when needed. You don't flatter. You hold the user accountable to their declared goals.

${profileSection}${dnaSection}${flagsSection}${rulesSection}${viewSection}
Today's date: ${new Date().toISOString().slice(0, 10)}

When responding:
1. Apply what you know about this specific person
2. Reference their patterns, flags, and rules where relevant
3. Be direct and specific — no generic advice
4. If you spot a red flag pattern emerging, name it
5. Keep responses concise unless depth is needed`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    console.error('Anthropic trace error:', err)
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }

  const ai = await anthropicRes.json()
  const reply = ai.content?.[0]?.text || 'No response'

  await db.from('ai_messages').insert([
    { owner_id: user.id, role: 'user', content },
    { owner_id: user.id, role: 'assistant', content: reply },
  ])

  return NextResponse.json({ content: reply, trace } satisfies TraceResponse)
}
