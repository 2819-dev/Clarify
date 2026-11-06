/**
 * Add @Jacobsyechiel (Yechiel Jacobs) as a Jewish-makers channel and pull
 * iframe-verified uploads. Demotes News-category content out of Jewish mode.
 *
 * Usage: node scripts/add-yechiel-jacobs.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = readFileSync(resolve(root, ".env.local"), "utf8");
const databaseUrl =
  process.env.DATABASE_URL ||
  envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
/** Public handle used on Instagram/TikTok; YouTube @YechielJacobs 404s. */
const HANDLE = "Jacobsyechiel";
const DISPLAY_NAME = "Yechiel Jacobs";
const PER_CHANNEL = 40;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeUsername(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function extractChannelId(html) {
  const patterns = [
    /"externalId":"(UC[\w-]+)"/,
    /"channelId":"(UC[\w-]+)"/,
    /browseId":"(UC[\w-]+)"/,
    /\/channel\/(UC[\w-]+)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractMeta(html, handle) {
  const channelId = extractChannelId(html);
  const name =
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1]?.replace(
      /\s*-\s*YouTube\s*$/i,
      "",
    ) ||
    html.match(/"name":"([^"]{2,120})"/)?.[1] ||
    handle;
  const description =
    html.match(/"description":"([^"]{0,400})"/)?.[1]?.replace(/\\n/g, " ") ||
    "";
  const avatar =
    html.match(/"url":"(https:\/\/yt3\.[^"]+)"/)?.[1] ||
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ||
    null;
  return {
    channelId,
    name: name.trim() || DISPLAY_NAME,
    description,
    avatar,
    subscriberCount: null,
  };
}

function parseVideosFromChannelHtml(html) {
  const ids = new Set();
  for (const m of html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)) {
    ids.add(m[1]);
  }
  return [...ids].map((youtubeId) => ({
    youtubeId,
    title: null,
    publishedAt: null,
    isShort: false,
  }));
}

async function isEmbeddable(youtubeId) {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`,
    )}&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    const data = await res.json();
    return { title: data.title || null, author: data.author_name || null };
  } catch {
    return null;
  }
}

async function demoteNewsFromJewish() {
  const videos = await sql`
    UPDATE videos
    SET is_jewish = FALSE, updated_at = NOW()
    WHERE is_active = TRUE
      AND category_slug = 'news'
      AND COALESCE(is_jewish, TRUE) = TRUE
    RETURNING id
  `;
  const channels = await sql`
    UPDATE channels ch
    SET is_jewish = FALSE
    WHERE COALESCE(ch.is_jewish, TRUE) = TRUE
      AND EXISTS (
        SELECT 1 FROM videos v
        WHERE v.channel_id = ch.id
          AND v.is_active = TRUE
          AND v.category_slug = 'news'
      )
      AND NOT EXISTS (
        SELECT 1 FROM videos v2
        WHERE v2.channel_id = ch.id
          AND v2.is_active = TRUE
          AND COALESCE(v2.category_slug, '') <> 'news'
          AND COALESCE(v2.is_jewish, TRUE) = TRUE
      )
    RETURNING slug
  `;
  const newsOrgs = await sql`
    UPDATE channels
    SET is_jewish = FALSE
    WHERE slug = ANY(${[
      "all-israel-news",
      "iltv-israel-news",
      "the-jerusalem-post",
      "the-times-of-israel",
      "i24news-english",
      "algemeiner",
      "kanisrael",
      "mako",
      "keshet-12",
      "bbc-newsround",
      "pix11-news",
    ]})
      AND COALESCE(is_jewish, TRUE) = TRUE
    RETURNING slug
  `;
  return {
    videosDemoted: videos.length,
    channelsDemoted: new Set([
      ...channels.map((r) => r.slug),
      ...newsOrgs.map((r) => r.slug),
    ]).size,
  };
}

async function ensureChannel() {
  const username = normalizeUsername(HANDLE);
  const existing = await sql`
    SELECT id, slug, name, youtube_url, youtube_channel_id,
           COALESCE(is_jewish, TRUE) AS is_jewish
    FROM channels
    WHERE lower(username) = ${username}
       OR youtube_url ILIKE ${"%@" + HANDLE + "%"}
       OR slug IN ('yechiel-jacobs', 'jacobsyechiel')
    LIMIT 1
  `;
  if (existing[0]) {
    const ch = existing[0];
    if (!ch.is_jewish) {
      await sql`UPDATE channels SET is_jewish = TRUE WHERE id = ${ch.id}::uuid`;
      ch.is_jewish = true;
    }
    return { channel: ch, created: false };
  }

  const url = `https://www.youtube.com/@${HANDLE}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`@${HANDLE} HTTP ${res.status}`);
  const html = await res.text();
  const meta = extractMeta(html, HANDLE);
  if (!meta.channelId) throw new Error(`@${HANDLE}: no channelId`);
  const slug = "yechiel-jacobs";
  await sql`
    INSERT INTO channels (
      slug, name, description, youtube_url, avatar_url,
      subscriber_count, is_jewish, username, youtube_channel_id, is_active
    ) VALUES (
      ${slug},
      ${DISPLAY_NAME},
      ${meta.description || "Jewish comedy and commentary by Yechiel Jacobs."},
      ${url},
      ${meta.avatar},
      ${meta.subscriberCount},
      TRUE,
      ${username},
      ${meta.channelId},
      TRUE
    )
    ON CONFLICT (slug) DO UPDATE
      SET is_jewish = TRUE,
          youtube_channel_id = COALESCE(EXCLUDED.youtube_channel_id, channels.youtube_channel_id),
          avatar_url = COALESCE(EXCLUDED.avatar_url, channels.avatar_url),
          username = COALESCE(channels.username, EXCLUDED.username),
          name = COALESCE(NULLIF(channels.name, ''), EXCLUDED.name)
  `;
  const rows = await sql`
    SELECT id, slug, name, youtube_url, youtube_channel_id,
           COALESCE(is_jewish, TRUE) AS is_jewish
    FROM channels WHERE slug = ${slug} OR lower(username) = ${username}
    LIMIT 1
  `;
  return { channel: rows[0], created: true };
}

