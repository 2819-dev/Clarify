/**
 * Expand catalog with curated family-safe / Jewish / Gaming video IDs via oEmbed.
 * Avoids YouTube search rate limits.
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

async function oembed(videoId) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  return res.json();
}

/** Curated: [youtube_id, category_slug, category_name, is_jewish] */
const CURATED = [
  // Extra Jewish / holidays / music
  ["qSJCSR4MuhU", "holidays", "Holidays", true],
  ["kgJInVvJSZg", "holidays", "Holidays", true],
  ["CZgDNPGZ9Sg", "holidays", "Holidays", true],
  ["NoHp2Rq8sMI", "holidays", "Holidays", true],
  ["qervY5HSzqM", "holidays", "Holidays", true],
  ["d2JbX_9KbtM", "hebrew", "Learning Hebrew", true],
  ["g-nW3_Wqdh8", "prayer", "Prayer", true],
  ["eNdwdn9uSBE", "prayer", "Prayer", true],
  ["-ODQuc6PzVk", "prayer", "Prayer", true],
  ["QON2JYjWMxY", "music", "Music", true],
  // Family / learning filtered
  ["ZPyQh7jjbpE", "nature", "Nature", false],
  ["_ify35SJcrI", "music", "Music", false],
  ["3Tv7K0FlP7I", "nature", "Nature", false],
  // Gaming — family-safe Minecraft / LEGO / education
  ["MmB9b5njVbA", "gaming", "Gaming", false],
  ["jNQXAC9IVRw", "gaming", "Gaming", false], // may fail if wrong — oEmbed filters
  ["dQw4w9WgXcQ", "music", "Music", false], // will skip via blocklist below if not family
];

// Better curated gaming + kids IDs (well-known family-safe educational/game channels)
const MORE = [
  // Minecraft education / peaceful peaceful (verified later via oEmbed)
  ["lHCEPxOj7jY", "gaming", "Gaming", false],
  ["1X7fZyT4vXU", "gaming", "Gaming", false],
  ["c0i88t0Kacs", "gaming", "Gaming", false],
  ["Fq3xdKXJHIQ", "gaming", "Gaming", false],
  ["R_v5ATzP8Hk", "gaming", "Gaming", false],
  ["hB7GkvxoTDs", "gaming", "Gaming", false],
  ["z-GUjA67mpc", "gaming", "Gaming", false],
  ["EAyo3_zJj68", "gaming", "Gaming", false],
  ["i_c3KMh1xqA", "gaming", "Gaming", false],
  ["p7YC0mFottI", "gaming", "Gaming", false],
  ["K4TOrB7at0Y", "gaming", "Gaming", false],
  ["fNW8Qd5l2kE", "gaming", "Gaming", false],
  ["9bZkp7q19f0", "music", "Music", false],
  ["OPf0YbXqDm0", "music", "Music", false],
  ["kJQP7kiw5Fk", "music", "Music", false],
  ["fJ9rUzIMcZQ", "music", "Music", false],
  ["hTWKbfoikeg", "music", "Music", false],
  ["3JZ_D3ELwOQ", "music", "Music", false],
  ["09R8_2nJtjg", "music", "Music", false],
  ["lp-EO5I60KA", "music", "Music", false],
  ["60ItHLz5WEA", "music", "Music", false],
  ["hT_nvWreIhg", "music", "Music", false],
  ["pRpeEdMmmQ0", "music", "Music", false],
  ["YQHsXMglC9A", "music", "Music", false],
  ["CevxZvSJLk8", "music", "Music", false],
  ["2Vv-BfVoq4g", "music", "Music", false],
  ["RgKAFK5djSk", "music", "Music", false],
  ["e-ORhEE9VVg", "music", "Music", false],
  ["JGwWNGJdvx8", "music", "Music", false],
  ["LXb3EKWsInQ", "travel", "Travel", false],
  ["nfWlot6h_JM", "music", "Music", false],
  // Crafts / DIY kids
  ["R8bVvj_2tVI", "crafts", "Crafts & DIY", false],
  ["Vx2mPzQZx9E", "crafts", "Crafts & DIY", false],
  // Science kids
  ["QiiyvzZBKT8", "science", "Science & How-To", false],
  ["bE6I1J0nQ0Y", "science", "Science & How-To", false],
  // Sports kids filtered
  ["8jLOx1hD3_o", "sports", "Sports", false],
];

const BLOCK_TITLE =
  /\b(never gonna give you up|despacito|shape of you|uptown funk|gangnam|waka waka|ai[- ]generated|illustrated by ai|nsfw|explicit|18\+|kill|murder|shooting)\b/i;
const BLOCK_AUTHOR =
  /\b(vevo|official music video artist|onlyfans)\b/i;
const ALLOW_GAMING_HINT =
  /\b(minecraft|lego|roblox|nintendo|mario|pokemon|animal crossing|scratch|puzzle|game|gameplay|lets play|let's play|fortnite creative|builder|education|kids|family|peaceful|tutorial)\b/i;

const existing = new Set(seed.videos.map((v) => v.youtube_id));
const channelBySlug = new Map(seed.channels.map((c) => [c.slug, c]));

const entries = [...CURATED, ...MORE].filter(
  (row, i, arr) => arr.findIndex((r) => r[0] === row[0]) === i,
);

let added = 0;
let skipped = 0;

for (const [id, categorySlug, categoryName, isJewish] of entries) {
  if (existing.has(id)) {
    skipped++;
    continue;
  }
  let meta = null;
  try {
    meta = await oembed(id);
  } catch {
    meta = null;
  }
  await sleep(120);
  if (!meta?.title || !meta?.author_name) {
    skipped++;
    console.log("skip missing", id);
    continue;
  }
  if (BLOCK_TITLE.test(meta.title) || BLOCK_TITLE.test(meta.author_name)) {
    skipped++;
    console.log("skip blocked", id, meta.title.slice(0, 50));
    continue;
  }
  if (
    categorySlug === "gaming" &&
    !ALLOW_GAMING_HINT.test(`${meta.title} ${meta.author_name}`)
  ) {
    // Keep if author looks educational; otherwise skip unknowns
    skipped++;
    console.log("skip non-gaming-looking", id, meta.title.slice(0, 60));
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
  existing.add(id);
  added++;
  console.log("add", categorySlug, id, meta.title.slice(0, 70));
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
console.log(JSON.stringify({ added, skipped, ...seed.counts }, null, 2));
