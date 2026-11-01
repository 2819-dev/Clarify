-- TOTP (authenticator app) 2FA for viewer accounts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT;
