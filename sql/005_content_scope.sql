-- Jewish vs Filtered content scope
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS is_jewish BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS is_jewish BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_videos_jewish
  ON videos (is_jewish)
  WHERE is_active = TRUE;

-- Categories that support broader filtered (family-safe) browsing
INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('cooking', 'Cooking', 'Kosher and family-friendly cooking & recipes.', 85),
  ('history', 'History', 'Jewish history and heritage explained for families.', 86),
  ('comedy', 'Clean Comedy', 'Light, clean humor suitable for shared viewing.', 87),
  ('community', 'Community', 'Community life, gentle Israel/culture, and wholesome shorts.', 88),
  ('learning', 'Kids Learning', 'Jewish and general kids education that stays family-safe.', 55),
  ('nature', 'Nature', 'Calm nature and wildlife for shared family watching.', 90),
  ('science', 'Science & How-To', 'Gentle science and how-to videos for curious kids.', 91)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
