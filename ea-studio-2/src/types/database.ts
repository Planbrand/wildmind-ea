// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any

// Minimal Database type — enough for the Supabase client to accept table names.
// All table data is typed via the Row types below.
export interface Database {
  public: {
    Tables: Record<string, {
      Row: Record<string, unknown>
      Insert: Record<string, unknown>
      Update: Record<string, unknown>
    }>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ── Convenience row types ─────────────────────────────────────

export interface Brand {
  id: string
  owner_id: string
  name: string
  slug: string
  color: string
  main_inbox: string | null
  inbox_count: number
  daily_capacity: number
  mrr_pence: number
  pipeline_value_pence: number
  description: string | null
  website: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  owner_id: string
  brand_id: string | null
  name: string
  email: string | null
  phone: string | null
  role: string | null
  company: string | null
  country: string | null
  stage: string
  deal_value_pence: number
  emails_sent: number
  last_contact_date: string | null
  next_action: string | null
  next_action_date: string | null
  source_inbox: string | null
  notes: string | null
  ea_note: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  owner_id: string
  brand_id: string | null
  text: string
  notes: string | null
  column_key: string
  is_done: boolean
  due_date: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Goal {
  id: string
  owner_id: string
  brand_id: string | null
  title: string
  description: string | null
  goal_type: string
  target_value: number | null
  current_value: number
  unit: string | null
  progress_pct: number
  target_date: string | null
  status: string
  ea_insight: string | null
  goal_milestones?: GoalMilestone[]
  created_at: string
  updated_at: string
}

export interface GoalMilestone {
  id: string
  owner_id: string
  goal_id: string
  text: string
  is_done: boolean
  done_date: string | null
  due_date: string | null
  sort_order: number
  created_at: string
}

export interface FinanceRecord {
  id: string
  owner_id: string
  brand_id: string
  record_month: string
  mrr_pence: number
  arr_pence: number
  pipeline_value_pence: number
  notes: string | null
  created_at: string
}

export interface Agent {
  id: string
  owner_id: string
  brand_id: string | null
  name: string
  agent_type: string
  description: string | null
  is_active: boolean
  last_run_at: string | null
  emails_handled: number
  queued_actions: number
  config: Json
  created_at: string
  updated_at: string
}

export interface AIMessage {
  id: string
  owner_id: string
  brand_id: string | null
  role: string
  content: string
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  display_name: string | null
  timezone: string | null
  location: string | null
  archetype: string | null
  identity_core: string | null
  one_sentence: string | null
  mission_statement: string | null
  core_values: string[] | null
  thinking_style: string | null
  decision_style: string | null
  energy_pattern: string | null
  stress_signals: string | null
  drift_patterns: string | null
  growth_edge: string | null
  sleep_target_hrs: number | null
  exercise_routine: string | null
  diet_notes: string | null
  current_physical: string | null
  relationship_status: string | null
  living_situation: string | null
  biggest_constraint: string | null
  life_matrix: Record<string, { status?: string; focus?: string; score?: number }>
  created_at: string
  updated_at: string
}

export interface UserHabit {
  id: string
  owner_id: string
  habit_name: string
  category: string
  frequency: string
  target_time: string | null
  current_streak: number
  best_streak: number
  is_active: boolean
  ea_note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface HabitLog {
  id: string
  owner_id: string
  habit_id: string
  log_date: string
  completed: boolean
  note: string | null
  created_at: string
}

export interface PersonalContact {
  id: string
  owner_id: string
  name: string
  email: string | null
  phone: string | null
  relationship_type: string
  relationship_quality: string
  last_contact_date: string | null
  next_action: string | null
  ea_note: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EAAgenda {
  id: string
  owner_id: string
  brand_id: string | null
  entry_type: string
  life_area: string | null
  title: string
  body: string | null
  is_pinned: boolean
  is_user_edited: boolean
  priority: number
  created_at: string
  updated_at: string
}

export interface EAFlag {
  id: string
  owner_id: string
  type: string
  life_area: string | null
  title: string
  body: string | null
  is_active: boolean
  source: string
  created_at: string
  updated_at: string
}

export interface EADNA {
  id: string
  owner_id: string
  layer: string
  field_id: string
  label: string
  body: string | null
  locked: boolean
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface EARule {
  id: string
  owner_id: string
  rule: string
  category: string
  is_active: boolean
  priority: number
  created_at: string
  updated_at: string
}
