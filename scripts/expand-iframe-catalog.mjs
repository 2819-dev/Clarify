/**
 * Add curated Jewish + Family-Friendly channels (real @handles) and pull
 * many more iframe-verified (oEmbed OK) uploads into Neon.
 *
 * Prefer thin/empty existing channels, then new curated handles.
 * Usage: node scripts/expand-iframe-catalog.mjs
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

/** New channels to add if missing: [handleWithoutAt, isJewish, categoryHint] */
const NEW_CHANNELS = [
  // Jewish / heritage / learning / music
  ["sefaria", true, "torah"],
  ["standwithus", true, "community"],
  ["yadvashem", true, "history"],
  ["ushmm", true, "history"],
  ["jewbelong", true, "community"],
  ["torahanytime", true, "torah"],
  ["orthodoxunion", true, "community"],
  ["yeshivauniversity", true, "learning"],
  ["bennyfriedmanmusic", true, "music"],
  ["gadelbaz", true, "music"],
  ["jewishagency", true, "community"],
  ["museumofjewishheritage", true, "history"],
  ["tabletmag", true, "community"],
  ["forward", true, "community"],
  ["hadassah", true, "community"],
  ["jnfusa", true, "community"],
  ["livinglashon", true, "hebrew"],
  ["hebrewwithhila", true, "hebrew"],
  ["koshercom", true, "cooking"],
  ["jewishlearninginstitute", true, "torah"],
  ["alephbeta", true, "torah"],
  ["jewishtv", true, "family"],
  ["israelwithilan", true, "community"],
  ["travelisrael", true, "community"],
  ["jewishkids", true, "learning"],
  ["shirarinasings", true, "music"],
  ["yaakovshwekey", true, "music"],
  ["avrahamfried", true, "music"],
  ["8thdayband", true, "music"],
  ["zusha", true, "music"],
  ["matisyaahu", true, "music"],
  ["thejewishchannel", true, "community"],
  ["jewishaction", true, "community"],
  ["chabadoncampus", true, "community"],
  ["moishiehellman", true, "music"],
  ["berelweiss", true, "music"],
  // Family-friendly
  ["storybots", false, "learning"],
  ["thedadlab", false, "science"],
  ["teded", false, "learning"],
  ["kurzgesagt", false, "science"],
  ["mothergooseclub", false, "music"],
  ["peekabookidz", false, "learning"],
  ["smileandlearn", false, "learning"],
  ["sandiegozoo", false, "nature"],
  ["montereybayaquarium", false, "nature"],
  ["smithsonianchannel", false, "history"],
  ["amnhorg", false, "science"],
  ["codeorg", false, "learning"],
  ["busybeavers", false, "music"],
  ["chuchutv", false, "music"],
  ["littlebabybum", false, "music"],
  ["generationgenius", false, "science"],
  ["smartereveryday", false, "science"],
  ["howitsmadeofficial", false, "science"],
  ["nationalgeographic", false, "nature"],
  ["bbcearth", false, "nature"],
  ["crashcourse", false, "learning"],
  ["scishow", false, "science"],
  ["minutephysics", false, "science"],
  ["numberphile", false, "science"],
  ["veritasium", false, "science"],
  ["markrober", false, "science"],
  ["guinnessworldrecords", false, "family"],
  ["animalplanet", false, "nature"],
  ["artforkidshub", false, "crafts"],
  ["drawingwithmichael", false, "crafts"],
  ["simplehistory", false, "history"],
  ["oversimplified", false, "history"],
  ["odditysshorts", false, "family"],
  ["kidslearningtube", false, "learning"],
  ["freeschool", false, "learning"],
  ["happylearningenglish", false, "learning"],
  ["twinkl", false, "learning"],
  ["oxfordowl", false, "learning"],
  ["britmuseum", false, "history"],
  ["smithsonian", false, "history"],
  ["nasa", false, "science"],
  ["esa", false, "science"],
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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

function extractMeta(html, handle) {
  const channelId = extractChannelId(html);
  let name =
    html.match(/"channelMetadataRenderer":\{"title":"([^"\\]+)"/)?.[1] ||
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
    html.match(/"name":"([^"\\]{2,120})"/)?.[1] ||
    handle;
  if (/^(AUDIO_|CHECK_|PLAY_|ICON_|BUTTON_)/i.test(name)) {
    name =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      handle;
  }
  const description =
    html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ||
    html.match(/"description":"([^"\\]{0,500})"/)?.[1]?.replace(/\\n/g, " ") ||
    "";
  const avatar =
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ||
    html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)?.[1] ||
    null;
  const subsRaw =
    html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1] ||
    html.match(/"subscriberCount":"(\d+)"/)?.[1];
  let subscriberCount = null;
  if (subsRaw) {
    const n = Number(String(subsRaw).replace(/[^\d]/g, ""));
    if (Number.isFinite(n) && n > 0) subscriberCount = n;
  }
  const cleanName = name
    .replace(/ - YouTube$/i, "")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
  return {
    channelId,
    name: cleanName,
    description: description.slice(0, 800),
    avatar,
    subscriberCount,
  };
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

