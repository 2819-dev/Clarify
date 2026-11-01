-- Shorts flag + Music category support
ALTER TABLE videos ADD COLUMN IF NOT EXISTS is_short BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO categories (slug, name, description, sort_order)
VALUES (
  'music',
  'Music',
  'Songs, a cappella, and family-friendly music videos.',
  15
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;
