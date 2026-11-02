#!/usr/bin/env node
/**
 * Policy correction: restore AI-*topic* videos; keep AI-*generated* media removed.
 *
 * Restores educational/discussion videos about AI (ChatGPT, OpenAI, LLMs, ethics, etc.)
 * into catalog-seed.json and reactivates them in Neon. Leaves generative media
 * (AI Animation, Suno/Sora music, #aivideo/#aiart, face-swap entertainment) deactivated.
 */
import { neon } from "@neondatabase/serverless";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const PURGE_COMMIT_PARENT = "e5a75d0^";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(resolve(root, ".env.local"), "utf8");
  return env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
}

/** True = stay removed (AI-generated media). */
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
  return { gen: false, why: "AI topic / education / discussion" };
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const current = JSON.parse(readFileSync(seedPath, "utf8"));
const before = JSON.parse(
  execSync(`git show ${PURGE_COMMIT_PARENT}:data/catalog-seed.json`, {
    maxBuffer: 50 * 1024 * 1024,
    cwd: root,
  }).toString(),
);

const currentIds = new Set(current.videos.map((v) => v.youtube_id));
const purged = before.videos.filter((v) => !currentIds.has(v.youtube_id));

const restoreVideos = [];
const keepRemoved = [];
for (const v of purged) {
  const c = isAiGeneratedMedia(v);
  if (c.gen) keepRemoved.push({ ...v, why: c.why });
  else restoreVideos.push({ ...v, why: c.why });
}

const codeChannel = before.channels.find((c) => c.slug === "code-org");
const codeOrgDecision = {
  restore: true,
  rationale:
    "Code.org seed entry is CodeAI: nonprofit AI-literacy / CS education with human-produced classroom explainers and Hour of Code content — not a generative-media channel.",
};

const beforeSeed = {
  channels: current.channels.length,
  videos: current.videos.length,
};
const beforeDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels
`;

// Restore seed videos
const restoreIds = new Set(restoreVideos.map((v) => v.youtube_id));
const keepRemovedIds = new Set(keepRemoved.map((v) => v.youtube_id));
const byYoutube = new Map(current.videos.map((v) => [v.youtube_id, v]));
for (const v of restoreVideos) {
  const { why, ...clean } = v;
  byYoutube.set(clean.youtube_id, clean);
}
current.videos = [...byYoutube.values()];

// Restore Code.org channel if missing
if (codeChannel && !current.channels.some((c) => c.slug === "code-org")) {
  current.channels.push(codeChannel);
}

current.counts = {
  ...(current.counts || {}),
  channels: current.channels.length,
  videos: current.videos.length,
  restored_ai_topic_videos: restoreVideos.length,
  kept_removed_ai_generated: keepRemoved.length,
  code_org_restored: Boolean(codeOrgDecision.restore),
  policy: "keep AI-topic; remove AI-generated media only",
  restored_at: new Date().toISOString(),
};
writeFileSync(seedPath, `${JSON.stringify(current, null, 2)}\n`);

// Neon: reactivate topic videos
const restoreYoutubeIds = [...restoreIds];
const reactivated = restoreYoutubeIds.length
  ? await sql`
      UPDATE videos
      SET is_active = TRUE, updated_at = NOW()
      WHERE youtube_id = ANY(${restoreYoutubeIds})
        AND is_active = FALSE
      RETURNING youtube_id, title, channel_name
    `
  : [];

// Ensure generated stay inactive
const generatedIds = [...keepRemovedIds];
const ensuredRemoved = generatedIds.length
  ? await sql`
      UPDATE videos
      SET is_active = FALSE, updated_at = NOW()
      WHERE youtube_id = ANY(${generatedIds})
        AND is_active = TRUE
      RETURNING youtube_id, title
    `
  : [];

// Reactivate Code.org channel
const channelReactivated = await sql`
  UPDATE channels
  SET is_active = TRUE
  WHERE slug = 'code-org'
    AND COALESCE(is_active, TRUE) = FALSE
  RETURNING slug, name
`;

const afterDb = await sql`
  SELECT
    (SELECT COUNT(*)::int FROM videos WHERE is_active) AS active_videos,
    (SELECT COUNT(*)::int FROM channels WHERE COALESCE(is_active, TRUE)) AS active_channels,
    (SELECT COUNT(*)::int FROM videos WHERE is_active AND embeddable) AS active_embeddable
`;

// Sanity: ChatGPT/OpenAI topic videos active
const topicSamples = await sql`
  SELECT title, channel_name, is_active
  FROM videos
  WHERE is_active = TRUE
    AND (
      title ILIKE '%ChatGPT%'
      OR title ILIKE '%OpenAI%'
      OR title ILIKE '%LLM%'
      OR channel_name ILIKE 'CodeAI'
    )
  ORDER BY channel_name, title
  LIMIT 25
`;

const stillGone = await sql`
  SELECT title, channel_name, is_active
  FROM videos
  WHERE youtube_id = ANY(${generatedIds})
  ORDER BY title
`;

const byChannel = {};
for (const v of restoreVideos) {
  byChannel[v.channel_name] = (byChannel[v.channel_name] || 0) + 1;
}

const report = {
  policy:
    "Restore AI-topic educational/discussion videos; keep AI-generated media removed",
  code_org: codeOrgDecision,
  before: {
    seed: beforeSeed,
    neon: beforeDb[0],
  },
  after: {
    seed: {
      channels: current.channels.length,
      videos: current.videos.length,
    },
    neon: afterDb[0],
  },
  restored_count: restoreVideos.length,
  restored_by_channel: Object.entries(byChannel)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({ name, n })),
  restored_sample_titles: restoreVideos.slice(0, 40).map((v) => v.title),
  kept_removed_count: keepRemoved.length,
  kept_removed: keepRemoved.map((v) => ({
    youtube_id: v.youtube_id,
    title: v.title,
    channel_name: v.channel_name,
    why: v.why,
  })),
  neon_ops: {
    reactivated_videos: reactivated.length,
    ensured_generated_inactive: ensuredRemoved.length,
    channels_reactivated: channelReactivated,
  },
  verification: {
    active_chatgpt_openai_codeai_samples: topicSamples,
    generated_still_inactive: stillGone,
  },
};

const outPath = resolve(root, "data/ai-topic-restore-report.json");
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`Wrote ${outPath}`);
