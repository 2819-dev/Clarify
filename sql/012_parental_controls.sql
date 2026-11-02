-- Parental controls: parent↔child links, settings, session usage
CREATE TABLE IF NOT EXISTS parent_child_links (
  parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (parent_user_id, child_user_id),
  CONSTRAINT parent_child_distinct CHECK (parent_user_id <> child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_child_child
  ON parent_child_links(child_user_id);

CREATE TABLE IF NOT EXISTS parental_settings (
  child_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  disabled_categories TEXT[] NOT NULL DEFAULT '{}',
  total_limit_minutes INTEGER,
  category_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  child_age INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT parental_total_limit_positive
    CHECK (total_limit_minutes IS NULL OR total_limit_minutes > 0),
  CONSTRAINT parental_age_range
    CHECK (child_age IS NULL OR (child_age >= 1 AND child_age <= 17))
);

CREATE TABLE IF NOT EXISTS parental_usage (
  child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  total_seconds INTEGER NOT NULL DEFAULT 0,
  category_seconds JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_parental_usage_child_date
  ON parental_usage(child_user_id, usage_date DESC);

-- Pending device pairing for rotating child-device codes (guest or signed-in child)
CREATE TABLE IF NOT EXISTS parental_device_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_key TEXT NOT NULL UNIQUE,
  child_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Child device',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_parental_device_pairs_child
  ON parental_device_pairs(child_user_id)
  WHERE child_user_id IS NOT NULL;
