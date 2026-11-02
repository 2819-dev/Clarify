/**
 * Expand catalog using channel /videos HTML + oEmbed verification.
 * Watch pages are bot-blocked here, so published_at may be null (column allows it).
 * Only inserts when oEmbed succeeds (iframe-verified).
 *
 * Usage: node scripts/expand-oembed-null-date.mjs
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

const EXTRA = [
  ["jewinthecity", true],
  ["simpletoremember", true],
  ["torahcafe", true],
  ["hidabrootcom", true],
  ["alephbeta", true],
  ["unpacked", true],
  ["bimbam", true],
  ["pjlibraryofficial", true],
  ["myjewishlearning", true],
  ["chabadorg", true],
  ["chabadkidsvideos", true],
  ["jewishkids", true],
  ["shalomsesame", true],
  ["six13sings", true],
  ["themaccabeats", true],
  ["jamiegeller", true],
  ["oukosher", true],
  ["standwithus", true],
  ["yadvashem", true],
  ["jewbelong", true],
  ["mayimbialik", true],
  ["hebrewpod101", true],
  ["homeschoolpop", false],
  ["freeschool", false],
  ["happylearningenglish", false],
  ["kidsacademycom", false],
  ["englishsingsing", false],
  ["mapleleaflearning", false],
  ["dreamenglishkids", false],
  ["pancakemanor", false],
  ["thelearningstation", false],
  ["havefunteaching", false],
  ["jackhartmann", false],
  ["harrykindergarten", false],
  ["scratchgarden", false],
  ["msrachel", false],
  ["peppapigofficial", false],
  ["mashaandthebear", false],
  ["bingbunny", false],
  ["firemansam", false],
  ["thomasandfriends", false],
  ["pawpatrol", false],
  ["toysandcolors", false],
  ["vladandniki", false],
  ["natgeokids", false],
  ["bbcearthkids", false],
  ["sandiegozoo", false],
  ["montereybayaquarium", false],
  ["thedadlab", false],
  ["markrober", false],
  ["scishowkids", false],
  ["crashcoursekids", false],
  ["teded", false],
  ["kurzgesagt", false],
  ["artforkidshub", false],
  ["redtedart", false],
  ["easypeasyandfun", false],
  ["cosmickidsyoga", false],
  ["gonoodle", false],
  ["numberblocks", false],
  ["alphablocks", false],
  ["blippi", false],
  ["cocomelon", false],
  ["supersimplesongs", false],
  ["mothergooseclub", false],
  ["littlebabybum", false],
  ["chuchutv", false],
  ["lego", false],
  ["minecraft", false],
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

function extractMeta(html, handle) {
  const channelId = extractChannelId(html);
  let name =
    html.match(/"channelMetadataRenderer":\{"title":"([^"\\]+)"/)?.[1] ||
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
    handle;
  if (/^(AUDIO_|CHECK_|PLAY_|ICON_|BUTTON_)/i.test(name)) {
    name =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      handle;
  }
  const description =
    html.match(/<meta property="og:description" content="([^"]*)"/i)?.[1] ||
    "";
  const avatar =
    html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || null;
  const cleanName = String(name)
    .replace(/ - YouTube$/i, "")
    .replace(/\\u0026/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
  return {
    channelId,
    name: cleanName,
    description: description.slice(0, 800),
    avatar,
  };
}

function parseRelativeDate(text) {
  if (!text) return null;
  const now = Date.now();
  const t = text.toLowerCase().trim();
  const m = t.match(
    /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/,
  );
  if (!m) {
    if (t === "streamed live" || t.includes("live")) return null;
    return null;
  }
  const n = Number(m[1]);
  const unit = m[2];
  const ms =
    unit.startsWith("second")
      ? n * 1000
      : unit.startsWith("minute")
        ? n * 60_000
        : unit.startsWith("hour")
          ? n * 3_600_000
          : unit.startsWith("day")
            ? n * 86_400_000
            : unit.startsWith("week")
              ? n * 7 * 86_400_000
              : unit.startsWith("month")
                ? n * 30 * 86_400_000
                : n * 365 * 86_400_000;
  return new Date(now - ms).toISOString();
}

function parseVideosFromChannelHtml(html, channelName) {
  const entries = [];
  const seen = new Set();
  // Split around videoId occurrences and look nearby for publishedTimeText
  for (const m of html.matchAll(
    /"videoId":"([\w-]{11})"[^]{0,400}?"publishedTimeText":\{"simpleText":"([^"]+)"/g,
  )) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    entries.push({
      youtubeId: id,
      title: `${channelName} video`,
      publishedAt: parseRelativeDate(m[2]),
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    });
    if (entries.length >= 50) break;
  }
  if (entries.length < 10) {
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
      if (entries.length >= 50) break;
    }
  }
  return entries;
}

async function isEmbeddable(youtubeId) {
  for (let i = 0; i < 3; i++) {
    try {
      const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${youtubeId}`,
      )}&format=json`;
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(900 * (i + 1));
        continue;
      }
      if (!res.ok) return null;
      return res.json();
    } catch {
      await sleep(400 * (i + 1));
    }
  }
  return null;
}

function guessCategory(title) {
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
  if (/\b(history|museum|ancient)\b/.test(t)) return ["history", "History"];
  if (/\b(yoga|sport|fitness)\b/.test(t)) return ["sports", "Sports"];
  return ["family", "Family & Calm"];
}

async function ensureExtras() {
  const existing = await sql`SELECT slug, username, youtube_url FROM channels`;
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
  for (const [handle, isJewish] of EXTRA) {
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
        failed++;
        continue;
      }
      const html = await res.text();
      const meta = extractMeta(html, handle);
      if (!meta.channelId) {
        failed++;
        continue;
      }
      // Probe embed via /videos page first video
      const page = await fetch(url.replace(/\/$/, "") + "/videos", {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      await sleep(200);
      if (!page.ok) {
        failed++;
        continue;
      }
      const vids = parseVideosFromChannelHtml(await page.text(), meta.name);
      let probeOk = false;
      for (const e of vids.slice(0, 4)) {
        const oe = await isEmbeddable(e.youtubeId);
        await sleep(150);
        if (oe?.title) {
          probeOk = true;
          break;
        }
      }
      if (!probeOk) {
        console.log(`skip non-embed @${handle}`);
        failed++;
        continue;
      }
      const username = normalizeUsername(handle);
      if (!isValidUsername(username)) {
        failed++;
        continue;
      }
      const slug = slugify(meta.name) || username;
      const taken = await sql`
        SELECT 1 FROM channels WHERE slug=${slug} OR lower(username)=${username} LIMIT 1
      `;
      if (taken.length) {
        skipped++;
        continue;
      }
      await sql`
        INSERT INTO channels (
          slug, name, description, youtube_url, avatar_url,
          is_jewish, username, youtube_channel_id, is_active
        ) VALUES (
          ${slug}, ${meta.name}, ${meta.description || ""}, ${url}, ${meta.avatar},
          ${isJewish}, ${username}, ${meta.channelId}, TRUE
        )
        ON CONFLICT (slug) DO NOTHING
      `;
      byHandle.add(username);
      byHandle.add(slug);
      added++;
      console.log(`channel + @${username} (${meta.name})`);
    } catch (err) {
      failed++;
      console.warn(`fail @${handle}`, err.message);
    }
  }
  return { added, skipped, failed };
}

async function fetchUploads(ch) {
  if (!ch.youtube_url) return [];
  const byId = new Map();
  for (const path of ["/videos", "/shorts"]) {
    try {
      const res = await fetch(ch.youtube_url.replace(/\/$/, "") + path, {
        headers: { "User-Agent": UA, Accept: "text/html" },
        redirect: "follow",
      });
      await sleep(180);
      if (!res.ok) continue;
      for (const entry of parseVideosFromChannelHtml(
        await res.text(),
        ch.name,
      )) {
        if (!byId.has(entry.youtubeId)) byId.set(entry.youtubeId, entry);
      }
    } catch {
      /* ignore */
    }
  }
  return [...byId.values()];
}

