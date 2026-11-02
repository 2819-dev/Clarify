-- Watch/view events for real trending + ranking signals
CREATE TABLE IF NOT EXISTS video_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  anon_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_views_video_created
  ON video_views(video_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_views_created
  ON video_views(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_video_views_user_created
  ON video_views(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