function guessCategory(title, isJewish, hint) {
  const t = title.toLowerCase();
  if (/\b(hanukkah|chanukah|purim|passover|pesach|sukkot|rosh|yom kippur|shavuot|lag ba)\b/.test(t))
    return ["holidays", "Holidays"];
  if (/\b(shabbat|shabbos|kabbalat)\b/.test(t)) return ["shabbat", "Shabbat"];
  if (/\b(modeh ani|shema|prayer|tefill|brach|bracha|amidah|oseh shalom)\b/.test(t))
    return ["prayer", "Prayer"];
  if (/\b(aleph|hebrew|ivrit|alphabet)\b/.test(t)) return ["hebrew", "Learning Hebrew"];
  if (/\b(parsha|torah|midrash|talmud|rashi|bible stor|holocaust|shoah)\b/.test(t))
    return ["torah", "Torah & Stories"];
  if (/\b(song|sing|music|a cappella|acapella|niggun|cover|nursery)\b/.test(t))
    return ["music", "Music"];
  if (/\b(cook|recipe|bake|kitchen|food|kosher)\b/.test(t)) return ["cooking", "Cooking"];
  if (/\b(minecraft|lego|roblox|gameplay|nintendo)\b/.test(t))
    return ["gaming", "Gaming"];
  if (/\b(craft|diy|origami|draw|paint)\b/.test(t)) return ["crafts", "Crafts & DIY"];
  if (/\b(science|experiment|how to|howto|physics|chemistry|space)\b/.test(t))
    return ["science", "Science & How-To"];
  if (/\b(nature|wildlife|animal|ocean|zoo|aquarium)\b/.test(t))
    return ["nature", "Nature"];
  if (/\b(history|civilization|empire|war|ancient)\b/.test(t))
    return ["history", "History"];
  if (/\b(yoga|sport|fitness|soccer|basketball)\b/.test(t)) return ["sports", "Sports"];
  if (hint) {
    const map = {
      torah: ["torah", "Torah & Stories"],
      community: ["community", "Community"],
      history: ["history", "History"],
      music: ["music", "Music"],
      hebrew: ["hebrew", "Learning Hebrew"],
      cooking: ["cooking", "Cooking"],
      learning: ["learning", "Kids Learning"],
      family: ["family", "Family & Calm"],
      science: ["science", "Science & How-To"],
      nature: ["nature", "Nature"],
      crafts: ["crafts", "Crafts & DIY"],
      sports: ["sports", "Sports"],
      holidays: ["holidays", "Holidays"],
    };
    if (map[hint]) return map[hint];
  }
  return isJewish ? ["family", "Family & Calm"] : ["family", "Family & Calm"];
}

