/**
 * Remove News entirely from Clarify: deactivate news videos/channels in Neon,
 * delete the news category row, and scrub catalog-seed.json.
 *
 * Usage: node scripts/purge-news-catalog.mjs
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const reportPath = resolve(root, "data/purge-news-report.json");

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

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const before = (
  await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS videos_active,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news') AS news_videos_active,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels_active,
    (SELECT COUNT(*)::int FROM categories WHERE slug = 'news') AS news_category
`
)[0];

const deactivatedVideos = await sql`
  UPDATE videos
  SET is_active = FALSE, updated_at = NOW()
  WHERE category_slug = 'news'
    AND is_active = TRUE
  RETURNING id, channel_id
`;

const newsSlugs = [...NEWS_CHANNEL_SLUGS];
const deactivatedNamed = await sql`
  UPDATE channels
  SET is_active = FALSE
  WHERE COALESCE(is_active, TRUE) = TRUE
    AND slug = ANY(${newsSlugs})
  RETURNING slug
`;

const deactivatedNewsOnly = await sql`
  UPDATE channels ch
  SET is_active = FALSE
  WHERE COALESCE(ch.is_active, TRUE) = TRUE
    AND EXISTS (
      SELECT 1 FROM videos v
      WHERE v.channel_id = ch.id AND v.category_slug = 'news'
    )
    AND NOT EXISTS (
      SELECT 1 FROM videos v2
      WHERE v2.channel_id = ch.id
        AND v2.is_active = TRUE
        AND COALESCE(v2.category_slug, '') <> 'news'
    )
  RETURNING slug
`;

// Clear FK so the News category row can be removed.
const clearedSlugs = await sql`
  UPDATE videos
  SET category_slug = NULL, category = COALESCE(NULLIF(category, ''), 'Removed'), updated_at = NOW()
  WHERE category_slug = 'news'
  RETURNING id
`;

const deletedCat = await sql`
  DELETE FROM categories WHERE slug = 'news' RETURNING slug
`;
console.log("cleared category_slug on news rows:", clearedSlugs.length);

// Seed scrub
const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const seedBefore = {
  channels: seed.channels.length,
  videos: seed.videos.length,
  news_videos: seed.videos.filter((v) => v.category_slug === "news").length,
  news_channels: seed.channels.filter((c) => NEWS_CHANNEL_SLUGS.has(c.slug))
    .length,
};

const keptVideos = seed.videos.filter((v) => v.category_slug !== "news");
const newsVideoChannelSlugs = new Set(
  seed.videos
    .filter((v) => v.category_slug === "news")
    .map((v) => v.channel_slug)
    .filter(Boolean),
);
const remainingChannelSlugs = new Set(
  keptVideos.map((v) => v.channel_slug).filter(Boolean),
);
const keptChannels = seed.channels.filter((c) => {
  if (NEWS_CHANNEL_SLUGS.has(c.slug)) return false;
  if (newsVideoChannelSlugs.has(c.slug) && !remainingChannelSlugs.has(c.slug)) {
    return false;
  }
  return true;
});

if (Array.isArray(seed.categories)) {
  seed.categories = seed.categories.filter((c) => c.slug !== "news");
}

seed.channels = keptChannels;
seed.videos = keptVideos;
if (seed.meta && typeof seed.meta === "object") {
  seed.meta.policy =
    "Jewish = Jewish makers; about-Jews by others → filtered. News removed from Clarify.";
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
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND category_slug = 'news') AS news_videos_active,
    (SELECT COUNT(*)::int FROM videos WHERE category_slug = 'news') AS news_videos_rows,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS channels_active,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS channels_jewish,
    (SELECT COUNT(*)::int FROM categories WHERE slug = 'news') AS news_category
`
)[0];

const report = {
  at: new Date().toISOString(),
  neon: {
    before,
    deactivated_videos: deactivatedVideos.length,
    deactivated_channels: [
      ...new Set([
        ...deactivatedNamed.map((r) => r.slug),
        ...deactivatedNewsOnly.map((r) => r.slug),
      ]),
    ],
    deleted_category: deletedCat.map((r) => r.slug),
    after,
  },
  seed: {
    before: seedBefore,
    after: {
      channels: keptChannels.length,
      videos: keptVideos.length,
      news_videos: keptVideos.filter((v) => v.category_slug === "news").length,
      removed_channels: seedBefore.channels - keptChannels.length,
      removed_videos: seedBefore.videos - keptVideos.length,
    },
  },
};

writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
