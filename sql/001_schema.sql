-- Clarify schema: channels, categories, videos, reports
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  youtube_url TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  subscriber_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  channel_name TEXT NOT NULL DEFAULT '',
  channel_id UUID REFERENCES channels(id),
  category TEXT NOT NULL DEFAULT 'family',
  category_slug TEXT REFERENCES categories(slug),
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  is_short BOOLEAN NOT NULL DEFAULT FALSE,
  embeddable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT reports_reason_not_blank CHECK (char_length(trim(reason)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_videos_active ON videos(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_slug) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_video ON reports(video_id);
