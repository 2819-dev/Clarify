-- Soft-hide channels from the public catalog
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_channels_active ON channels (is_active);
