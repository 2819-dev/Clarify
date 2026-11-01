/**
 * Expand data/catalog-seed.json with additional family-safe / Jewish videos
 * discovered via YouTube search results + oEmbed metadata.
 *
 * Usage: node scripts/expand-catalog.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = resolve(root, "data/catalog-seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf8"));

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function oembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return res.json();
}

async function searchVideoIds(query, limit = 12) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const html = await fetchText(url);
  const ids = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)].map(
    (m) => m[1],
  );
  const unique = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= limit) break;
  }
  return unique;
}

/** [query, category_slug, category_name, is_jewish] */
const QUERIES = [
  // Jewish
  ["maccabeats hanukkah song", "holidays", "Holidays", true],
  ["six13 passover song", "holidays", "Holidays", true],
  ["jewish kids shabbat song", "shabbat", "Shabbat", true],
  ["modeh ani kids jewish song", "prayer", "Prayer", true],
  ["hebrew alphabet song kids", "hebrew", "Learning Hebrew", true],
  ["chabad kids torah story", "torah", "Torah & Stories", true],
  ["bim bam jewish kids", "learning", "Kids Learning", true],
  ["jamie geller kosher recipe", "cooking", "Cooking", true],
  ["unpacked jewish history kids", "history", "History", true],
  ["jewish kids music sing along", "music", "Music", true],
  ["shalom sesame kids", "family", "Family & Calm", true],
  ["jewish comedy clean modi", "comedy", "Clean Comedy", true],
  ["traveling israel family friendly", "community", "Community", true],
  ["jewish kids art craft", "learning", "Kids Learning", true],
  ["passover seder explained kids", "holidays", "Holidays", true],
  ["purim song kids jewish", "holidays", "Holidays", true],
  ["shavuot kids jewish song", "holidays", "Holidays", true],
  ["sukkot kids jewish", "holidays", "Holidays", true],
  ["jewish lullaby kids", "music", "Music", true],
  ["aleph beta parsha kids friendly", "torah", "Torah & Stories", true],
  // Filtered / family-safe
  ["blippi learn colors for kids", "learning", "Kids Learning", false],
  ["super simple songs kids", "music", "Music", false],
  ["sciShow kids science", "science", "Science & How-To", false],
  ["national geographic kids animals", "nature", "Nature", false],
  ["how its made kids friendly", "science", "Science & How-To", false],
  ["family friendly cooking kids", "cooking", "Cooking", false],
  ["kids craft diy easy", "crafts", "Crafts & DIY", false],
  ["sesame street official kids", "family", "Family & Calm", false],
  ["numberblocks learn math kids", "learning", "Kids Learning", false],
  ["geography for kids maps", "history", "History", false],
  ["calm ocean waves nature 4k", "nature", "Nature", false],
  ["peppapig official kids episode", "stories", "Stories", false],
  ["kids yoga family friendly", "family", "Family & Calm", false],
  ["clean kids comedy sketch family", "comedy", "Clean Comedy", false],
  ["travel with kids family friendly", "travel", "Travel", false],
  ["kids baking cookies recipe", "cooking", "Cooking", false],
  // Gaming — family-safe only
  ["minecraft peaceful building kids", "gaming", "Gaming", false],
  ["roblox family friendly gameplay kids", "gaming", "Gaming", false],
  ["lego games kids gameplay", "gaming", "Gaming", false],
  ["nintendo kids mario family friendly", "gaming", "Gaming", false],
  ["animal crossing gameplay family", "gaming", "Gaming", false],
  ["puzzles games kids educational", "gaming", "Gaming", false],
  ["scratch coding games kids", "gaming", "Gaming", false],
  ["mario kart kids family friendly", "gaming", "Gaming", false],
  ["pokemon kids gameplay family safe", "gaming", "Gaming", false],
  ["among us family friendly kids", "gaming", "Gaming", false],
];

const BLOCK =
  /\b(ai[- ]generated|illustrated by ai|torah for kids ai|nsfw|gore|horror|kill|murder|shooting|war footage|explicit|18\+|onlyfans)\b/i;

const existingIds = new Set(seed.videos.map((v) => v.youtube_id));
const channelBySlug = new Map(seed.channels.map((c) => [c.slug, c]));

let added = 0;
let skipped = 0;

for (const [query, categorySlug, categoryName, isJewish] of QUERIES) {
  let ids = [];
  try {
    ids = await searchVideoIds(query, 10);
  } catch (err) {
    console.warn("search fail", query, err.message);
    await sleep(800);
    continue;
  }
  for (const id of ids) {
    if (existingIds.has(id)) {
      skipped++;
      continue;
    }
    let meta = null;
    try {
      meta = await oembed(id);
    } catch {
      meta = null;
    }
    if (!meta?.title || !meta?.author_name) {
      skipped++;
      continue;
    }
    if (BLOCK.test(meta.title) || BLOCK.test(meta.author_name)) {
      skipped++;
      continue;
    }
    const channelName = meta.author_name;
    const channelSlug = slugify(channelName);
    if (!channelBySlug.has(channelSlug)) {
      const ch = {
        slug: channelSlug,
        name: channelName,
        description: `${channelName} on YouTube.`,
        youtube_url: meta.author_url || `https://www.youtube.com/@${channelSlug}`,
        avatar_url: null,
        banner_url: null,
        subscriber_count: null,
        is_jewish: isJewish,
      };
      seed.channels.push(ch);
      channelBySlug.set(channelSlug, ch);
    } else if (isJewish) {
      channelBySlug.get(channelSlug).is_jewish = true;
    }

    seed.videos.push({
      youtube_id: id,
      title: meta.title,
      description: `From ${channelName} on YouTube.`,
      channel_slug: channelSlug,
      channel_name: channelName,
      category_slug: categorySlug,
      category: categoryName,
      thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embeddable: true,
      is_short: false,
      is_jewish: isJewish,
    });
    existingIds.add(id);
    added++;
  }
  await sleep(450);
  console.log(`+ ${query} → catalog ${seed.videos.length}`);
}

const by = {};
for (const v of seed.videos) {
  by[v.category_slug] = (by[v.category_slug] || 0) + 1;
}
seed.counts = {
  videos: seed.videos.length,
  channels: seed.channels.length,
  by_category: by,
};

writeFileSync(seedPath, JSON.stringify(seed, null, 2) + "\n");
console.log(
  JSON.stringify(
    { added, skipped, videos: seed.videos.length, channels: seed.channels.length, by },
    null,
    2,
  ),
);
