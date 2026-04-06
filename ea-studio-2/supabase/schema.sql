-- ============================================================
-- WILDMIND EA STUDIO — Complete Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── brands ───────────────────────────────────────────────────
CREATE TABLE brands (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  slug                 TEXT        NOT NULL,           -- 'wildmind', 'brumah', etc.
  color                TEXT        NOT NULL DEFAULT '#059669',
  main_inbox           TEXT,
  inbox_count          INTEGER     NOT NULL DEFAULT 1,
  daily_capacity       INTEGER     NOT NULL DEFAULT 100,
  mrr_pence            INTEGER     NOT NULL DEFAULT 0,
  pipeline_value_pence INTEGER     NOT NULL DEFAULT 0,
  description          TEXT,
  website              TEXT,
  is_active            BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order           INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, slug)
);

-- ── contacts (pipeline) ───────────────────────────────────────
CREATE TABLE contacts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id          UUID        REFERENCES brands(id) ON DELETE SET NULL,
  name              TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  role              TEXT,
  company           TEXT,
  country           TEXT,
  stage             TEXT        NOT NULL DEFAULT 'cold',  -- cold/warm/hot/client
  deal_value_pence  INTEGER     NOT NULL DEFAULT 0,
  emails_sent       INTEGER     NOT NULL DEFAULT 0,
  last_contact_date DATE,
  next_action       TEXT,
  next_action_date  DATE,
  source_inbox      TEXT,
  notes             TEXT,
  ea_note           TEXT,                               -- EA's private note about this contact
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contacts_brand   ON contacts(brand_id);
CREATE INDEX idx_contacts_stage   ON contacts(stage);
CREATE INDEX idx_contacts_name    ON contacts USING gin(name gin_trgm_ops);

