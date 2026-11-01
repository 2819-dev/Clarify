import { getSql } from "./db";
import {
  normalizeUsername,
  usernameFromChannel,
  usernameFromEmail,
} from "./usernames";

type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  youtube_url: string | null;
  youtube_channel_id: string | null;
  username: string | null;
  is_jewish: boolean;
};

type FeedEntry = {
  youtubeId: string;
  title: string;
  publishedAt: string;
  channelName: string;
  thumbnailUrl: string | null;
};

const UA =
  "Mozilla/5.0 (compatible; ClarifyBot/1.0; +https://clarify.guidelearning.org)";

type OembedMeta = {
  title: string;
  author_name?: string;
  thumbnail_url?: string;
};

async function fetchOembed(youtubeId: string): Promise<OembedMeta | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${youtubeId}`,
    )}&format=json`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as OembedMeta;
    if (!data?.title) return null;
    return data;
  } catch {
    return null;
  }
}

function parsePublishedFromHtml(html: string): string | null {
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

async function fetchWatchPublishedAt(
  youtubeId: string,
): Promise<string | null> {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${youtubeId}`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return parsePublishedFromHtml(await res.text());
  } catch {
    return null;
  }
}

export type SyncSummary = {
  channelsScanned: number;
  videosInserted: number;
  videosUpdated: number;
  usernamesBackfilled: number;
  errors: string[];
};

function extractChannelId(html: string): string | null {
  const patterns = [
    /"channelId":"(UC[\w-]{20,})"/,
    /"externalId":"(UC[\w-]{20,})"/,
    /youtube\.com\/channel\/(UC[\w-]{20,})/,
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{20,})"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

async function resolveYoutubeChannelId(
  youtubeUrl: string,
): Promise<string | null> {
  const channelMatch = youtubeUrl.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  if (channelMatch?.[1]) return channelMatch[1];
  try {
    const res = await fetch(youtubeUrl.replace(/\/$/, ""), {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractChannelId(html);
  } catch {
    return null;
  }
}

function parseAtomFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const blocks = xml.split(/<entry>/i).slice(1);
  for (const block of blocks) {
    const youtubeId =
      block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] ||
      block.match(/\/watch\?v=([\w-]{6,})/)?.[1];
    const title = block
      .match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
      ?.trim();
    const publishedAt =
      block.match(/<published>([^<]+)<\/published>/i)?.[1] ||
      block.match(/<updated>([^<]+)<\/updated>/i)?.[1];
    const channelName =
      block.match(/<name>([^<]*)<\/name>/i)?.[1]?.trim() || "";
    if (!youtubeId || !title || !publishedAt) continue;
    entries.push({
      youtubeId,
      title: decodeXml(title),
      publishedAt,
      channelName: decodeXml(channelName),
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    });
  }
  return entries;
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchChannelFeed(channelId: string): Promise<FeedEntry[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/atom+xml,text/xml" },
  });
  if (!res.ok) throw new Error(`Feed HTTP ${res.status} for ${channelId}`);
  return parseAtomFeed(await res.text());
}

function parseVideosFromChannelHtml(html: string, channelName: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const seen = new Set<string>();
  const titleById = new Map<string, string>();

  for (const m of html.matchAll(
    /"videoId":"([\w-]{11})"[^]{0,400}?"text":"([^"]{1,200})"/g,
  )) {
    if (!titleById.has(m[1])) titleById.set(m[1], m[2]);
  }

  for (const m of html.matchAll(/"videoId":"([\w-]{11})"/g)) {
    const youtubeId = m[1];
    if (seen.has(youtubeId)) continue;
    seen.add(youtubeId);
    const rawTitle = titleById.get(youtubeId) || youtubeId;
    entries.push({
      youtubeId,
      title: rawTitle
        .replace(/\\u0026/g, "&")
        .replace(/\\"/g, '"')
        .replace(/\\n/g, " "),
      // Never invent Clarify insert time — enrich later via oEmbed/watch page.
      publishedAt: "",
      channelName,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    });
    if (entries.length >= 15) break;
  }
  return entries;
}

async function fetchChannelUploads(channel: ChannelRow): Promise<FeedEntry[]> {
  if (channel.youtube_channel_id) {
    try {
      return await fetchChannelFeed(channel.youtube_channel_id);
    } catch {
      // Atom feeds are often blocked from cloud IPs — fall through to HTML.
    }
  }
  if (!channel.youtube_url) {
    throw new Error("No YouTube URL");
  }
  const videosUrl = `${channel.youtube_url.replace(/\/$/, "")}/videos`;
  const res = await fetch(videosUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Channel page HTTP ${res.status}`);
  const html = await res.text();
  const channelId = channel.youtube_channel_id || extractChannelId(html);
  if (channelId && channelId !== channel.youtube_channel_id) {
    // caller persists id
    channel.youtube_channel_id = channelId;
  }
  const entries = parseVideosFromChannelHtml(html, channel.name);
  if (entries.length === 0) throw new Error("No uploads found on channel page");
  return entries;
}

