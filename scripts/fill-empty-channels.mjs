/**
 * Fill channels that currently have 0 active videos with iframe-verified uploads.
 * Slower oEmbed pacing + retries to avoid YouTube rate limits.
 *
 * Usage: node scripts/fill-empty-channels.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "fs";
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function extractChannelId(html) {
  for (const re of [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
  ]) {
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
      publishedAt: null,
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (entries.length >= 40) break;
  }
  return entries;
}

async function isEmbeddable(youtubeId) {
  for (let i = 0; i < 4; i++) {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`,
      )}&format=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await sleep(500 * (i + 1));
    }
  }
  return null;
}

async function fetchPublishedAt(youtubeId) {
  try {
    const watchRes = await fetch(
      `https://www.youtube.com/watch?v=${youtubeId}`,
      {
        headers: {
          "User-Agent": UA,
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    );
    if (!watchRes.ok) return null;
    const html = await watchRes.text();
    const raw =
      html.match(/"uploadDate":"([^"]+)"/)?.[1] ||
      html.match(/"publishDate":"([^"]+)"/)?.[1];
    if (raw && !Number.isNaN(new Date(raw).getTime())) {
      return new Date(raw).toISOString();
    }
  } catch {
    /* ignore */
  }
  return null;
}

function guessCategory(title, isJewish) {
  const t = title.toLowerCase();
  if (/\b(hanukkah|chanukah|purim|passover|pesach|sukkot|rosh|yom kippur|shavuot)\b/.test(t))
    return ["holidays", "Holidays"];
  if (/\b(shabbat|shabbos)\b/.test(t)) return ["shabbat", "Shabbat"];
  if (/\b(prayer|tefill|shema|brach)\b/.test(t)) return ["prayer", "Prayer"];
  if (/\b(hebrew|aleph|ivrit)\b/.test(t)) return ["hebrew", "Learning Hebrew"];
  if (/\b(torah|parsha|talmud|holocaust|shoah)\b/.test(t))
    return ["torah", "Torah & Stories"];
  if (/\b(song|sing|music|nursery|rhyme)\b/.test(t)) return ["music", "Music"];
  if (/\b(cook|recipe|bake|food|kosher)\b/.test(t)) return ["cooking", "Cooking"];
  if (/\b(minecraft|lego|roblox|game)\b/.test(t)) return ["gaming", "Gaming"];
  if (/\b(craft|diy|draw|paint|origami)\b/.test(t)) return ["crafts", "Crafts & DIY"];
  if (/\b(science|experiment|physics|space|math)\b/.test(t))
    return ["science", "Science & How-To"];
  if (/\b(nature|wildlife|animal|ocean|zoo|aquarium)\b/.test(t))
    return ["nature", "Nature"];
  if (/\b(history|museum|ancient|war)\b/.test(t)) return ["history", "History"];
  if (/\b(yoga|sport|fitness)\b/.test(t)) return ["sports", "Sports"];
  return isJewish ? ["family", "Family & Calm"] : ["family", "Family & Calm"];
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
  const byId = new Map();
  if (channelId) {
    try {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
      const res = await fetch(feedUrl, {
        headers: { "User-Agent": UA, Accept: "application/atom+xml,text/xml" },
      });
      if (res.ok) {
        for (const entry of parseAtomFeed(await res.text())) {
          byId.set(entry.youtubeId, entry);
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (ch.youtube_url && byId.size < 12) {
    try {
      const res = await fetch(ch.youtube_url.replace(/\/$/, "") + "/videos", {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      if (res.ok) {
        for (const entry of parseVideosFromChannelHtml(
          await res.text(),
          ch.name,
        )) {
          if (!byId.has(entry.youtubeId)) byId.set(entry.youtubeId, entry);
        }
      }
    } catch {
      /* ignore */
    }
  }
  return [...byId.values()];
}

const before = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true)) AS channels
`;
console.log("before", before[0]);

const channels = await sql`
  SELECT ch.id, ch.slug, ch.name, ch.youtube_url, ch.youtube_channel_id,
         COALESCE(ch.is_jewish, TRUE) AS is_jewish
  FROM channels ch
  WHERE COALESCE(ch.is_active, TRUE) = TRUE
    AND ch.youtube_url IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM videos v WHERE v.channel_id = ch.id AND v.is_active
    )
  ORDER BY ch.name ASC
`;
console.log(`empty channels to fill: ${channels.length}`);

const existingRows = await sql`SELECT youtube_id FROM videos`;
const existing = new Set(existingRows.map((r) => r.youtube_id));

let inserted = 0;
let skippedEmbed = 0;
let skippedExisting = 0;
let errors = 0;

for (const ch of channels) {
  try {
    const uploads = await fetchUploads(ch);
    await sleep(250);
    let addedHere = 0;
    for (const entry of uploads.slice(0, 18)) {
      if (existing.has(entry.youtubeId)) {
        skippedExisting++;
        continue;
      }
      const meta = await isEmbeddable(entry.youtubeId);
      await sleep(220);
      if (!meta?.title) {
        skippedEmbed++;
        continue;
      }
      let publishedAt = entry.publishedAt;
      if (!publishedAt) {
        publishedAt = await fetchPublishedAt(entry.youtubeId);
        await sleep(180);
      }
      if (!publishedAt) {
        skippedEmbed++;
        continue;
      }
      const title = meta.title || entry.title;
      const channelName = meta.author_name || entry.channelName || ch.name;
      const [categorySlug, category] = guessCategory(title, ch.is_jewish);
      const isShort =
        /\b#shorts\b/i.test(title) ||
        (meta.height && meta.width && meta.height > meta.width);

      if (meta.author_url && /youtube\.com\/@/i.test(meta.author_url)) {
        const handle = normalizeUsername(
          meta.author_url.match(/youtube\.com\/@([^/?#]+)/i)?.[1],
        );
        if (isValidUsername(handle)) {
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
      }

      await sql`
        INSERT INTO videos (
          youtube_id, title, description, channel_name, channel_id,
          category, category_slug, thumbnail_url, is_short, is_jewish,
          embeddable, is_active, published_at
        ) VALUES (
          ${entry.youtubeId},
          ${title},
          ${""},
          ${channelName},
          ${ch.id}::uuid,
          ${category},
          ${categorySlug},
          ${entry.thumbnailUrl || meta.thumbnail_url || `https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`},
          ${Boolean(isShort)},
          ${Boolean(ch.is_jewish)},
          TRUE,
          TRUE,
          ${publishedAt}::timestamptz
        )
        ON CONFLICT (youtube_id) DO NOTHING
      `;
      existing.add(entry.youtubeId);
      inserted++;
      addedHere++;
      if (addedHere <= 2) {
        console.log(`+ ${ch.slug} ${entry.youtubeId} ${title.slice(0, 55)}`);
      }
    }
    console.log(`channel ${ch.slug}: +${addedHere} / ${uploads.length}`);
  } catch (err) {
    errors++;
    console.warn(`fail ${ch.slug}:`, err.message);
  }
}

const after = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS videos,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish,true)) AS jewish,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish,true)) AS family_only,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true)) AS channels,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND COALESCE(is_jewish,true)) AS jewish_ch,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND NOT COALESCE(is_jewish,true)) AS family_ch,
    (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS with_at,
    (SELECT COUNT(*)::int FROM channels ch WHERE COALESCE(is_active,true)
      AND NOT EXISTS (SELECT 1 FROM videos v WHERE v.channel_id=ch.id AND v.is_active)) AS still_empty
`;

console.log(
  JSON.stringify(
    {
      before: before[0],
      after: after[0],
      inserted,
      skippedEmbed,
      skippedExisting,
      errors,
      delta_videos: after[0].videos - before[0].videos,
    },
    null,
    2,
  ),
);

// Light seed counts patch (full export after second pass)
writeFileSync(
  "/tmp/fill-empty-summary.json",
  JSON.stringify({ inserted, after: after[0] }, null, 2),
);
