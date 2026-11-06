/**
 * Follow-up: purge remaining news stations / wire outlets that were miscategorized
 * (e.g. WXYZ-TV Detroit under "family") after the News category removal.
 *
 * Usage: node scripts/purge-news-stations-followup.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const reportPath = resolve(root, "data/purge-news-stations-report.json");

/** Explicit news stations / wire / news networks still (or formerly) in catalog. */
const NEWS_STATION_SLUGS = new Set([
  "wxyz-tv-detroit-channel-7",
  "associated-press",
  "ap-archive",
  "vox",
  "12", // Keshet 12 Israeli broadcast
  "keshet-12",
  "reuters",
  "bloomberg",
  "cnn",
  "msnbc",
  "fox-news",
  "cnbc",
  "nbc-news",
  "abc-news",
  "cbs-news",
  "cbs-new-york",
  "pbs-news-hour",
  "pbs-newshour",
  "sky-news",
  "al-jazeera",
  "al-jazeera-english",
  "bbc-news",
  "bbc-newsround",
  "i24news-english",
  "iltv-israel-news",
  "the-jerusalem-post",
  "the-times-of-israel",
  "haaretzcom",
  "haretz",
  "algemeiner",
  "kanisrael",
  "mako",
  "all-israel-news",
  "pix11-news",
  "whyy",
  "jewish-telegraphic-agency",
  "jtaorg",
]);

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

function looksLikeNewsStation(ch) {
  const slug = String(ch.slug || "").toLowerCase();
  const name = String(ch.name || "");
  const username = String(ch.username || "").toLowerCase();
  const desc = String(ch.description || "").toLowerCase();
  if (NEWS_STATION_SLUGS.has(slug)) return true;
  if (/(wxyz|aparchive|associatedpress|keshet12|foxnews|abcnews|nbcnews|cbsnews)/i.test(username)) {
    return true;
  }
  // US call-letter local TV with TV/News branding
  if (/\b(W|K)[A-Z]{2,3}(-TV| TV|\s*\||\s+Channel)/.test(name)) return true;
  if (/(-tv-|tv-detroit|tv-news|newschannel)/i.test(slug)) return true;
  // Description clearly a broadcast / wire news org (avoid sports podcasts saying "breaking news")
  if (
    /(local news|metro .+ weather|traffic, investigations|international news network|unfiltered.+global news|watch .+ news live|your .+ news source)/i.test(
      desc,
    )
  ) {
    return true;
  }
  // Name is "X News" / "NewsHour" but not kids/education/sports
  if (
    /\b(News|NewsHour)\b/i.test(name) &&
    !/(Kids|Nursery|Song|Rhymes|Academy|Museum|Science|Jewish Kids|Football|Sports|Podcast)/i.test(
      name,
    )
  ) {
    return true;
  }
  return false;
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const activeChannels = await sql`
  SELECT id, slug, name, username, description,
         COALESCE(is_active, TRUE) AS is_active,
         COALESCE(is_jewish, TRUE) AS is_jewish
  FROM channels
`;

const toPurge = activeChannels.filter(
  (ch) => ch.is_active && looksLikeNewsStation(ch),
);
const purgeSlugs = [...new Set(toPurge.map((c) => c.slug))];
const purgeIds = toPurge.map((c) => c.id);

console.log(
  "purging channels:",
  toPurge.map((c) => `${c.slug} (${c.name})`).join("\n "),
);

let deactivatedVideos = 0;
let deactivatedChannels = 0;
if (purgeIds.length) {
  const vids = await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE channel_id = ANY(${purgeIds}::uuid[])
      AND is_active = TRUE
    RETURNING id
  `;
  deactivatedVideos = vids.length;
  const chs = await sql`
    UPDATE channels
    SET is_active = FALSE
    WHERE id = ANY(${purgeIds}::uuid[])
      AND COALESCE(is_active, TRUE) = TRUE
    RETURNING slug
  `;
  deactivatedChannels = chs.length;
}

// Also force-deactivate known slugs even if inactive already (idempotent)
await sql`
  UPDATE channels
  SET is_active = FALSE
  WHERE slug = ANY(${[...NEWS_STATION_SLUGS]})
    AND COALESCE(is_active, TRUE) = TRUE
`;

// Seed scrub
const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const seedBefore = {
  channels: seed.channels.length,
  videos: seed.videos.length,
};
const seedPurgeSlugs = new Set(
  seed.channels.filter((c) => looksLikeNewsStation(c)).map((c) => c.slug),
);
for (const s of NEWS_STATION_SLUGS) seedPurgeSlugs.add(s);

const keptChannels = seed.channels.filter((c) => !seedPurgeSlugs.has(c.slug));
const keptVideos = seed.videos.filter(
  (v) => !seedPurgeSlugs.has(v.channel_slug),
);
seed.channels = keptChannels;
seed.videos = keptVideos;
if (seed.meta && typeof seed.meta === "object") {
  seed.meta.policy =
    "Jewish = Jewish makers; about-Jews by others → filtered. News stations/outlets removed from Clarify.";
  seed.meta.news_videos = 0;
  seed.meta.updated_at = new Date().toISOString();
  seed.meta.channels = keptChannels.length;
  seed.meta.videos = keptVideos.length;
  seed.meta.jewish_videos = keptVideos.filter(
    (v) => v.is_jewish !== false,
  ).length;
  seed.meta.jewish_channels = keptChannels.filter(
    (c) => c.is_jewish !== false,
  ).length;
}
writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");

const after = (
  await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos_active,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS videos_jewish,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS videos_filtered_only,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels_active,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS channels_jewish,
    (SELECT COUNT(*)::int FROM videos v
       INNER JOIN channels c ON c.id = v.channel_id
      WHERE v.is_active AND c.slug = ANY(${[...NEWS_STATION_SLUGS]})) AS news_station_videos_still_active,
    (SELECT COUNT(*)::int FROM channels
      WHERE COALESCE(is_active, TRUE) AND slug = ANY(${[...NEWS_STATION_SLUGS]})) AS news_station_channels_still_active,
    (SELECT COUNT(*)::int FROM videos v
       INNER JOIN channels c ON c.id = v.channel_id
      WHERE v.is_active AND c.slug = 'wxyz-tv-detroit-channel-7') AS wxyz_still_active
`
)[0];

const report = {
  at: new Date().toISOString(),
  purged_channel_slugs: purgeSlugs,
  neon: {
    deactivated_videos: deactivatedVideos,
    deactivated_channels: deactivatedChannels,
    after,
  },
  seed: {
    before: seedBefore,
    after: {
      channels: keptChannels.length,
      videos: keptVideos.length,
      removed_channels: seedBefore.channels - keptChannels.length,
      removed_videos: seedBefore.videos - keptVideos.length,
    },
    purged_slugs: [...seedPurgeSlugs].sort(),
  },
};

writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
