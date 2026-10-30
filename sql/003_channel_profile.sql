-- Channel profile fields for YouTube-like channel pages
ALTER TABLE channels ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS subscriber_count INTEGER;
