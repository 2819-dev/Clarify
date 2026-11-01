import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const payload = JSON.parse(readFileSync(resolve(root, "data/catalog-seed.json"), "utf8"));
const env = readFileSync(resolve(root, ".env.local"), "utf8");
const databaseUrl = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const cats = [
  ["holidays", "Holidays", "Hanukkah, Purim, Passover, and other celebrations.", 10],
  ["music", "Music", "Songs, a cappella, and family-friendly music videos.", 15],
  ["songs", "Songs", "Sing-along favorites (legacy label; prefer Music).", 20],
  ["shabbat", "Shabbat", "Shabbat welcome songs and peaceful Friday vibes.", 30],
  ["prayer", "Prayer", "Modeh Ani, Oseh Shalom, and other gentle liturgy for kids.", 40],
  ["hebrew", "Learning Hebrew", "Aleph-bet and beginner Hebrew learning.", 50],
  ["learning", "Kids Learning", "Jewish and general kids education that stays family-safe.", 55],
  ["torah", "Torah & Stories", "Parsha-friendly kids stories and Torah teachings.", 60],
  ["stories", "Stories", "Kind, calm stories for shared family viewing.", 70],
  ["family", "Family & Calm", "Peaceful nature and calm shared watching.", 80],
  ["cooking", "Cooking", "Kosher and family-friendly cooking & recipes.", 85],
  ["history", "History", "Jewish history and heritage explained for families.", 86],
  ["comedy", "Clean Comedy", "Light, clean humor suitable for shared viewing.", 87],
  ["community", "Community", "Community life, gentle Israel/culture, and wholesome shorts.", 88],
  ["nature", "Nature", "Calm nature and wildlife for shared family watching.", 90],
  ["science", "Science & How-To", "Gentle science and how-to videos for curious kids.", 91],
  ["crafts", "Crafts & DIY", "Hands-on crafts and DIY projects for kids and families.", 92],
  ["gaming", "Gaming", "Family-safe games and builds — Minecraft, LEGO, creative play.", 93],
  ["travel", "Travel", "Gentle travel and place videos for shared family watching.", 94],
  ["sports", "Sports", "Light, family-safe sports and movement for kids.", 95],
];

for (const [slug, name, description, sort] of cats) {
  await sql`INSERT INTO categories (slug,name,description,sort_order)
    VALUES (${slug},${name},${description},${sort})
    ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order`;
}

function usernameFromYoutubeUrl(youtubeUrl, slug) {
  const at = youtubeUrl?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
  if (at) {
    let raw = at;
    try {
      raw = decodeURIComponent(at);
    } catch {
      /* keep */
    }
    const n = raw
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 30);
    if (n) return n;
  }
  return String(slug)
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 30);
}

const channelIdBySlug = {};
for (const ch of payload.channels) {
  const banner = ch.banner_url ?? null;
  const subs = ch.subscriber_count ?? null;
  const isJewish = ch.is_jewish !== false;
  const username = usernameFromYoutubeUrl(ch.youtube_url, ch.slug);
  const rows = await sql`
    INSERT INTO channels (
      slug, name, description, youtube_url, avatar_url, banner_url, subscriber_count, is_jewish, username
    ) VALUES (
      ${ch.slug}, ${ch.name}, ${ch.description}, ${ch.youtube_url}, ${ch.avatar_url},
      ${banner}, ${subs}, ${isJewish}, ${username}
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      youtube_url = COALESCE(EXCLUDED.youtube_url, channels.youtube_url),
      avatar_url = COALESCE(EXCLUDED.avatar_url, channels.avatar_url),
      banner_url = COALESCE(EXCLUDED.banner_url, channels.banner_url),
      subscriber_count = COALESCE(EXCLUDED.subscriber_count, channels.subscriber_count),
      is_jewish = EXCLUDED.is_jewish,
      username = COALESCE(EXCLUDED.username, channels.username)
    RETURNING id, slug`;
  if (ch.avatar_url || ch.banner_url || ch.description || username) {
    await sql`
      UPDATE channels SET
        avatar_url = COALESCE(${ch.avatar_url ?? null}, avatar_url),
        banner_url = COALESCE(${ch.banner_url ?? null}, banner_url),
        description = COALESCE(NULLIF(${ch.description ?? ""}, ''), description),
        subscriber_count = COALESCE(${subs}, subscriber_count),
        is_jewish = ${isJewish},
        username = COALESCE(${username}, username)
      WHERE slug = ${ch.slug}`;
  }
  channelIdBySlug[rows[0].slug] = rows[0].id;
}

const kept = [];
for (const v of payload.videos) {
  const channelId = channelIdBySlug[v.channel_slug];
  const isShort = Boolean(v.is_short);
  const isJewish = v.is_jewish !== false;
  const rows = await sql`
    INSERT INTO videos (
      youtube_id, title, description, channel_name, channel_id,
      category, category_slug, thumbnail_url, is_short, is_jewish,
      embeddable, is_active, updated_at
    ) VALUES (
      ${v.youtube_id}, ${v.title}, ${v.description}, ${v.channel_name}, ${channelId}::uuid,
      ${v.category}, ${v.category_slug}, ${v.thumbnail_url}, ${isShort}, ${isJewish},
      TRUE, TRUE, NOW()
    )
    ON CONFLICT (youtube_id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      channel_name = EXCLUDED.channel_name,
      channel_id = EXCLUDED.channel_id,
      category = EXCLUDED.category,
      category_slug = EXCLUDED.category_slug,
      thumbnail_url = EXCLUDED.thumbnail_url,
      is_short = EXCLUDED.is_short,
      is_jewish = EXCLUDED.is_jewish,
      embeddable = TRUE,
      is_active = TRUE,
      updated_at = NOW()
    RETURNING youtube_id`;
  kept.push(rows[0].youtube_id);
}

const active = await sql`SELECT youtube_id FROM videos WHERE is_active = TRUE`;
const keep = new Set(kept);
for (const row of active) {
  if (!keep.has(row.youtube_id)) {
    await sql`UPDATE videos SET is_active = FALSE, updated_at = NOW() WHERE youtube_id = ${row.youtube_id}`;
  }
}

const counts = await sql`SELECT
  (SELECT COUNT(*) FROM videos WHERE is_active) AS videos,
  (SELECT COUNT(*) FROM videos WHERE is_active AND is_jewish) AS jewish_videos,
  (SELECT COUNT(*) FROM videos WHERE is_active AND NOT is_jewish) AS filtered_only,
  (SELECT COUNT(*) FROM channels) AS channels,
  (SELECT COUNT(*) FROM categories) AS categories`;
console.log(counts[0]);