async function expandChannel(ch) {
  let channelId = ch.youtube_channel_id;
  const base = (ch.youtube_url || `https://www.youtube.com/@${HANDLE}`).replace(
    /\/$/,
    "",
  );
  if (!channelId) {
    const res = await fetch(base, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (res.ok) {
      channelId = extractChannelId(await res.text());
      if (channelId) {
        await sql`
          UPDATE channels SET youtube_channel_id = ${channelId}
          WHERE id = ${ch.id}::uuid
        `;
      }
    }
  }

  const byId = new Map();
  for (const path of ["/videos", "/shorts"]) {
    try {
      const res = await fetch(base + path, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      if (!res.ok) continue;
      for (const entry of parseVideosFromChannelHtml(await res.text())) {
        byId.set(entry.youtubeId, entry);
      }
      await sleep(200);
    } catch {
      /* ignore */
    }
  }

  const existingRows = await sql`SELECT youtube_id FROM videos`;
  const existing = new Set(existingRows.map((r) => r.youtube_id));
  let inserted = 0;
  let skippedEmbed = 0;
  let skippedExisting = 0;
  for (const entry of [...byId.values()].slice(0, PER_CHANNEL)) {
    if (existing.has(entry.youtubeId)) {
      skippedExisting++;
      continue;
    }
    const meta = await isEmbeddable(entry.youtubeId);
    await sleep(160);
    if (!meta?.title) {
      skippedEmbed++;
      continue;
    }
    const title = meta.title;
    const thumb = `https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`;
    await sql`
      INSERT INTO videos (
        youtube_id, title, description, channel_name, channel_id,
        category, category_slug, thumbnail_url, is_short, is_jewish,
        embeddable, is_active, published_at
      ) VALUES (
        ${entry.youtubeId},
        ${title},
        ${""},
        ${ch.name || DISPLAY_NAME},
        ${ch.id}::uuid,
        ${"Comedy"},
        ${"comedy"},
        ${thumb},
        FALSE,
        TRUE,
        TRUE,
        TRUE,
        ${null}
      )
      ON CONFLICT (youtube_id) DO NOTHING
    `;
    existing.add(entry.youtubeId);
    inserted++;
    console.log(`video + ${entry.youtubeId} ${title.slice(0, 72)}`);
  }
  return { inserted, skippedEmbed, skippedExisting, candidates: byId.size };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos_all,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS videos_jewish,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS videos_filtered_only,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news') AS news_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news' AND COALESCE(is_jewish, TRUE)) AS news_still_jewish,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels_all,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS channels_jewish,
      (SELECT COUNT(*)::int FROM videos v
         INNER JOIN channels c ON c.id = v.channel_id
        WHERE v.is_active AND (c.slug = 'yechiel-jacobs' OR lower(c.username) = 'jacobsyechiel')) AS yechiel_videos
  `;
  return rows[0];
}

const demote = await demoteNewsFromJewish();
console.log("demote news from jewish:", demote);
const { channel, created } = await ensureChannel();
console.log(
  `channel ${created ? "created" : "exists"}: ${channel.slug} (${channel.name}) jewish=${channel.is_jewish} id=${channel.youtube_channel_id}`,
);
const expand = await expandChannel(channel);
console.log("expand:", expand);
const summary = await counts();
console.log("counts:", summary);