-- ── tasks ─────────────────────────────────────────────────────
CREATE TABLE tasks (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    UUID        REFERENCES brands(id) ON DELETE SET NULL,
  text        TEXT        NOT NULL,
  notes       TEXT,
  column_key  TEXT        NOT NULL DEFAULT 'today',   -- urgent/today/week/done
  is_done     BOOLEAN     NOT NULL DEFAULT FALSE,
  due_date    DATE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_col  ON tasks(column_key);
CREATE INDEX idx_tasks_done ON tasks(is_done);

-- ── goals ─────────────────────────────────────────────────────
CREATE TABLE goals (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id              UUID        REFERENCES brands(id) ON DELETE SET NULL,
  parent_goal_id        UUID        REFERENCES goals(id) ON DELETE SET NULL,
  title                 TEXT        NOT NULL,
  description           TEXT,
  goal_type             TEXT        NOT NULL DEFAULT 'business',  -- business/personal/health/relationship
  priority              INTEGER     NOT NULL DEFAULT 2,           -- 1=highest (North Star)
  target_value          NUMERIC,
  current_value         NUMERIC     NOT NULL DEFAULT 0,
  unit                  TEXT        DEFAULT 'GBP',
  financial_target_pence INTEGER,
  progress_pct          INTEGER     NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  target_date           DATE,
  status                TEXT        NOT NULL DEFAULT 'active',   -- active/paused/completed
  related_brand_ids     UUID[]      NOT NULL DEFAULT '{}',
  people_to_reach       TEXT[]      NOT NULL DEFAULT '{}',
  ea_insight            TEXT,
  view_tags             TEXT[]      NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── goal_milestones ───────────────────────────────────────────
CREATE TABLE goal_milestones (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id    UUID        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  text       TEXT        NOT NULL,
  is_done    BOOLEAN     NOT NULL DEFAULT FALSE,
  done_date  DATE,
  due_date   DATE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_milestones_goal ON goal_milestones(goal_id);

-- ── finance_records ───────────────────────────────────────────
CREATE TABLE finance_records (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id             UUID        NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  record_month         DATE        NOT NULL,   -- always first of month
  mrr_pence            INTEGER     NOT NULL DEFAULT 0,
  arr_pence            INTEGER     GENERATED ALWAYS AS (mrr_pence * 12) STORED,
  pipeline_value_pence INTEGER     NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_id, record_month)
);

-- ── expenses ─────────────────────────────────────────────────
CREATE TABLE expenses (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id     UUID        REFERENCES brands(id) ON DELETE SET NULL,
  merchant     TEXT        NOT NULL,
  description  TEXT,
  amount_pence INTEGER     NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'GBP',
  frequency    TEXT        NOT NULL DEFAULT 'one_time',  -- one_time/monthly/yearly
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  brand_ids    UUID[]      NOT NULL DEFAULT '{}',
  contact_id   UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_expenses_owner ON expenses(owner_id);
CREATE INDEX idx_expenses_date  ON expenses(date);

-- ── finance_transactions ─────────────────────────────────────
CREATE TABLE finance_transactions (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id TEXT,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  amount_pence INTEGER    NOT NULL DEFAULT 0,
  direction   TEXT        NOT NULL DEFAULT 'out',  -- in/out
  currency    TEXT        NOT NULL DEFAULT 'GBP',
  brand_id    UUID        REFERENCES brands(id) ON DELETE SET NULL,
  raw         JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, external_id)
);
CREATE INDEX idx_fin_tx_owner ON finance_transactions(owner_id);
CREATE INDEX idx_fin_tx_date  ON finance_transactions(date);

-- ── bank_connections ─────────────────────────────────────────
CREATE TABLE bank_connections (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    TEXT        NOT NULL,
  account_name  TEXT,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  last_synced   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── email_threads ─────────────────────────────────────────────
CREATE TABLE email_threads (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    UUID        REFERENCES brands(id) ON DELETE SET NULL,
  subject     TEXT,
  from_email  TEXT        NOT NULL,
  from_name   TEXT,
  snippet     TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  has_draft   BOOLEAN     NOT NULL DEFAULT FALSE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inbox       TEXT,
  category    TEXT        DEFAULT 'automated',  -- person/lead/promotion/automated
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_threads_owner    ON email_threads(owner_id);
CREATE INDEX idx_threads_brand    ON email_threads(brand_id);
CREATE INDEX idx_threads_category ON email_threads(category);
CREATE INDEX idx_threads_read     ON email_threads(is_read);

-- ── sections + workspace_views ────────────────────────────────
CREATE TABLE sections (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  icon       TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_views (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id    UUID        REFERENCES sections(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  slug          TEXT        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#059669',
  icon          TEXT,
  profile_image TEXT,
  cover_image   TEXT,
  is_studio     BOOLEAN     NOT NULL DEFAULT FALSE,
  filter_config JSONB       NOT NULL DEFAULT '{}',
  dna_field_ids UUID[]      NOT NULL DEFAULT '{}',
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, slug)
);
CREATE INDEX idx_views_section ON workspace_views(section_id);

-- ── view_tabs ─────────────────────────────────────────────────
CREATE TABLE view_tabs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_id    UUID        NOT NULL REFERENCES workspace_views(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  layout     TEXT        NOT NULL DEFAULT 'list',  -- list/kanban/calendar/table/analytics/chat
  config     JSONB       NOT NULL DEFAULT '{}',
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tabs_view ON view_tabs(view_id);

-- ── agents ────────────────────────────────────────────────────
CREATE TABLE agents (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id        UUID        REFERENCES brands(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  agent_type      TEXT        NOT NULL,   -- inbox/followup/briefing/outreach/custom
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_run_at     TIMESTAMPTZ,
  emails_handled  INTEGER     NOT NULL DEFAULT 0,
  queued_actions  INTEGER     NOT NULL DEFAULT 0,
  config          JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_messages (coach chat) ──────────────────────────────────
CREATE TABLE ai_messages (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id   UUID        REFERENCES brands(id),
  role       TEXT        NOT NULL,   -- user/assistant
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- EA INTELLIGENCE LAYER
-- Everything EA knows about the user as a whole person
-- ═══════════════════════════════════════════════════════════════

-- ── user_profile ─────────────────────────────────────────────
CREATE TABLE user_profile (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity
  display_name        TEXT,
  timezone            TEXT        DEFAULT 'Europe/London',
  location            TEXT,
  archetype           TEXT,                   -- "Builder", "Operator", "Creator"
  identity_core       TEXT,                   -- who they are at their core
  one_sentence        TEXT,                   -- how they describe themselves
  mission_statement   TEXT,                   -- declared life mission
  core_values         TEXT[],                 -- ["freedom","excellence","loyalty"]

  -- Thinking & behaviour patterns EA has learned
  thinking_style      TEXT,                   -- analytical, intuitive, reactive, systematic
  decision_style      TEXT,                   -- fast-and-iterate, slow-and-certain
  energy_pattern      TEXT,                   -- peak hours, crash triggers
  stress_signals      TEXT,                   -- how they behave under pressure
  drift_patterns      TEXT,                   -- what pulls them off track
  growth_edge         TEXT,                   -- what they're currently working to change

  -- Physical
  sleep_target_hrs    NUMERIC,
  exercise_routine    TEXT,
  diet_notes          TEXT,
  current_physical    TEXT,                   -- how they're doing right now

  -- Life context
  relationship_status TEXT,
  living_situation    TEXT,
  biggest_constraint  TEXT,                   -- what limits them most right now

  -- Life matrix (JSON object, one key per life area)
  life_matrix         JSONB       NOT NULL DEFAULT '{
    "health":        {"status": "", "focus": "", "score": 5},
    "mind":          {"status": "", "focus": "", "score": 5},
    "relationships": {"status": "", "focus": "", "score": 5},
    "finance":       {"status": "", "focus": "", "score": 5},
    "brands":        {"status": "", "focus": "", "score": 5},
    "purpose":       {"status": "", "focus": "", "score": 5},
    "fun":           {"status": "", "focus": "", "score": 5}
  }',

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── user_habits ───────────────────────────────────────────────
CREATE TABLE user_habits (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_name      TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'daily',  -- morning/evening/weekly/health/work/social
  frequency       TEXT        NOT NULL DEFAULT 'daily',  -- daily/weekly/custom
  target_time     TEXT,                                  -- "07:00"
  current_streak  INTEGER     NOT NULL DEFAULT 0,
  best_streak     INTEGER     NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  ea_note         TEXT,                                  -- EA's observation
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── habit_logs ────────────────────────────────────────────────
CREATE TABLE habit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id    UUID        NOT NULL REFERENCES user_habits(id) ON DELETE CASCADE,
  log_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  completed   BOOLEAN     NOT NULL DEFAULT TRUE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(habit_id, log_date)
);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);

-- ── personal_contacts ─────────────────────────────────────────
-- People in the user's personal life (separate from brand pipeline)
CREATE TABLE personal_contacts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  email                 TEXT,
  phone                 TEXT,
  relationship_type     TEXT        NOT NULL DEFAULT 'network',  -- partner/family/close_friend/mentor/network
  relationship_quality  TEXT        NOT NULL DEFAULT 'good',     -- strong/good/drifting/needs_attention
  last_contact_date     DATE,
  next_action           TEXT,
  ea_note               TEXT,                                    -- EA's observation about this relationship
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ea_agenda ─────────────────────────────────────────────────
-- EA's living notebook. Everything EA observes, plans, notes about the user.
-- User can read and edit all entries.
CREATE TABLE ea_agenda (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id       UUID        REFERENCES brands(id) ON DELETE SET NULL,
  entry_type     TEXT        NOT NULL DEFAULT 'note',  -- note/plan/reminder/win/concern/event/payment/task
  life_area      TEXT,                                 -- health/relationships/finance/brands/mind/purpose/fun
  title          TEXT        NOT NULL,
  body           TEXT,
  is_pinned      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_user_edited BOOLEAN     NOT NULL DEFAULT FALSE,
  priority       INTEGER     NOT NULL DEFAULT 2,       -- 1=high, 2=normal, 3=low
  reminder_at    TIMESTAMPTZ,                          -- when to remind
  deadline_date  DATE,                                 -- hard deadline
  is_ignored     BOOLEAN     NOT NULL DEFAULT FALSE,
  ignored_until  TIMESTAMPTZ,                          -- snooze until
  view_tags      TEXT[]      NOT NULL DEFAULT '{}',    -- which views this belongs to
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agenda_type    ON ea_agenda(entry_type);
CREATE INDEX idx_agenda_pinned  ON ea_agenda(is_pinned);

-- ── ea_flags ──────────────────────────────────────────────────
-- Red & green flags EA notices about the user
CREATE TABLE ea_flags (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,   -- red/green
  life_area   TEXT,                   -- which life area this flag is in
  title       TEXT        NOT NULL,
  body        TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  source      TEXT        NOT NULL DEFAULT 'ea_observed',  -- ea_observed/user_confirmed/user_added
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ea_dna ────────────────────────────────────────────────────
-- DNA field system — EA's structured understanding of the user
-- Mirrors the CLAUDE.md pipeline layers
CREATE TABLE ea_dna (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id       UUID        REFERENCES brands(id) ON DELETE CASCADE,
  layer          TEXT        NOT NULL,   -- L1/L2/L3
  field_id       TEXT        NOT NULL,   -- L1-F1, L1-F4, etc.
  label          TEXT        NOT NULL,   -- "Focus Lock", "User Model"
  ea_instruction TEXT,                   -- how EA should read/extract this field
  body           TEXT,                   -- the content
  locked         BOOLEAN     NOT NULL DEFAULT FALSE,
  is_ghost       BOOLEAN     NOT NULL DEFAULT FALSE,  -- ghost = excluded from EA context
  status         TEXT        NOT NULL DEFAULT 'active',  -- active/paused
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  tags           TEXT[]      NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, field_id)
);

-- ── ea_rules ──────────────────────────────────────────────────
-- Behavioural rules for how EA must act with this specific user
CREATE TABLE ea_rules (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule        TEXT        NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'focus',  -- focus/tone/escalation/boundaries/format
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  priority    INTEGER     NOT NULL DEFAULT 2,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_brands_ua          BEFORE UPDATE ON brands           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_ua        BEFORE UPDATE ON contacts         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_ua           BEFORE UPDATE ON tasks            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_goals_ua           BEFORE UPDATE ON goals            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_ua          BEFORE UPDATE ON agents           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_profile_ua    BEFORE UPDATE ON user_profile     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_habits_ua     BEFORE UPDATE ON user_habits      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_personal_cont_ua   BEFORE UPDATE ON personal_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ea_agenda_ua       BEFORE UPDATE ON ea_agenda        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ea_flags_ua        BEFORE UPDATE ON ea_flags         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ea_dna_ua          BEFORE UPDATE ON ea_dna           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ea_rules_ua        BEFORE UPDATE ON ea_rules         FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'brands','contacts','tasks','goals','goal_milestones',
    'finance_records','finance_transactions','bank_connections','expenses',
    'agents','ai_messages',
    'user_habits','habit_logs','personal_contacts',
    'ea_agenda','ea_flags','ea_dna','ea_rules',
    'email_threads','sections','workspace_views','view_tabs'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "%s_owner" ON %I USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())',
      t, t
    );
  END LOOP;
  -- user_profile uses user_id (not owner_id), handle separately
  ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "user_profile_owner" ON user_profile USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
END $$;

-- ═══════════════════════════════════════════════════════════════
-- AUTO-CREATE user_profile ON SIGNUP
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profile (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
