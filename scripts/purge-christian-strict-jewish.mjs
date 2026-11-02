#!/usr/bin/env node
/**
 * Catalog policy pass (2026-11-02):
 * 1) Purge Jesus / Christianity / Messianic / Jews-for-Jesus outreach
 * 2) Strict Jewish mode: demote non-Jewish ambience/secular to is_jewish=false
 *    (still available in Family-Friendly / filtered mode)
 * 3) Does not delete Jewish music from the catalog — home UI excludes music
 *    from the mixed Latest feed (see src/app/page.tsx).
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const reportPath = resolve(root, "data/christian-purge-report.json");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

/** Whole channels that are Christian, Messianic, or evangelical outreach. */
const PURGE_CHANNEL_SLUGS = new Set([
  "119ministries",
  "bible-in-a-nutshell",
  "joshua-paul-bold-follower-of-jesus",
  "messianic-jewish-alliance-of-israel",
  "anointed-messianic-network",
  "congregation-of-israel",
  "the-kids-action-bible-show",
  "my-first-bible",
  "biblefacts",
  "ark-party",
  "bhs-kids-dallas",
  "redefined-tv-kids",
  "teach-torah-to-kids",
  "shalom-macon-kids",
  "dr-faussy-lala",
  "lynn-kidmin-pathway",
  "the-superior-word",
  "sergio-rhoda-in-israel", // The Superior Word
]);

/**
 * Non-Jewish sleep / nature ambience and clearly secular entertainment
 * wrongly tagged Jewish → Family-Friendly only.
 */
const DEMOTE_CHANNEL_SLUGS = new Set([
  "deepsleepnature",
  "nature-vibes-escape",
  "relaxation-film",
  "nature-relaxation-films",
  "geo-relaxation",
  "aquarium-ocean-4k",
  "natures-symphony",
  "ocean-4k-relaxation-film",
  "nature-vibes",
  "soothing-relaxation",
  // Secular kids / entertainment / general cooking (not Jewish content)
  "geethanjali-kids-rhymes-and-stories",
  "geethanjali-cartoons-for-kids",
  "go-chatter-studios",
  "dailygriffins",
  "prageru",
  "prageru-kids",
  "chef-singh-cooking",
  "cookbook",
  "courtneys-sweets",
  "delish",
  "hellthyjunkfood",
  "hiho-kids",
  "club-baby-edu",
  "jammin-with-you-kids-songs-family-jams",
  "kids-academy",
  "mr-homeschool-educational-videos-for-kids",
  "fgteev",
  "vlad-and-niki",
  "thomas-friends",
  "netflix",
  "netflix-jr",
  "comedy-dynamics",
  "dry-bar-comedy",
  "usefulcharts",
  "youliketravel",
  "creassun",
  "freedomfriends-podcast",
  "wocomohumanity",
  "wocomohistory",
  "adam-witt",
  "home-cooks-world",
  "diy-life-tech",
  "learning-with-nonna",
  "twinkl-teaching-resources-united-states",
  "brightly-storytime",
  "getty-museum",
  "the-met",
  "lincoln-center",
  "nba",
  "versed",
  "bibly",
  "todd-turner",
  "famouss-richard",
  "gamer",
  "geo-history",
  "yuk-cari-tahu",
  "kdm",
  "la-biblia-sin-mitos-cesar-silva",
  "la-biblia-sin-mitos-c-sar-silva",
]);

/** Jewish counter-missionary / education — never purge on Jesus keyword alone. */
const KEEP_CHANNEL_SLUGS = new Set([
  "jews-for-judaism",
  "simpletoremember",
  "torah-thinking",
  "rabbi-manis-friedman",
  "jewishpathways",
  "hadar",
  "meaningful-minute",
  "jewish-action",
  "jewish-history",
  "aish-studios",
  "bimbam",
]);

function textOf(v) {
  return `${v.title || ""}\n${v.description || ""}\n${v.channel_name || ""}`;
}

