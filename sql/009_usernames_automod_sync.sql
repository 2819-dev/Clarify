-- User/channel @usernames, comment AutoMod flags, video publish times, YouTube IDs for sync
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

UPDATE videos
SET published_at = COALESCE(published_at, created_at)
WHERE published_at IS NULL;

ALTER TABLE video_comments
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS automod_flag TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON users (lower(username))
  WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_channels_username_lower
  ON channels (lower(username))
  WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_videos_published
  ON videos (published_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_comments_visible
  ON video_comments (video_id, created_at DESC)
  WHERE COALESCE(is_hidden, FALSE) = FALSE;