async function backfillUsernames(sql: ReturnType<typeof getSql>) {
  let n = 0;
  // Always prefer the real YouTube @handle from youtube_url when present —
  // overwrite slug-invented usernames from earlier backfills.
  const channels = (await sql`
    SELECT id, slug, youtube_url, username FROM channels
  `) as {
    id: string;
    slug: string;
    youtube_url: string | null;
    username: string | null;
  }[];
  for (const ch of channels) {
    const username = usernameFromChannel(ch.youtube_url, ch.slug);
    if (ch.username && ch.username === username) continue;
    try {
      await sql`
        UPDATE channels SET username = ${username}
        WHERE id = ${ch.id}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM channels c2
            WHERE lower(c2.username) = ${username}
              AND c2.id <> ${ch.id}::uuid
          )
      `;
      n += 1;
    } catch {
      // unique collision — leave existing
    }
  }

  const users = (await sql`
    SELECT id, email, username FROM users
    WHERE username IS NULL OR username = ''
  `) as { id: string; email: string; username: string | null }[];
  for (const u of users) {
    const base = usernameFromEmail(u.email);
    for (let i = 0; i < 8; i++) {
      const candidate = i === 0 ? base : normalizeUsername(`${base}${i + 1}`);
      try {
        await sql`
          UPDATE users SET username = ${candidate}
          WHERE id = ${u.id}::uuid
            AND (username IS NULL OR username = '')
        `;
        n += 1;
        break;
      } catch {
        /* try next */
      }
    }
  }
  return n;
}

export async function syncCatalogFromYoutube(options?: {
  channelLimit?: number;
}): Promise<SyncSummary> {
  const sql = getSql();
  const summary: SyncSummary = {
    channelsScanned: 0,
    videosInserted: 0,
    videosUpdated: 0,
    usernamesBackfilled: 0,
    errors: [],
  };

  summary.usernamesBackfilled = await backfillUsernames(sql);

  // Cloudflare Workers cap subrequests per invocation — keep batches small and rotate.
  const limit = Math.min(Math.max(options?.channelLimit ?? 8, 1), 20);
  const hour = new Date().getUTCHours();
  const offset = (hour % 12) * limit;
  const channels = (await sql`
    SELECT id, slug, name, youtube_url, youtube_channel_id, username,
           COALESCE(is_jewish, TRUE) AS is_jewish
    FROM channels
    WHERE COALESCE(is_active, TRUE) = TRUE
      AND youtube_url IS NOT NULL
    ORDER BY subscriber_count DESC NULLS LAST, name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `) as ChannelRow[];

  for (const channel of channels) {
    summary.channelsScanned += 1;
    try {
      if (!channel.youtube_channel_id && channel.youtube_url) {
        const resolved = await resolveYoutubeChannelId(channel.youtube_url);
        if (resolved) channel.youtube_channel_id = resolved;
      }

      const feed = await fetchChannelUploads(channel);
      if (channel.youtube_channel_id) {
        await sql`
          UPDATE channels
          SET youtube_channel_id = ${channel.youtube_channel_id}
          WHERE id = ${channel.id}::uuid
        `;
      }
      for (const entry of feed.slice(0, 15)) {
        // Prefer real YouTube title from oEmbed over scraped/placeholder text.
        const oembed = await fetchOembed(entry.youtubeId);
        if (!oembed) continue;
        const title = oembed.title || entry.title;
        const thumbnailUrl =
          entry.thumbnailUrl ||
          oembed.thumbnail_url ||
          `https://i.ytimg.com/vi/${entry.youtubeId}/hqdefault.jpg`;
        let publishedAt = entry.publishedAt || null;
        if (!publishedAt) {
          publishedAt = await fetchWatchPublishedAt(entry.youtubeId);
        }
        // Refuse to write Clarify "now" — skip date update if unknown.
        if (!publishedAt) {
          summary.errors.push(
            `${channel.slug}/${entry.youtubeId}: missing publishedAt`,
          );
        }

        const existing = await sql`
          SELECT id, title, thumbnail_url, published_at FROM videos
          WHERE youtube_id = ${entry.youtubeId}
          LIMIT 1
        `;
        if (existing[0]) {
          const row = existing[0] as {
            id: string;
            title: string;
            thumbnail_url: string | null;
            published_at: string | null;
          };
          const nextPublished = publishedAt || row.published_at;
          if (
            row.title !== title ||
            row.thumbnail_url !== thumbnailUrl ||
            (publishedAt &&
              String(row.published_at) !== String(publishedAt))
          ) {
            await sql`
              UPDATE videos
              SET title = ${title},
                  thumbnail_url = ${thumbnailUrl},
                  channel_name = ${entry.channelName || channel.name},
                  published_at = ${nextPublished}::timestamptz,
                  updated_at = NOW()
              WHERE id = ${row.id}::uuid
            `;
            summary.videosUpdated += 1;
          }
          continue;
        }

        if (!publishedAt) continue;

        await sql`
          INSERT INTO videos (
            youtube_id, title, description, channel_name, channel_id,
            category, category_slug, thumbnail_url, is_short, is_jewish,
            embeddable, is_active, published_at
          )
          VALUES (
            ${entry.youtubeId},
            ${title},
            ${""},
            ${entry.channelName || oembed.author_name || channel.name},
            ${channel.id}::uuid,
            ${"family"},
            ${"family"},
            ${thumbnailUrl},
            ${false},
            ${channel.is_jewish},
            ${true},
            ${true},
            ${publishedAt}::timestamptz
          )
          ON CONFLICT (youtube_id) DO NOTHING
        `;
        summary.videosInserted += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${channel.slug}: ${message}`);
      if (/Too many subrequests/i.test(message)) break;
    }
  }

  return summary;
}
