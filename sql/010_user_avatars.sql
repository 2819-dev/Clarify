-- Profile pictures for viewer accounts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_mime TEXT,
  ADD COLUMN IF NOT EXISTS avatar_bytes BYTEA,
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;