function isChristianVideo(v) {
  if (PURGE_CHANNEL_SLUGS.has(v.channel_slug)) {
    return { hit: true, why: `channel:${v.channel_slug}` };
  }
  if (KEEP_CHANNEL_SLUGS.has(v.channel_slug)) {
    return { hit: false };
  }

  const t = textOf(v);

  // Strong Christian / Messianic outreach signals
  if (
    /\b(Jesus|Yeshua|Christ\b|Christianity|Christians?\b|Messianic|Gospel of John|Gospel of Matthew|New Testament|Holy Spirit|born again|Jews for Jesus|Nativity|crucifixion|resurrection of Jesus|Sunday School|Kids Church|Christian Kids|Christian Music|Jesus Music|Feel Good Jesus)\b/i.test(
      t,
    )
  ) {
    // Allow Jewish “why we don’t believe / debate missionaries” titles only on keep list
    return { hit: true, why: "christian-keyword" };
  }
  if (
    /\b(Pastor |Apostle |evangelical|Catholic Origin|Saint Boniface|Virgin and Child|John the Baptist)\b/i.test(
      t,
    )
  ) {
    return { hit: true, why: "church-keyword" };
  }
  if (/\b(Christmas Songs?|Merry Christmas|Away in a Manger|Silent Night|Hark the Herald|Joy to the World)\b/i.test(t)) {
    return { hit: true, why: "christmas-christian" };
  }
  return { hit: false };
}

