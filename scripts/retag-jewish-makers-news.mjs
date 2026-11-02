#!/usr/bin/env node
/**
 * Retag catalog:
 * - Jewish mode = Jewish *makers* (creators), not merely topics-about-Jews
 * - Move news org videos into category_slug = news (and exclude from mixed home)
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const reportPath = resolve(root, "data/jewish-makers-news-report.json");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

/** Channels that are news orgs → News section (may still be jewish-made). */
const NEWS_CHANNEL_SLUGS = new Set([
  "all-israel-news",
  "haaretzcom",
  "haretz",
  "iltv-israel-news",
  "the-jerusalem-post",
  "the-times-of-israel",
  "i24news-english",
  "kanisrael",
  "algemeiner",
  "mako",
  "keshet-12",
  "bbc-newsround",
  "pix11-news",
  "cbs-new-york",
  "whyy",
]);

/**
 * About-Jews / general media not made by Jewish creators → Family-Friendly only.
 * (Keep true Jewish makers: Chabad, Aish, educators, Jewish musicians, etc.)
 */
const DEMOTE_NOT_JEWISH_MADE = new Set([
  "anne-frank-house",
  "associated-press",
  "ap-archive",
  "bbc-newsround",
  "bbc-earth",
  "bbc-earth-kids",
  "bbclearning",
  "pix11-news",
  "cbs-new-york",
  "whyy",
  "800-pound-gorilla-media",
  "history-college",
  "history-on-maps",
  "usefulcharts",
  "prageru",
  "prageru-kids",
  "united-states-holocaust-memorial-museum", // museum / institutional, not a Jewish creator channel
  "getty-museum",
  "the-met",
  "lincoln-center",
  "netflix",
  "netflix-jr",
]);

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const before = {
  channels: seed.channels.length,
  videos: seed.videos.length,
  jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
  jewish_channels: seed.channels.filter((c) => c.is_jewish !== false).length,
  news_videos: seed.videos.filter((v) => v.category_slug === "news").length,
};

const demotedChannels = [];
const newsMoved = [];

for (const ch of seed.channels) {
  if (DEMOTE_NOT_JEWISH_MADE.has(ch.slug) && ch.is_jewish !== false) {
    ch.is_jewish = false;
    demotedChannels.push({ slug: ch.slug, name: ch.name, why: "not-jewish-maker" });
  }
}

for (const v of seed.videos) {
  if (DEMOTE_NOT_JEWISH_MADE.has(v.channel_slug) && v.is_jewish !== false) {
    v.is_jewish = false;
  }
  if (NEWS_CHANNEL_SLUGS.has(v.channel_slug) && v.category_slug !== "news") {
    newsMoved.push({
      youtube_id: v.youtube_id,
      from: v.category_slug,
      channel_slug: v.channel_slug,
    });
    v.category_slug = "news";
    v.category = "News";
  }
}

seed.counts = {
  ...(seed.counts || {}),
  channels: seed.channels.length,
  videos: seed.videos.length,
  jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
  jewish_channels: seed.channels.filter((c) => c.is_jewish !== false).length,
  news_videos: seed.videos.filter((v) => v.category_slug === "news").length,
  policy: "Jewish = Jewish makers; News section separate; about-Jews by others → filtered",
  retagged_at: new Date().toISOString(),
};
writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

await sql`
  INSERT INTO categories (slug, name, description, sort_order)
  VALUES (
    'news',
    'News',
    'News and current events. Shown in the News section — not mixed into the main Jewish home feed.',
    25
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order
`;

const demoteSlugs = [...DEMOTE_NOT_JEWISH_MADE];
const newsSlugs = [...NEWS_CHANNEL_SLUGS];

const beforeDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS filtered,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news') AS news
`;

const neonDemotedCh = await sql`
  UPDATE channels SET is_jewish = FALSE
  WHERE slug = ANY(${demoteSlugs}) AND COALESCE(is_jewish, TRUE) = TRUE
  RETURNING slug, name
`;
const neonDemotedV = await sql`
  UPDATE videos SET is_jewish = FALSE, updated_at = NOW()
  WHERE channel_id IN (SELECT id FROM channels WHERE slug = ANY(${demoteSlugs}))
    AND is_active = TRUE AND COALESCE(is_jewish, TRUE) = TRUE
  RETURNING youtube_id
`;
const neonNews = await sql`
  UPDATE videos
  SET category_slug = 'news', category = 'News', updated_at = NOW()
  WHERE channel_id IN (SELECT id FROM channels WHERE slug = ANY(${newsSlugs}))
    AND is_active = TRUE
    AND COALESCE(category_slug, '') <> 'news'
  RETURNING youtube_id, channel_name
`;

const afterDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS filtered,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news') AS news,
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active
`;

const report = {
  policy: "Jewish = Jewish makers; News separate; about-Jews by others → filtered",
  before,
  after: {
    jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
    jewish_channels: seed.channels.filter((c) => c.is_jewish !== false).length,
    news_videos: seed.videos.filter((v) => v.category_slug === "news").length,
  },
  demoted_channels: demotedChannels,
  news_moved_seed: newsMoved.length,
  neon: {
    before: beforeDb[0],
    after: afterDb[0],
    demoted_channels: neonDemotedCh.length,
    demoted_videos: neonDemotedV.length,
    news_retagged: neonNews.length,
  },
};
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
