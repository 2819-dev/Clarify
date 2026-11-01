/**
 * Backfill real YouTube titles (oEmbed) + publishedAt (watch page uploadDate)
 * for every active video. Never uses Clarify insert time.
 *
 * Usage: node scripts/sync-video-meta.mjs [--limit=N] [--concurrency=12]
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envText = (() => {
  try {
    return readFileSync(resolve(root, ".env.local"), "utf8");
  } catch {
    return "";
  }
})();
const databaseUrl =
  process.env.DATABASE_URL ||
  envText.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL required");
const sql = neon(databaseUrl);

const UA =
  "Mozilla/5.0 (compatible; ClarifyBot/1.0; +https://clarify.guidelearning.org)";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const LIMIT = args.limit ? Number(args.limit) : null;
const CONCURRENCY = Math.max(1, Math.min(Number(args.concurrency) || 12, 24));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchOembed(youtubeId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`,
  )}&format=json`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return res.json();
}

function parsePublished(html) {
  const patterns = [
    /"uploadDate":"([^"]+)"/,
    /"publishDate":"([^"]+)"/,
    /itemprop="datePublished"[^>]*content="([^"]+)"/,
    /content="([^"]+)"[^>]*itemprop="datePublished"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    const d = new Date(m[1]);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function parseOgTitle(html) {
  const m = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (!m?.[1]) return null;
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function fetchWatchMeta(youtubeId) {
  const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) return { publishedAt: null, title: null };
  const html = await res.text();
  return {
    publishedAt: parsePublished(html),
    title: parseOgTitle(html),
  };
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

const rows = LIMIT
  ? await sql`
      SELECT id, youtube_id, title, published_at, created_at
      FROM videos
      WHERE COALESCE(is_active, TRUE) = TRUE
        AND youtube_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${LIMIT}
    `
  : await sql`
      SELECT id, youtube_id, title, published_at, created_at
      FROM videos
      WHERE COALESCE(is_active, TRUE) = TRUE
        AND youtube_id IS NOT NULL
      ORDER BY created_at DESC
    `;

console.log(`Syncing meta for ${rows.length} videos (concurrency=${CONCURRENCY})`);

let updated = 0;
let titleFixed = 0;
let dateFixed = 0;
let failed = 0;
let skipped = 0;

await mapPool(rows, CONCURRENCY, async (row, idx) => {
  try {
    let title = row.title;
    let publishedAt = row.published_at
      ? new Date(row.published_at).toISOString()
      : null;

    const oembed = await fetchOembed(row.youtube_id);
    if (oembed?.title) title = oembed.title;

    // Always refresh publish date from YouTube when possible.
    const watch = await fetchWatchMeta(row.youtube_id);
    if (watch.publishedAt) publishedAt = watch.publishedAt;
    if ((!title || title === row.youtube_id) && watch.title) {
      title = watch.title;
    }

    if (!publishedAt) {
      // Keep existing if we couldn't parse; never invent "now".
      publishedAt = row.published_at
        ? new Date(row.published_at).toISOString()
        : null;
    }

    const titleChanged = title && title !== row.title;
    const dateChanged =
      publishedAt &&
      (!row.published_at ||
        Math.abs(
          new Date(publishedAt).getTime() - new Date(row.published_at).getTime(),
        ) > 60_000);

    if (!titleChanged && !dateChanged) {
      skipped += 1;
    } else {
      await sql`
        UPDATE videos
        SET title = ${title || row.title},
            published_at = ${publishedAt}::timestamptz,
            updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
      updated += 1;
      if (titleChanged) titleFixed += 1;
      if (dateChanged) dateFixed += 1;
    }

    if ((idx + 1) % 50 === 0 || idx === rows.length - 1) {
      console.log(
        `… ${idx + 1}/${rows.length} updated=${updated} titles=${titleFixed} dates=${dateFixed} fail=${failed}`,
      );
    }
    await sleep(40);
  } catch (err) {
    failed += 1;
    console.warn(`fail ${row.youtube_id}:`, err?.message || err);
  }
});

console.log(
  JSON.stringify(
    { total: rows.length, updated, titleFixed, dateFixed, failed, skipped },
    null,
    2,
  ),
);