function shouldDemoteChannel(ch) {
  if (PURGE_CHANNEL_SLUGS.has(ch.slug)) return false;
  if (DEMOTE_CHANNEL_SLUGS.has(ch.slug)) return true;
  const n = `${ch.name || ""} ${ch.slug || ""} ${ch.description || ""}`;
  if (
    /\b(sleep|relaxation|ambient|ocean 4k|aquarium|white noise|nature vibes|soothing)\b/i.test(
      n,
    ) &&
    !/\b(jewish|torah|israel|hebrew|shabbat)\b/i.test(n)
  ) {
    return true;
  }
  return false;
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const before = {
  channels: seed.channels.length,
  videos: seed.videos.length,
  jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
  jewish_channels: seed.channels.filter((c) => c.is_jewish !== false).length,
};

const removedVideos = [];
const demotedChannels = [];
const demotedVideos = [];

for (const v of seed.videos) {
  const c = isChristianVideo(v);
  if (c.hit) {
    removedVideos.push({
      reason: c.why,
      youtube_id: v.youtube_id,
      title: v.title,
      channel_name: v.channel_name,
      channel_slug: v.channel_slug,
    });
  }
}

const removeYoutubeIds = new Set(removedVideos.map((v) => v.youtube_id));
seed.videos = seed.videos.filter((v) => !removeYoutubeIds.has(v.youtube_id));

// Drop purged channels from seed; demote ambience/secular to filtered-only
const remainingSlugs = new Set(seed.videos.map((v) => v.channel_slug));
seed.channels = seed.channels.filter((ch) => {
  if (PURGE_CHANNEL_SLUGS.has(ch.slug)) return false;
  // Also drop channels that lost every video to the purge
  if (!remainingSlugs.has(ch.slug) && !KEEP_CHANNEL_SLUGS.has(ch.slug)) {
    // keep empty channels that were not purged? Prefer drop if no videos
    return remainingSlugs.has(ch.slug);
  }
  return true;
});

for (const ch of seed.channels) {
  if (ch.is_jewish === false) continue;
  if (shouldDemoteChannel(ch)) {
    ch.is_jewish = false;
    demotedChannels.push({ slug: ch.slug, name: ch.name });
  }
}

const demotedSlugSet = new Set(demotedChannels.map((c) => c.slug));
for (const v of seed.videos) {
  if (v.is_jewish === false) continue;
  if (demotedSlugSet.has(v.channel_slug) || DEMOTE_CHANNEL_SLUGS.has(v.channel_slug)) {
    v.is_jewish = false;
    demotedVideos.push({
      youtube_id: v.youtube_id,
      title: v.title,
      channel_slug: v.channel_slug,
    });
  }
}

seed.counts = {
  ...(seed.counts || {}),
  channels: seed.channels.length,
  videos: seed.videos.length,
  jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
  filtered_only_videos: seed.videos.filter((v) => v.is_jewish === false).length,
  purged_christian_videos: removedVideos.length,
  demoted_to_filtered_channels: demotedChannels.length,
  demoted_to_filtered_videos: demotedVideos.length,
  policy:
    "purge Christian/Messianic; Jewish mode = clearly Jewish only; ambience→filtered; music stays in Music section",
  purged_at: new Date().toISOString(),
};

writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const beforeDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish_videos,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS filtered_only_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS jewish_channels
`;

const youtubeIds = [...removeYoutubeIds];
const deactivatedVideos = youtubeIds.length
  ? await sql`
      UPDATE videos
      SET is_active = FALSE, updated_at = NOW()
      WHERE youtube_id = ANY(${youtubeIds})
        AND is_active = TRUE
      RETURNING youtube_id, title, channel_name
    `
  : [];

const purgeSlugs = [...PURGE_CHANNEL_SLUGS];
const deactivatedChannels = purgeSlugs.length
  ? await sql`
      UPDATE channels
      SET is_active = FALSE
      WHERE slug = ANY(${purgeSlugs})
        AND COALESCE(is_active, TRUE) = TRUE
      RETURNING slug, name
    `
  : [];

const demoteSlugs = [
  ...new Set([...demotedSlugSet, ...DEMOTE_CHANNEL_SLUGS]),
].filter((s) => !PURGE_CHANNEL_SLUGS.has(s));

const neonDemotedChannels = demoteSlugs.length
  ? await sql`
      UPDATE channels
      SET is_jewish = FALSE
      WHERE slug = ANY(${demoteSlugs})
        AND COALESCE(is_jewish, TRUE) = TRUE
      RETURNING slug, name
    `
  : [];

const neonDemotedVideos = demoteSlugs.length
  ? await sql`
      UPDATE videos
      SET is_jewish = FALSE, updated_at = NOW()
      WHERE channel_id IN (SELECT id FROM channels WHERE slug = ANY(${demoteSlugs}))
        AND COALESCE(is_jewish, TRUE) = TRUE
        AND is_active = TRUE
      RETURNING youtube_id, title, channel_name
    `
  : [];

// Also demote any remaining active Christian-keyword videos missed by seed slug drift
const keywordScan = await sql`
  SELECT youtube_id, title, channel_name
  FROM videos
  WHERE is_active = TRUE
    AND (
      title ~* '\\m(Jesus|Yeshua|Christianity|Messianic|Holy Spirit|Jews for Jesus|Jesus Music|Christian Kids|Kids Church)\\M'
      OR title ~* '\\m(Feel Good Jesus|born again|Nativity)\\M'
    )
    AND channel_name NOT ILIKE '%Jews for Judaism%'
    AND channel_name NOT ILIKE '%simpletoremember%'
    AND channel_name NOT ILIKE '%Tovia%'
`;
const extraIds = keywordScan.map((r) => r.youtube_id).filter(Boolean);
const extraDeactivated = extraIds.length
  ? await sql`
      UPDATE videos
      SET is_active = FALSE, updated_at = NOW()
      WHERE youtube_id = ANY(${extraIds})
        AND is_active = TRUE
      RETURNING youtube_id, title, channel_name
    `
  : [];

const afterDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND COALESCE(is_jewish, TRUE)) AS jewish_videos,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND NOT COALESCE(is_jewish, TRUE)) AS filtered_only_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE) AND COALESCE(is_jewish, TRUE)) AS jewish_channels
`;

const report = {
  policy:
    "purge Christian/Messianic; Jewish mode strict; sleep/nature + secular → filtered; music section separate on home",
  before,
  after: {
    channels: seed.channels.length,
    videos: seed.videos.length,
    jewish_videos: seed.videos.filter((v) => v.is_jewish !== false).length,
    jewish_channels: seed.channels.filter((c) => c.is_jewish !== false).length,
    filtered_only_videos: seed.videos.filter((v) => v.is_jewish === false)
      .length,
  },
  removed_videos: removedVideos.length,
  removed_by_reason: removedVideos.reduce((acc, v) => {
    acc[v.reason] = (acc[v.reason] || 0) + 1;
    return acc;
  }, {}),
  removed_sample: removedVideos.slice(0, 40),
  purged_channels: [...PURGE_CHANNEL_SLUGS],
  demoted_channels: demotedChannels,
  demoted_videos_seed: demotedVideos.length,
  neon: {
    before: beforeDb[0],
    after: afterDb[0],
    deactivated_videos: deactivatedVideos.length + extraDeactivated.length,
    deactivated_channels: deactivatedChannels.length,
    demoted_channels: neonDemotedChannels.length,
    demoted_videos: neonDemotedVideos.length,
    extra_keyword_deactivated: extraDeactivated,
    deactivated_channel_rows: deactivatedChannels,
  },
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
