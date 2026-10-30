-- Starter Jewish / family-safe catalog (verified YouTube IDs)
INSERT INTO videos (youtube_id, title, description, channel_name, category, thumbnail_url, duration_seconds) VALUES
('qSJCSR4MuhU', 'Candlelight — Hanukkah', 'The Maccabeats'' warm a cappella Hanukkah tribute — joyful and family-friendly.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/qSJCSR4MuhU/hqdefault.jpg', 240),
('kgJInVvJSZg', 'Purim Song', 'A spirited Purim celebration from The Maccabeats.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/kgJInVvJSZg/hqdefault.jpg', 210),
('qervY5HSzqM', 'A Lion King Passover', 'Six13''s Passover a cappella mashup — fun for seders and family nights.', 'Six13', 'jewish', 'https://i.ytimg.com/vi/qervY5HSzqM/hqdefault.jpg', 266),
('NoHp2Rq8sMI', 'Chanukah (Shake It Off)', 'Six13''s Chanukah adaptation — upbeat, clean, and sing-along ready.', 'Six13', 'jewish', 'https://i.ytimg.com/vi/NoHp2Rq8sMI/hqdefault.jpg', 274),
('g-nW3_Wqdh8', 'Modeh Ani Singalong for Kids', 'A gentle Modeh Ani morning prayer singalong for children.', 'Sing It! with Ms. Sara', 'jewish', 'https://i.ytimg.com/vi/g-nW3_Wqdh8/hqdefault.jpg', 180),
('eNdwdn9uSBE', 'Modeh Ani Lyrics Video', 'Learn the words to the Jewish morning blessing with Shaboom!', 'Shaboom!', 'jewish', 'https://i.ytimg.com/vi/eNdwdn9uSBE/hqdefault.jpg', 150),
('d2JbX_9KbtM', 'Sing the Hebrew Alphabet', 'Friendly aleph-bet song for beginners and kids.', 'Sing It! with Ms. Sara', 'jewish', 'https://i.ytimg.com/vi/d2JbX_9KbtM/hqdefault.jpg', 200),
('CZgDNPGZ9Sg', 'Dayenu — Passover', 'The Maccabeats'' Dayenu for Passover tables everywhere.', 'The Maccabeats', 'jewish', 'https://i.ytimg.com/vi/CZgDNPGZ9Sg/hqdefault.jpg', 220),
('-ODQuc6PzVk', 'Oseh Shalom Lyrics Video', 'Learn the prayer for peace with a clear lyrics video.', 'Shaboom!', 'jewish', 'https://i.ytimg.com/vi/-ODQuc6PzVk/hqdefault.jpg', 160),
('QON2JYjWMxY', 'Mitzvah Song Party!', 'Jewish kids songs about Shabbos, brachos, and more.', 'KITA', 'jewish', 'https://i.ytimg.com/vi/QON2JYjWMxY/hqdefault.jpg', 300),
('ZPyQh7jjbpE', 'Cute Animal Families 4K', 'Peaceful nature film with animal families — calm shared viewing.', 'Relaxation Film', 'family', 'https://i.ytimg.com/vi/ZPyQh7jjbpE/hqdefault.jpg', 600)
ON CONFLICT (youtube_id) DO NOTHING;
