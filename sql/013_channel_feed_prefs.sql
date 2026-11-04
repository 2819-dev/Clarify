-- Per-user feed signals: show more like this channel / don't recommend channel
CREATE TABLE IF NOT EXISTS channel_feed_prefs (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  preference TEXT NOT NULL CHECK (preference IN ('more', 'hide')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_feed_prefs_user_pref
  ON channel_feed_prefs(user_id, preference, updated_at DESC);
