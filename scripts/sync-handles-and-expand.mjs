/**
 * 1) Set channels.username from real YouTube @handles in youtube_url
 * 2) Pull more uploads from channel Atom feeds / HTML, keep only oEmbed-verified
 *    (iframe-embeddable) videos, insert into Neon.
 *
 * Usage: node scripts/sync-handles-and-expand.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = (() => {
  try {
    return readFileSync(resolve(root, ".env.local"), "utf8");
  } catch {
    return "";
  }
})();
const databaseUrl =
  process.env.DATABASE_URL ||
  envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const UA =
  "Mozilla/5.0 (compatible; ClarifyBot/1.0; +https://clarify.guidelearning.org)";

function normalizeUsername(raw) {
  return String(raw || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[-.]+|[-.]+$/g, "")
    .replace(/--+/g, "-")
    .slice(0, 30);
}

function isValidUsername(username) {
  return /^[a-z0-9](?:[a-z0-9._-]{0,28}[a-z0-9])?$|^[a-z0-9]$/.test(username);
}

function usernameFromChannel(youtubeUrl, slug) {
  if (youtubeUrl) {
    const at = youtubeUrl.match(/youtube\.com\/@([^/?#]+)/i);
    if (at?.[1]) {
      let raw = at[1];
      try {
        raw = decodeURIComponent(raw);
      } catch {
        /* keep */
      }
      const n = normalizeUsername(raw);
      if (isValidUsername(n)) return n;
    }
  }
  const fromSlug = normalizeUsername(String(slug).replace(/-/g, ""));
  if (isValidUsername(fromSlug)) return fromSlug;
  return normalizeUsername(slug) || "channel";
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractChannelId(html) {
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAtomFeed(xml) {
  const entries = [];
  for (const block of xml.split(/<entry>/i).slice(1)) {
    const youtubeId =
      block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ||
      block.match(/\/watch\?v=([\w-]{6,})/)?.[1];
    const title = block.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ||
      block.match(/<updated>([^<]+)<\/updated>/i)?.[1];
    const channelName =
      block.match(/<name>([^<]*)<\/name>/i)?.[1]?.trim() || "";
    if (!youtubeId || !title || !publishedAt) continue;
    entries.push({
      youtubeId,
      title: decodeXml(title),
      publishedAt,
      channelName: decodeXml(channelName),
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    });
  }
  return entries;
}

function parseVideosFromChannelHtml(html, channelName) {
  const entries = [];
  const seen = new Set();
  for (const m of html.matchAll(/"videoId":"([\w-]{11})"/g)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      youtubeId: id,
      title: `${channelName} video`,
      publishedAt: new Date().toISOString(),
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (entries.length >= 24) break;
  }
  return entries;
}

async function isEmbeddable(youtubeId) {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`,
    )}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function guessCategory(title, isJewish) {
  const t = title.toLowerCase();
  if (/\b(hanukkah|chanukah|purim|passover|pesach|sukkot|rosh|yom kippur|shavuot|lag ba)\b/.test(t))
    return ["holidays", "Holidays"];
  if (/\b(shabbat|shabbos|kabbalat)\b/.test(t)) return ["shabbat", "Shabbat"];
  if (/\b(modeh ani|shema|prayer|tefill|brach|bracha|amidah|oseh shalom)\b/.test(t))
    return ["prayer", "Prayer"];
  if (/\b(aleph|hebrew|ivrit|alphabet)\b/.test(t)) return ["hebrew", "Learning Hebrew"];
  if (/\b(parsha|torah|midrash|talmud|rashi|bible stor)\b/.test(t))
    return ["torah", "Torah & Stories"];
  if (/\b(song|sing|music|a cappella|acapella|niggun|cover)\b/.test(t))
    return ["music", "Music"];
  if (/\b(cook|recipe|bake|kitchen|food)\b/.test(t)) return ["cooking", "Cooking"];
  if (/\b(minecraft|lego|roblox|gameplay|nintendo)\b/.test(t))
    return ["gaming", "Gaming"];
  if (/\b(craft|diy|origami|draw)\b/.test(t)) return ["crafts", "Crafts & DIY"];
  if (/\b(science|experiment|how to|howto)\b/.test(t))
    return ["science", "Science & How-To"];
  if (/\b(nature|wildlife|animal|ocean)\b/.test(t)) return ["nature", "Nature"];
  if (isJewish) return ["family", "Family & Calm"];
  return ["family", "Family & Calm"];
}

async function syncHandles() {
  const channels = await sql`
    SELECT id, slug, youtube_url, username FROM channels
  `;
  let updated = 0;
  let unchanged = 0;
  let collisions = 0;
  for (const ch of channels) {
    const next = usernameFromChannel(ch.youtube_url, ch.slug);
    if (ch.username === next) {
      unchanged++;
      continue;
    }
    try {
      const taken = await sql`
        SELECT 1 FROM channels
        WHERE lower(username) = ${next} AND id <> ${ch.id}::uuid
        LIMIT 1
      `;
      if (taken.length) {
        collisions++;
        continue;
      }
      await sql`UPDATE channels SET username = ${next} WHERE id = ${ch.id}::uuid`;
      updated++;
      console.log(`handle ${ch.slug}: ${ch.username} → ${next}`);
    } catch (err) {
      collisions++;
      console.warn(`handle fail ${ch.slug}`, err.message);
    }
  }
  return { updated, unchanged, collisions, total: channels.length };
}

async function resolveChannelId(ch) {
  if (ch.youtube_channel_id) return ch.youtube_channel_id;
  if (!ch.youtube_url) return null;
  const direct = ch.youtube_url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (direct?.[1]) return direct[1];
  try {
    const res = await fetch(ch.youtube_url.replace(/\/$/, ""), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return extractChannelId(await res.text());
  } catch {
    return null;
  }
}

async function fetchUploads(ch) {
  const channelId = await resolveChannelId(ch);
  if (channelId && channelId !== ch.youtube_channel_id) {
    await sql`
      UPDATE channels SET youtube_channel_id = ${channelId}
      WHERE id = ${ch.id}::uuid
    `;
    ch.youtube_channel_id = channelId;
  }
  if (channelId) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": UA, Accept: "application/atom+xml,text/xml" },
      });
      if (res.ok) {
        const entries = parseAtomFeed(await res.text());
        if (entries.length) return entries;
      }
    } catch {
      /* fall through */
    }
  }
  if (!ch.youtube_url) return [];
  const pageUrl = ch.youtube_url.replace(/\/$/, "") + "/videos";
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    redirect: "follow",
  });
  if (!res.ok) return [];
  return parseVideosFromChannelHtml(await res.text(), ch.name);
}

async function expandVideos({ channelLimit = 80, perChannel = 12 } = {}) {
  const channels = await sql`
    SELECT id, slug, name, youtube_url, youtube_channel_id,
           COALESCE(is_jewish, TRUE) AS is_jewish
    FROM channels
    WHERE COALESCE(is_active, TRUE) = TRUE
      AND youtube_url IS NOT NULL
    ORDER BY subscriber_count DESC NULLS LAST, name ASC
    LIMIT ${channelLimit}
  `;

  let inserted = 0;
  let skippedExisting = 0;
  let skippedEmbed = 0;
  let errors = 0;
  const existingRows = await sql`SELECT youtube_id FROM videos`;
  const existing = new Set(existingRows.map((r) => r.youtube_id));

  for (const ch of channels) {
    try {
      const uploads = await fetchUploads(ch);
      await sleep(200);
      let addedHere = 0;
      for (const entry of uploads.slice(0, perChannel)) {
        if (existing.has(entry.youtubeId)) {
          skippedExisting++;
          continue;
        }
        const meta = await isEmbeddable(entry.youtubeId);
        await sleep(80);
        if (!meta?.title) {
          skippedEmbed++;
          continue;
        }
        const title = meta.title || entry.title;
        const channelName = meta.author_name || entry.channelName || ch.name;
        const [categorySlug, category] = guessCategory(title, ch.is_jewish);
        const isShort =
          /\b#shorts\b/i.test(title) ||
          /\bshorts\b/i.test(title) ||
          (meta.height && meta.width && meta.height > meta.width);

        // Prefer author_url @handle when present
        if (meta.author_url && /youtube\.com\/@/i.test(meta.author_url)) {
          const handle = usernameFromChannel(meta.author_url, ch.slug);
          try {
            await sql`
              UPDATE channels
              SET username = ${handle},
                  youtube_url = COALESCE(youtube_url, ${meta.author_url})
              WHERE id = ${ch.id}::uuid
                AND NOT EXISTS (
                  SELECT 1 FROM channels c2
                  WHERE lower(c2.username) = ${handle}
                    AND c2.id <> ${ch.id}::uuid
                )
            `;
          } catch {
            /* ignore */
          }
        }

        await sql`
          INSERT INTO videos (
            youtube_id, title, description, channel_name, channel_id,
            category, category_slug, thumbnail_url, is_short, is_jewish,
            embeddable, is_active, published_at
          ) VALUES (
            ${entry.youtubeId},
            ${title},
            ${`From ${channelName} on YouTube.`},
            ${channelName},
            ${ch.id}::uuid,
            ${category},
            ${categorySlug},
            ${entry.thumbnailUrl},
            ${Boolean(isShort)},
            ${Boolean(ch.is_jewish)},
            TRUE,
            TRUE,
            ${entry.publishedAt}::timestamptz
          )
          ON CONFLICT (youtube_id) DO NOTHING
        `;
        existing.add(entry.youtubeId);
        inserted++;
        addedHere++;
        console.log(`+ ${ch.slug} ${entry.youtubeId} ${title.slice(0, 60)}`);
      }
      console.log(`channel ${ch.slug}: +${addedHere} / ${uploads.length} scanned`);
    } catch (err) {
      errors++;
      console.warn(`channel fail ${ch.slug}:`, err.message);
    }
  }

  return { inserted, skippedExisting, skippedEmbed, errors, channels: channels.length };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS embeddable,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND is_jewish) AS jewish_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS filtered_only,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels,
      (SELECT COUNT(*)::int FROM channels
        WHERE youtube_url ~* 'youtube\\.com/@'
          AND lower(username) = lower(
            regexp_replace(
              substring(youtube_url from 'youtube\\.com/@([^/?#]+)'),
              '[^A-Za-z0-9._-]', '', 'g'
            )
          )
      ) AS handles_match_url,
      (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS channels_with_at_url
  `;
  return rows[0];
}

console.log("=== sync handles from YouTube @URLs ===");
const handleSummary = await syncHandles();
console.log(JSON.stringify(handleSummary, null, 2));

console.log("=== expand iframe-verified videos ===");
const expandSummary = await expandVideos({ channelLimit: 100, perChannel: 14 });
console.log(JSON.stringify(expandSummary, null, 2));

console.log("=== counts ===");
const c = await counts();
console.log(JSON.stringify(c, null, 2));
