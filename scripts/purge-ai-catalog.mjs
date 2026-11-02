#!/usr/bin/env node
/**
 * Remove AI-related channels/videos from catalog-seed.json and Neon.
 * Soft-deactivates rows in Neon (is_active = false). Rewrites seed without those items.
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

function isFalsePositive(text) {
  const t = text || "";
  if (
    /\(\s*no\s+ai\s*\)|no\s+ai\s+here|100%\s+real|do not use ai|doesn't use ai|dont use ai|we do not use ai/i.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /\b(adonai|elohai|b'?nai|am yisrael chai|\bchai\b|flydubai|bondibai|saagu|ai-ay vowel|vowel team)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

const strongAiTitle =
  /\b(artificial intelligence|\bA\.I\.\b|\bAI\b|ChatGPT|GPT-?\d|OpenAI|Anthropic|Hugging Face|midjourney|stable diffusion|DALL-?E|GenAI|generative AI|machine learning|\bLLM\b|large language model|Claude Code|GROK AI|Sora 2|Suno and|AI[- ]?(ethics|tools?|agent|bot|news|art|music|video|generated|deepfake|psychosis|evolution|decisions?|FOMO|dragon|incident|seminar|literacy|animation|enhanced|powered|stack|model|course|workflow|slop|hype)|#ai\b|#aivideo|#aiart|#aigenerated|בינה מלאכותית|生成式AI|生成式ai)\b/i;

function isAiFocusedChannel(c) {
  const name = c.name || "";
  const slug = c.slug || "";
  const desc = c.description || "";
  if (/^code\.?org$/i.test(name) || slug === "code-org") return true;
  if (/codeai|ai人才|人工智慧|人工智能/i.test(`${name} ${slug}`)) return true;
  if (/\bAI\b/.test(name) && !isFalsePositive(name)) return true;
  if (
    /dedicated to.*artificial intelligence|learn about artificial intelligence \(AI\)/i.test(
      desc,
    )
  ) {
    return true;
  }
  return false;
}

function isAiChannelName(name) {
  return (
    /^(CodeAI|AI人才方舟計畫推動營運中心)$/i.test(name || "") ||
    /AI人才方舟/i.test(name || "")
  );
}

function plan(seed) {
  const aiChannels = seed.channels.filter(isAiFocusedChannel);
  const aiChannelSlugs = new Set(aiChannels.map((c) => c.slug));

  const removeVideos = [];
  for (const v of seed.videos) {
    const blob = `${v.title}\n${v.description || ""}`;
    if (
      aiChannelSlugs.has(v.channel_slug) ||
      isAiChannelName(v.channel_name)
    ) {
      removeVideos.push({
        reason: "ai_channel",
        youtube_id: v.youtube_id,
        title: v.title,
        channel_name: v.channel_name,
        channel_slug: v.channel_slug,
      });
      continue;
    }
    if (isFalsePositive(blob) || isFalsePositive(v.title)) continue;
    if (
      strongAiTitle.test(v.title) ||
      /בינה מלאכותית|#AI\b|生成式AI/i.test(blob)
    ) {
      removeVideos.push({
        reason: "ai_topic",
        youtube_id: v.youtube_id,
        title: v.title,
        channel_name: v.channel_name,
        channel_slug: v.channel_slug,
      });
    }
  }

  const removeYoutubeIds = new Set(removeVideos.map((v) => v.youtube_id));
  const removeSlugs = new Set(aiChannels.map((c) => c.slug));
  const adlRemaining = seed.videos.filter(
    (v) => v.channel_slug === "adl" && !removeYoutubeIds.has(v.youtube_id),
  );
  if (adlRemaining.length === 0) removeSlugs.add("adl");

  return { aiChannels, removeVideos, removeYoutubeIds, removeSlugs };
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const seed = JSON.parse(readFileSync(seedPath, "utf8"));
const before = {
  channels: seed.channels.length,
  videos: seed.videos.length,
};
const { aiChannels, removeVideos, removeYoutubeIds, removeSlugs } = plan(seed);

const keptChannels = seed.channels.filter((c) => !removeSlugs.has(c.slug));
const keptVideos = seed.videos.filter(
  (v) => !removeYoutubeIds.has(v.youtube_id),
);

seed.channels = keptChannels;
seed.videos = keptVideos;
seed.counts = {
  ...(seed.counts || {}),
  channels: keptChannels.length,
  videos: keptVideos.length,
  purged_ai_channels: removeSlugs.size,
  purged_ai_videos: removeVideos.length,
  purged_at: new Date().toISOString(),
};
writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const byChannel = {};
for (const r of removeVideos) {
  byChannel[r.channel_name] = (byChannel[r.channel_name] || 0) + 1;
}

const beforeDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels
`;

const youtubeIds = [...removeYoutubeIds];
const channelSlugs = [...removeSlugs];

const deactivatedVideos = youtubeIds.length
  ? await sql`
      UPDATE videos
      SET is_active = FALSE, updated_at = NOW()
      WHERE youtube_id = ANY(${youtubeIds})
        AND is_active = TRUE
      RETURNING youtube_id, title, channel_name
    `
  : [];

const extraVideos = await sql`
  UPDATE videos v
  SET is_active = FALSE, updated_at = NOW()
  WHERE v.is_active = TRUE
    AND (
      v.channel_name ~* '^(CodeAI|AI人才方舟計畫推動營運中心)$'
      OR v.channel_name ILIKE '%AI人才方舟%'
      OR (
        v.title ~* '(artificial intelligence|[[:<:]]AI[[:>:]]|ChatGPT|GPT-[0-9]|OpenAI|Anthropic|Hugging Face|midjourney|GenAI|generative AI|machine learning|[[:<:]]LLM[[:>:]]|Claude Code|GROK AI|Sora 2|#aivideo|#aiart|#aigenerated|בינה מלאכותית|生成式AI)'
        AND v.title !~* '(Adonai|Elohai|B''nai|Am Yisrael Chai|FlyDubai|AI-AY Vowel|\\(No AI\\)|No AI here)'
      )
    )
  RETURNING youtube_id, title, channel_name
`;

const deactivatedChannels = channelSlugs.length
  ? await sql`
      UPDATE channels
      SET is_active = FALSE
      WHERE slug = ANY(${channelSlugs})
        AND COALESCE(is_active, TRUE) = TRUE
      RETURNING slug, name
    `
  : [];

const moreChannels = await sql`
  UPDATE channels
  SET is_active = FALSE
  WHERE COALESCE(is_active, TRUE) = TRUE
    AND (
      slug = 'code-org'
      OR name ILIKE 'CodeAI'
      OR name ILIKE 'Code.org'
      OR name ILIKE '%AI人才方舟%'
    )
  RETURNING slug, name
`;

const afterDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS active_embeddable
`;

// Remaining AI-looking titles (sanity)
const leftover = await sql`
  SELECT title, channel_name
  FROM videos
  WHERE is_active = TRUE
    AND title ~* '([[:<:]]AI[[:>:]]|ChatGPT|OpenAI|artificial intelligence|בינה מלאכותית|生成式AI)'
    AND title !~* '(Adonai|Elohai|B''nai|Am Yisrael Chai|FlyDubai|AI-AY Vowel|\\(No AI\\)|No AI here)'
  ORDER BY channel_name, title
  LIMIT 30
`;

const report = {
  before,
  after: { channels: keptChannels.length, videos: keptVideos.length },
  removed_channel_slugs: [...removeSlugs].sort(),
  removed_channel_details: aiChannels.map((c) => ({
    name: c.name,
    slug: c.slug,
  })),
  removed_videos_seed: removeVideos.length,
  removed_by_channel: Object.entries(byChannel)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, n })),
  sample_titles: removeVideos.slice(0, 50).map((v) => v.title),
  neon: {
    before: beforeDb[0],
    after: afterDb[0],
    deactivated_videos: deactivatedVideos.length,
    extra_videos_matched_in_neon: extraVideos.length,
    deactivated_channels: [...deactivatedChannels, ...moreChannels].map(
      (r) => ({ slug: r.slug, name: r.name }),
    ),
    leftover_active_ai_looking: leftover,
  },
};

const outPath = resolve(root, "data/ai-purge-report.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
