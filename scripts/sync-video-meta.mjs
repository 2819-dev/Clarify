/**
 * Backfill real YouTube titles (oEmbed) + publishedAt.
 * Strategy (avoids watch-page 429s):
 *  1) oEmbed titles for every video
 *  2) Atom channel feeds for publishedAt (when channel_id known)
 *  3) Slow watch-page scrape only for leftovers, with 429 backoff
 *
 * Usage: node scripts/sync-video-meta.mjs [--limit=N] [--concurrency=8]
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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const LIMIT = args.limit ? Number(args.limit) : null;
const CONCURRENCY = Math.max(1, Math.min(Number(args.concurrency) || 8, 16));

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function decodeXml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseAtom(xml) {
  const out = new Map();
  for (const block of xml.split(/<entry>/i).slice(1)) {
    const youtubeId =
      block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ||
      block.match(/\/watch\?v=([\w-]{6,})/)?.[1];
    const title = block.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ||
      block.match(/<updated>([^<]+)<\/updated>/i)?.[1];
    if (!youtubeId || !publishedAt) continue;
    const d = new Date(publishedAt);
    if (Number.isNaN(d.getTime())) continue;
    out.set(youtubeId, {
      title: title ? decodeXml(title) : null,
      publishedAt: d.toISOString(),
    });
  }
  return out;
}

async function fetchOembed(youtubeId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${youtubeId}`,
  )}&format=json`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 429) {
      await sleep(1500 * (attempt + 1));
      continue;
    }
    if (!res.ok) return null;
    return res.json();
  }
  return null;
}

function parsePublished(html) {
  const iso =
    html.match(/"uploadDate":"([^"]+)"/)?.[1] ||
    html.match(/"publishDate":"([^"]+)"/)?.[1] ||
    html.match(/itemprop="datePublished"[^>]*content="([^"]+)"/)?.[1];
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const dateText = html.match(/"dateText":\{"simpleText":"([^"]+)"\}/)?.[1];
  if (dateText) {
    const raw = dateText
      .replace(/^Premiered\s+/i, "")
      .replace(/^Streamed live on\s+/i, "")
      .replace(/^Started streaming on\s+/i, "")
      .replace(/^Joined\s+/i, "")
      .trim();
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

async function fetchWatchPublishedAt(youtubeId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+",
      },
      redirect: "follow",
    });
    if (res.status === 429) {
      const wait = 4000 * (attempt + 1);
      console.warn(`429 watch ${youtubeId}, wait ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) return null;
    return parsePublished(await res.text());
  }
  return null;
}

function needsDateFix(row) {
  if (!row.published_at) return true;
  return (
    Math.abs(
      new Date(row.created_at).getTime() - new Date(row.published_at).getTime(),
    ) < 3600_000
  );
}

const rows = LIMIT
  ? await sql`
      SELECT v.id, v.youtube_id, v.title, v.published_at, v.created_at,
             c.youtube_channel_id, c.slug AS channel_slug
      FROM videos v
      LEFT JOIN channels c ON c.id = v.channel_id
      WHERE COALESCE(v.is_active, TRUE) = TRUE
        AND v.youtube_id IS NOT NULL
      ORDER BY
        CASE
          WHEN v.published_at IS NULL THEN 0
          WHEN ABS(EXTRACT(EPOCH FROM (v.created_at - v.published_at))) < 3600 THEN 0
          ELSE 1
        END,
        v.created_at DESC
      LIMIT ${LIMIT}
    `
  : await sql`
      SELECT v.id, v.youtube_id, v.title, v.published_at, v.created_at,
             c.youtube_channel_id, c.slug AS channel_slug
      FROM videos v
      LEFT JOIN channels c ON c.id = v.channel_id
      WHERE COALESCE(v.is_active, TRUE) = TRUE
        AND v.youtube_id IS NOT NULL
      ORDER BY
        CASE
          WHEN v.published_at IS NULL THEN 0
          WHEN ABS(EXTRACT(EPOCH FROM (v.created_at - v.published_at))) < 3600 THEN 0
          ELSE 1
        END,
        v.created_at DESC
    `;

console.log(`Loaded ${rows.length} videos`);

// ---- Pass 1: oEmbed titles ----
let titleFixed = 0;
await mapPool(rows, CONCURRENCY, async (row, idx) => {
  try {
    const meta = await fetchOembed(row.youtube_id);
    await sleep(60);
    if (meta?.title && meta.title !== row.title) {
      await sql`
        UPDATE videos SET title = ${meta.title}, updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
      row.title = meta.title;
      titleFixed += 1;
    }
    if ((idx + 1) % 100 === 0) {
      console.log(`titles ${idx + 1}/${rows.length} fixed=${titleFixed}`);
    }
  } catch (err) {
    console.warn(`oembed fail ${row.youtube_id}:`, err?.message || err);
  }
});
console.log(`Pass 1 done: titles fixed=${titleFixed}`);

// ---- Pass 2: Atom feeds by channel ----
const byChannel = new Map();
for (const row of rows) {
  if (!row.youtube_channel_id) continue;
  if (!byChannel.has(row.youtube_channel_id)) {
    byChannel.set(row.youtube_channel_id, []);
  }
  byChannel.get(row.youtube_channel_id).push(row);
}

let dateFixed = 0;
let atomHits = 0;
const channelIds = [...byChannel.keys()];
console.log(`Pass 2: ${channelIds.length} channels with Atom ids`);

for (let i = 0; i < channelIds.length; i++) {
  const channelId = channelIds[i];
  const channelRows = byChannel.get(channelId);
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { headers: { "User-Agent": UA, Accept: "application/atom+xml,text/xml" } },
    );
    await sleep(120);
    if (!res.ok) continue;
    const feed = parseAtom(await res.text());
    for (const row of channelRows) {
      const hit = feed.get(row.youtube_id);
      if (!hit?.publishedAt) continue;
      atomHits += 1;
      if (!needsDateFix(row) && row.published_at) {
        const same =
          Math.abs(
            new Date(hit.publishedAt).getTime() -
              new Date(row.published_at).getTime(),
          ) < 60_000;
        if (same) continue;
      }
      await sql`
        UPDATE videos
        SET published_at = ${hit.publishedAt}::timestamptz,
            title = ${hit.title || row.title},
            updated_at = NOW()
        WHERE id = ${row.id}::uuid
      `;
      row.published_at = hit.publishedAt;
      if (hit.title) row.title = hit.title;
      dateFixed += 1;
    }
  } catch (err) {
    console.warn(`atom fail ${channelId}:`, err?.message || err);
  }
  if ((i + 1) % 25 === 0 || i === channelIds.length - 1) {
    console.log(
      `atom ${i + 1}/${channelIds.length} hits=${atomHits} dates=${dateFixed}`,
    );
  }
}
console.log(`Pass 2 done: atomHits=${atomHits} dates=${dateFixed}`);

// ---- Pass 3: slow watch scrape for leftovers still on insert-time ----
const leftovers = rows.filter(needsDateFix);
console.log(`Pass 3: scrape ${leftovers.length} leftovers`);
let scrapeFixed = 0;
let scrapeFail = 0;

for (let i = 0; i < leftovers.length; i++) {
  const row = leftovers[i];
  if (!needsDateFix(row)) continue;
  try {
    const publishedAt = await fetchWatchPublishedAt(row.youtube_id);
    await sleep(350);
    if (!publishedAt) {
      scrapeFail += 1;
      continue;
    }
    await sql`
      UPDATE videos
      SET published_at = ${publishedAt}::timestamptz,
          updated_at = NOW()
      WHERE id = ${row.id}::uuid
    `;
    row.published_at = publishedAt;
    scrapeFixed += 1;
    dateFixed += 1;
  } catch (err) {
    scrapeFail += 1;
    console.warn(`scrape fail ${row.youtube_id}:`, err?.message || err);
  }
  if ((i + 1) % 25 === 0 || i === leftovers.length - 1) {
    console.log(
      `scrape ${i + 1}/${leftovers.length} fixed=${scrapeFixed} fail=${scrapeFail}`,
    );
  }
}

const remaining = (
  await sql`
    SELECT COUNT(*)::int AS n
    FROM videos
    WHERE COALESCE(is_active, TRUE) = TRUE
      AND (
        published_at IS NULL
        OR ABS(EXTRACT(EPOCH FROM (created_at - published_at))) < 3600
      )
  `
)[0].n;

console.log(
  JSON.stringify(
    {
      total: rows.length,
      titleFixed,
      dateFixed,
      atomHits,
      scrapeFixed,
      scrapeFail,
      stillNearInsert: remaining,
    },
    null,
    2,
  ),
);