async function expandChannels(channels, perChannel) {
  const existingRows = await sql`SELECT youtube_id FROM videos`;
  const existing = new Set(existingRows.map((r) => r.youtube_id));
  let inserted = 0;
  let skippedEmbed = 0;
  let skippedExisting = 0;
  let errors = 0;

  for (const ch of channels) {
    try {
      const uploads = await fetchUploads(ch);
      let addedHere = 0;
      for (const entry of uploads.slice(0, perChannel)) {
        if (existing.has(entry.youtubeId)) {
          skippedExisting++;
          continue;
        }
        const meta = await isEmbeddable(entry.youtubeId);
        await sleep(170);
        if (!meta?.title) {
          skippedEmbed++;
          continue;
        }
        const title = meta.title || entry.title;
        const channelName = meta.author_name || entry.channelName || ch.name;
        const [categorySlug, category] = guessCategory(title);
        const isShort =
          /\b#shorts\b/i.test(title) ||
          (meta.height && meta.width && meta.height > meta.width);
        const publishedAt = entry.publishedAt; // may be null

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
            ${publishedAt}
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
  return { inserted, skippedEmbed, skippedExisting, errors, channels: channels.length };
}

async function counts() {
  const rows = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS videos,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish,true)) AS jewish,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish,true)) AS family_only,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true)) AS channels,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND COALESCE(is_jewish,true)) AS jewish_ch,
      (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active,true) AND NOT COALESCE(is_jewish,true)) AS family_ch,
      (SELECT COUNT(*)::int FROM channels WHERE youtube_url ~* 'youtube\\.com/@') AS with_at,
      (SELECT COUNT(*)::int FROM videos WHERE is_active AND published_at IS NULL) AS null_published
  `;
  return rows[0];
}

async function exportSeed() {
  const channels = await sql`
    SELECT slug, name, description, youtube_url, avatar_url, banner_url,
           subscriber_count, COALESCE(is_jewish, TRUE) AS is_jewish, username
    FROM channels WHERE COALESCE(is_active, TRUE) ORDER BY name`;
  const videos = await sql`
    SELECT v.youtube_id, v.title, v.description, ch.slug AS channel_slug,
           v.channel_name, v.category_slug, v.category, v.thumbnail_url,
           TRUE AS embeddable, COALESCE(v.is_short, FALSE) AS is_short,
           COALESCE(v.is_jewish, TRUE) AS is_jewish
    FROM videos v JOIN channels ch ON ch.id = v.channel_id
    WHERE v.is_active AND v.embeddable
    ORDER BY v.published_at DESC NULLS LAST`;
  const byCat = {};
  for (const v of videos) {
    byCat[v.category_slug || "family"] = (byCat[v.category_slug || "family"] || 0) + 1;
  }
  writeFileSync(
    resolve(root, "data/catalog-seed.json"),
    JSON.stringify(
      {
        counts: {
          videos: videos.length,
          channels: channels.length,
          by_category: byCat,
        },
        channels,
        videos,
      },
      null,
      2,
    ) + "\n",
  );
  return { videos: videos.length, channels: channels.length, by_category: byCat };
}

const before = await counts();
console.log("=== before ===");
console.log(JSON.stringify(before, null, 2));

console.log("=== curated embed-probed channels ===");
const chSummary = await ensureExtras();
console.log(JSON.stringify(chSummary, null, 2));

console.log("=== expand channels with room (0–35 videos) ===");
const targets = await sql`
  SELECT ch.id, ch.slug, ch.name, ch.youtube_url, ch.youtube_channel_id,
         COALESCE(ch.is_jewish, TRUE) AS is_jewish,
         COUNT(v.id)::int AS video_count
  FROM channels ch
  LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active
  WHERE COALESCE(ch.is_active, TRUE) = TRUE
    AND ch.youtube_url IS NOT NULL
  GROUP BY ch.id
  HAVING COUNT(v.id) <= 35
  ORDER BY COUNT(v.id) ASC, ch.name ASC
  LIMIT 320
`;
const expandSummary = await expandChannels(targets, 28);
console.log(JSON.stringify(expandSummary, null, 2));

const after = await counts();
console.log("=== after ===");
console.log(JSON.stringify(after, null, 2));
console.log("=== seed ===");
console.log(JSON.stringify(await exportSeed(), null, 2));
console.log(
  JSON.stringify(
    {
      delta_videos: after.videos - before.videos,
      delta_channels: after.channels - before.channels,
      channels_added: chSummary.added,
      videos_inserted: expandSummary.inserted,
      before,
      after,
    },
    null,
    2,
  ),
);
