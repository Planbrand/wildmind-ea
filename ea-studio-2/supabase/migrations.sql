-- ============================================================
-- WILDMIND EA STUDIO — Run this in Supabase SQL Editor
-- These are ALTER statements for existing DBs + new tables
-- ============================================================

-- ── expenses (new table) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id     UUID        REFERENCES brands(id) ON DELETE SET NULL,
  merchant     TEXT        NOT NULL,
  description  TEXT,
  amount_pence INTEGER     NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'GBP',
  frequency    TEXT        NOT NULL DEFAULT 'one_time',
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  brand_ids    UUID[]      NOT NULL DEFAULT '{}',
  contact_id   UUID        REFERENCES contacts(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date  ON expenses(date);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "expenses_owner" ON expenses;
CREATE POLICY "expenses_owner" ON expenses USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── finance_transactions (new table) ─────────────────────────
CREATE TABLE IF NOT EXISTS finance_transactions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_id  TEXT,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  description  TEXT,
  amount_pence INTEGER     NOT NULL DEFAULT 0,
  direction    TEXT        NOT NULL DEFAULT 'out',
  currency     TEXT        NOT NULL DEFAULT 'GBP',
  brand_id     UUID        REFERENCES brands(id) ON DELETE SET NULL,
  raw          JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fin_tx_ext ON finance_transactions(owner_id, external_id) WHERE external_id IS NOT NULL;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "finance_transactions_owner" ON finance_transactions;
CREATE POLICY "finance_transactions_owner" ON finance_transactions USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── bank_connections (new table) ─────────────────────────────
CREATE TABLE IF NOT EXISTS bank_connections (
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
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_connections_owner" ON bank_connections;
CREATE POLICY "bank_connections_owner" ON bank_connections USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── email_threads (new table) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS email_threads (
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
  category    TEXT        DEFAULT 'automated',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_threads_owner    ON email_threads(owner_id);
CREATE INDEX IF NOT EXISTS idx_threads_category ON email_threads(category);
CREATE INDEX IF NOT EXISTS idx_threads_read     ON email_threads(is_read);
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_threads_owner" ON email_threads;
CREATE POLICY "email_threads_owner" ON email_threads USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── sections (new table) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sections (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  icon       TEXT,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_owner" ON sections;
CREATE POLICY "sections_owner" ON sections USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── workspace_views (new table) ──────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_views (
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
ALTER TABLE workspace_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workspace_views_owner" ON workspace_views;
CREATE POLICY "workspace_views_owner" ON workspace_views USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── view_tabs (new table) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS view_tabs (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  view_id    UUID        NOT NULL REFERENCES workspace_views(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  layout     TEXT        NOT NULL DEFAULT 'list',
  config     JSONB       NOT NULL DEFAULT '{}',
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE view_tabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view_tabs_owner" ON view_tabs;
CREATE POLICY "view_tabs_owner" ON view_tabs USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- ── alter existing tables ─────────────────────────────────────

-- goals: add priority, parent, financial target, related brands
ALTER TABLE goals ADD COLUMN IF NOT EXISTS priority              INTEGER   NOT NULL DEFAULT 2;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_goal_id        UUID      REFERENCES goals(id) ON DELETE SET NULL;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS financial_target_pence INTEGER;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS related_brand_ids     UUID[]    NOT NULL DEFAULT '{}';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS people_to_reach       TEXT[]    NOT NULL DEFAULT '{}';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS view_tags             TEXT[]    NOT NULL DEFAULT '{}';

-- ea_dna: add ea_instruction, ghost toggle, tags, brand_id
ALTER TABLE ea_dna ADD COLUMN IF NOT EXISTS ea_instruction TEXT;
ALTER TABLE ea_dna ADD COLUMN IF NOT EXISTS is_ghost       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ea_dna ADD COLUMN IF NOT EXISTS tags           TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE ea_dna ADD COLUMN IF NOT EXISTS brand_id       UUID    REFERENCES brands(id) ON DELETE CASCADE;

-- ea_agenda: add reminder, deadline, ignore/snooze, view_tags
ALTER TABLE ea_agenda ADD COLUMN IF NOT EXISTS reminder_at   TIMESTAMPTZ;
ALTER TABLE ea_agenda ADD COLUMN IF NOT EXISTS deadline_date  DATE;
ALTER TABLE ea_agenda ADD COLUMN IF NOT EXISTS is_ignored     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE ea_agenda ADD COLUMN IF NOT EXISTS ignored_until  TIMESTAMPTZ;
ALTER TABLE ea_agenda ADD COLUMN IF NOT EXISTS view_tags      TEXT[]  NOT NULL DEFAULT '{}';

-- contacts: add tags, view_tags
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tags      TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS view_tags TEXT[]  NOT NULL DEFAULT '{}';

-- tasks: add view_tags
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS view_tags TEXT[] NOT NULL DEFAULT '{}';