async function ensureNewChannels() {
  const existing = await sql`
    SELECT slug, username, youtube_url FROM channels
  `;
  const byHandle = new Set();
  for (const row of existing) {
    if (row.username) byHandle.add(String(row.username).toLowerCase());
    const at = row.youtube_url?.match(/youtube\.com\/@([^/?#]+)/i)?.[1];
    if (at) byHandle.add(decodeURIComponent(at).toLowerCase());
    byHandle.add(String(row.slug).toLowerCase());
  }

  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const [handle, isJewish, hint] of NEW_CHANNELS) {
    const key = handle.toLowerCase();
    if (byHandle.has(key)) {
      skipped++;
      continue;
    }
    const url = `https://www.youtube.com/@${handle}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      await sleep(250);
      if (!res.ok) {
        console.warn(`skip @${handle}: HTTP ${res.status}`);
        failed++;
        continue;
      }
      const html = await res.text();
      const meta = extractMeta(html, handle);
      if (!meta.channelId) {
        console.warn(`skip @${handle}: no channelId`);
        failed++;
        continue;
      }
      const username = normalizeUsername(handle);
      if (!isValidUsername(username)) {
        failed++;
        continue;
      }
      const slug = slugify(meta.name) || username;
      const taken = await sql`SELECT 1 FROM channels WHERE slug = ${slug} OR lower(username)=${username} LIMIT 1`;
      if (taken.length) {
        skipped++;
        continue;
      }
      await sql`
        INSERT INTO channels (
          slug, name, description, youtube_url, avatar_url,
          subscriber_count, is_jewish, username, youtube_channel_id, is_active
        ) VALUES (
          ${slug},
          ${meta.name},
          ${meta.description || null},
          ${url},
          ${meta.avatar},
          ${meta.subscriberCount},
          ${isJewish},
          ${username},
          ${meta.channelId},
          TRUE
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      byHandle.add(username);
      byHandle.add(slug);
      added++;
      console.log(`channel + @${username} (${meta.name}) jewish=${isJewish} hint=${hint}`);
    } catch (err) {
      failed++;
      console.warn(`fail @${handle}:`, err.message);
    }
  }
  return { added, skipped, failed };
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
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) return [];
  return parseVideosFromChannelHtml(await res.text(), ch.name);
}

async function expandVideos({ channelLimit = 180, perChannel = 18 } = {}) {
  const channels = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.youtube_url, ch.youtube_channel_id,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active
    WHERE COALESCE(ch.is_active, TRUE) = TRUE
      AND ch.youtube_url IS NOT NULL
    GROUP BY ch.id
    ORDER BY COUNT(v.id) ASC, ch.name ASC
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
      await sleep(180);
      let addedHere = 0;
      for (const entry of uploads.slice(0, perChannel)) {
        if (existing.has(entry.youtubeId)) {
          skippedExisting++;
          continue;
        }
        const meta = await isEmbeddable(entry.youtubeId);
        await sleep(70);
        if (!meta?.title) {
          skippedEmbed++;
          continue;
        }
        const title = meta.title || entry.title;
        const channelName = meta.author_name || entry.channelName || ch.name;
        const [categorySlug, category] = guessCategory(title, ch.is_jewish);
        const isShort =
          /\b#shorts\b/i.test(title) ||
          (meta.height && meta.width && meta.height > meta.width);

        let publishedAt = entry.publishedAt;
        if (!publishedAt) {
          publishedAt = await fetchPublishedAt(entry.youtubeId);
          await sleep(60);
        }
        if (!publishedAt) {
          skippedEmbed++;
          continue;
        }

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
        if (addedHere <= 3 || addedHere % 5 === 0) {
          console.log(`+ ${ch.slug} ${entry.youtubeId} ${title.slice(0, 55)}`);
        }
      }
      console.log(
        `channel ${ch.slug} (had ${ch.video_count}): +${addedHere} / ${uploads.length} scanned`,
      );
    } catch (err) {
      errors++;
      console.warn(`channel fail ${ch.slug}:`, err.message);
    }
  }

  return {
    inserted,
    skippedExisting,
    skippedEmbed,
    errors,
    channels: channels.length,
  };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS embeddable,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS family_only_videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND is_short) AS shorts,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS jewish_channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND NOT COALESCE(is_jewish, TRUE)) AS family_channels,
      (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS channels_with_at_url
  `;
  return rows[0];
}

async function exportSeedSnapshot() {
  const channels = await sql`
    SELECT slug, name, description, youtube_url, avatar_url, banner_url,
           subscriber_count, COALESCE(is_jewish, TRUE) AS is_jewish, username
    FROM channels
    WHERE COALESCE(is_active, TRUE)
    ORDER BY name
  `;
  const videos = await sql`
    SELECT v.youtube_id, v.title, v.description, ch.slug AS channel_slug,
           v.channel_name, v.category_slug, v.category, v.thumbnail_url,
           TRUE AS embeddable, COALESCE(v.is_short, FALSE) AS is_short,
           COALESCE(v.is_jewish, TRUE) AS is_jewish
    FROM videos v
    JOIN channels ch ON ch.id = v.channel_id
    WHERE v.is_active AND v.embeddable
    ORDER BY v.published_at DESC NULLS LAST
  `;
  const byCat = {};
  for (const v of videos) {
    const key = v.category_slug || "family";
    byCat[key] = (byCat[key] || 0) + 1;
  }
  const payload = {
    counts: {
      videos: videos.length,
      channels: channels.length,
      by_category: byCat,
    },
    channels,
    videos,
  };
  writeFileSync(
    resolve(root, "data/catalog-seed.json"),
    JSON.stringify(payload, null, 2) + "\n",
  );
  return payload.counts;
}

console.log("=== before ===");
const before = await counts();
console.log(JSON.stringify(before, null, 2));

console.log("=== add curated @handle channels ===");
const chSummary = await ensureNewChannels();
console.log(JSON.stringify(chSummary, null, 2));

console.log("=== expand iframe-verified uploads (thin channels first) ===");
const expandSummary = await expandVideos({ channelLimit: 220, perChannel: 20 });
console.log(JSON.stringify(expandSummary, null, 2));

console.log("=== after ===");
const after = await counts();
console.log(JSON.stringify(after, null, 2));

console.log("=== export seed snapshot ===");
const seedCounts = await exportSeedSnapshot();
console.log(JSON.stringify(seedCounts, null, 2));

console.log(
  JSON.stringify(
    {
      delta_videos: after.videos - before.videos,
      delta_channels: after.channels - before.channels,
      before,
      after,
      channels_added: chSummary.added,
      videos_inserted: expandSummary.inserted,
    },
    null,
    2,
  ),
);
