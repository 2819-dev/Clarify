-- Starter Jewish / family-safe catalog.
-- Only includes YouTube IDs verified to play inside an iframe from Clarify.
INSERT INTO videos (youtube_id, title, description, channel_name, category, thumbnail_url, duration_seconds, embeddable) VALUES
('qSJCSR4MuhU', 'Candlelight — Hanukkah', 'The Maccabeats'' warm a cappella Hanukkah tribute — joyful and family-friendly.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/qSJCSR4MuhU/hqdefault.jpg', 240, TRUE),
('qervY5HSzqM', 'A Lion King Passover', 'Six13''s Passover a cappella mashup — fun for seders and family nights.', 'Six13', 'jewish', 'https://i.ytimg.com/vi/qervY5HSzqM/hqdefault.jpg', 266, TRUE),
('fg51la8Yayc', 'Latke Recipe — Hanukkah', 'The Maccabeats'' playful latke recipe song for Hanukkah.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/fg51la8Yayc/hqdefault.jpg', 210, TRUE),
('g-nW3_Wqdh8', 'Modeh Ani Singalong for Kids', 'A gentle Modeh Ani morning prayer singalong for children.', 'Sing It! with Ms. Sara', 'jewish', 'https://i.ytimg.com/vi/g-nW3_Wqdh8/hqdefault.jpg', 180, TRUE),
('eNdwdn9uSBE', 'Modeh Ani Lyrics Video', 'Learn the words to the Jewish morning blessing with Shaboom!', 'Shaboom!', 'jewish', 'https://i.ytimg.com/vi/eNdwdn9uSBE/hqdefault.jpg', 150, TRUE),
('d2JbX_9KbtM', 'Sing the Hebrew Alphabet', 'Friendly aleph-bet song for beginners and kids.', 'Sing It! with Ms. Sara', 'jewish', 'https://i.ytimg.com/vi/d2JbX_9KbtM/hqdefault.jpg', 200, TRUE),
('CZgDNPGZ9Sg', 'Dayenu — Passover', 'The Maccabeats'' Dayenu for Passover tables everywhere.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/CZgDNPGZ9Sg/hqdefault.jpg', 220, TRUE),
('-ODQuc6PzVk', 'Oseh Shalom Lyrics Video', 'Learn the prayer for peace with a clear lyrics video.', 'Shaboom!', 'jewish', 'https://i.ytimg.com/vi/-ODQuc6PzVk/hqdefault.jpg', 160, TRUE),
('QON2JYjWMxY', 'Mitzvah Song Party!', 'Jewish kids songs about Shabbos, brachos, and more.', 'KITA', 'jewish', 'https://i.ytimg.com/vi/QON2JYjWMxY/hqdefault.jpg', 300, TRUE),
('rL02K-Hf2uM', 'Bim Bam — Shabbat Shalom', 'A Shabbat Shalom singalong for toddlers and families.', 'Sing It! with Ms. Sara', 'jewish', 'https://i.ytimg.com/vi/rL02K-Hf2uM/hqdefault.jpg', 180, TRUE),
('swGzOpoSHNw', 'Dreidel, Dreidel, Dreidel', 'Classic Hanukkah children''s dreidel song with lyrics.', 'The Learning Station', 'jewish', 'https://i.ytimg.com/vi/swGzOpoSHNw/hqdefault.jpg', 160, TRUE),
('ZPyQh7jjbpE', 'Cute Animal Families 4K', 'Peaceful nature film with animal families — calm shared viewing.', 'Relaxation Film', 'family', 'https://i.ytimg.com/vi/ZPyQh7jjbpE/hqdefault.jpg', 600, TRUE)
ON CONFLICT (youtube_id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  channel_name = EXCLUDED.channel_name,
  category = EXCLUDED.category,
  thumbnail_url = EXCLUDED.thumbnail_url,
  duration_seconds = EXCLUDED.duration_seconds,
  embeddable = EXCLUDED.embeddable,
  is_active = TRUE,
  updated_at = NOW();
