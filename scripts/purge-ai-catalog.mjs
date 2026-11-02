#!/usr/bin/env node
/**
 * Purge AI-*generated* media from catalog-seed.json and Neon.
 *
 * Policy (2026-11-02 correction):
 * - REMOVE: AI-generated content (AI Animation, Suno/Sora/Grok music, #aivideo/#aiart,
 *   face-swap entertainment, Midjourney/Runway slideshows, etc.)
 * - KEEP: AI-*topic* videos about ChatGPT/OpenAI/LLMs/ethics/news/learning AI.
 *
 * Soft-deactivates matching Neon rows (is_active = false) and rewrites the seed.
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

/** Detect AI-generated media (not merely videos about AI). */
function isAiGeneratedMedia(v) {
  const title = v.title || "";
  const desc = v.description || "";
  const ch = v.channel_name || "";
  const t = `${title}\n${desc}\n${ch}`;

  if (/\bAI Animation\b/i.test(title)) return { gen: true, why: "AI Animation series" };
  if (/#(aivideo|aiart|aigenerated)\b/i.test(t)) return { gen: true, why: "AI media hashtag" };
  if (
    /\b(Feat\.?\s*)?(Suno|Sora 2|GROK AI)\b/i.test(title) &&
    /(Липовый|music|feat)/i.test(t)
  ) {
    return { gen: true, why: "AI music (Suno/Sora/Grok)" };
  }
  if (
    /\b(Midjourney|Runway ML|Runway Gen)\b/i.test(t) &&
    /(made with|generated|slideshow|art video)/i.test(t)
  ) {
    return { gen: true, why: "Midjourney/Runway media" };
  }
  if (/FACE SWAPER AI|AI MERUBAH VIDEO/i.test(title)) {
    return { gen: true, why: "AI face-swap entertainment" };
  }
  if (/\bAI deepfake\b/i.test(title) && !/\b(news|law|ban|ethics|detect)/i.test(title)) {
    return { gen: true, why: "AI deepfake entertainment" };
  }
  return { gen: false };
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const before = {
  channels: seed.channels.length,
  videos: seed.videos.length,
};

const removeVideos = [];
for (const v of seed.videos) {
  const c = isAiGeneratedMedia(v);
  if (c.gen) {
    removeVideos.push({
      reason: c.why,
      youtube_id: v.youtube_id,
      title: v.title,
      channel_name: v.channel_name,
      channel_slug: v.channel_slug,
    });
  }
}

const removeYoutubeIds = new Set(removeVideos.map((v) => v.youtube_id));
seed.videos = seed.videos.filter((v) => !removeYoutubeIds.has(v.youtube_id));
seed.counts = {
  ...(seed.counts || {}),
  channels: seed.channels.length,
  videos: seed.videos.length,
  purged_ai_generated_videos: removeVideos.length,
  policy: "remove AI-generated media only; keep AI-topic",
  purged_at: new Date().toISOString(),
};
writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const beforeDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels
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

const afterDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels
`;

const report = {
  policy: "remove AI-generated media only; keep AI-topic",
  before,
  after: { channels: seed.channels.length, videos: seed.videos.length },
  removed_videos: removeVideos.length,
  removed: removeVideos,
  neon: {
    before: beforeDb[0],
    after: afterDb[0],
    deactivated_videos: deactivatedVideos.length,
  },
};

writeFileSync(
  resolve(root, "data/ai-generated-purge-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
