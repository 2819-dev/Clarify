import type { ContentMode } from "./content-mode";
import { getSql, type Category, type Channel } from "./db";

function jewishOnly(mode?: ContentMode): boolean {
  return mode !== "filtered";
}

export async function listChannels(mode?: ContentMode): Promise<Channel[]> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url,
           ch.avatar_url, ch.banner_url, ch.subscriber_count,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v
      ON v.channel_id = ch.id
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    WHERE COALESCE(ch.is_active, TRUE) = TRUE
      AND (
      ${!onlyJewish}::boolean
      OR COALESCE(ch.is_jewish, TRUE) = TRUE
      OR EXISTS (
        SELECT 1 FROM videos vx
        WHERE vx.channel_id = ch.id
          AND vx.is_active = TRUE
          AND COALESCE(vx.is_jewish, TRUE) = TRUE
      )
    )
    GROUP BY ch.id
    HAVING COUNT(v.id) > 0
    ORDER BY
      CASE WHEN ch.slug = 'bighappysmiley' THEN 0 ELSE 1 END,
      COUNT(v.id) DESC,
      ch.name ASC
  `;
  return rows as Channel[];
}

export async function listChannelsBySlugs(
  slugs: string[],
  mode?: ContentMode,
): Promise<Channel[]> {
  if (slugs.length === 0) return [];
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const normalized = slugs
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url,
           ch.avatar_url, ch.banner_url, ch.subscriber_count,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v
      ON v.channel_id = ch.id
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    WHERE ch.slug = ANY(${normalized})
      AND COALESCE(ch.is_active, TRUE) = TRUE
    GROUP BY ch.id
    HAVING COUNT(v.id) > 0
  `;
  const bySlug = new Map((rows as Channel[]).map((ch) => [ch.slug, ch]));
  return normalized.map((s) => bySlug.get(s)).filter(Boolean) as Channel[];
}

export async function getChannel(
  slug: string,
  mode?: ContentMode,
): Promise<Channel | null> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url,
           ch.avatar_url, ch.banner_url, ch.subscriber_count,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v
      ON v.channel_id = ch.id
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    WHERE ch.slug = ${slug}
      AND COALESCE(ch.is_active, TRUE) = TRUE
    GROUP BY ch.id
    LIMIT 1
  `;
  return (rows[0] as Channel | undefined) ?? null;
}

/** Categories represented by active videos on a channel (respects content mode). */
export async function listChannelCategories(
  channelSlug: string,
  mode?: ContentMode,
): Promise<Category[]> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT cat.slug, cat.name, cat.description, cat.sort_order,
           COUNT(v.id)::int AS video_count
    FROM categories cat
    INNER JOIN videos v
      ON v.category_slug = cat.slug
     AND v.is_active = TRUE
     AND (
       ${!onlyJewish}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    INNER JOIN channels ch
      ON ch.id = v.channel_id
     AND ch.slug = ${channelSlug}
    GROUP BY cat.slug, cat.name, cat.description, cat.sort_order
    HAVING COUNT(v.id) > 0
    ORDER BY cat.sort_order ASC, cat.name ASC
  `;
  return rows as Category[];
}

export function formatSubscriberCount(n: number | null | undefined): string | null {
  if (n == null || n <= 0) return null;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(/\.0$/, "")}M subscribers`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}K subscribers`;
  }
  return `${n} subscribers`;
}

/** Extract @handle from a YouTube channel URL when present. */
export function channelHandle(youtubeUrl: string | null | undefined, slug: string): string {
  if (youtubeUrl) {
    const at = youtubeUrl.match(/youtube\.com\/@([^/?#]+)/i);
    if (at?.[1]) return `@${decodeURIComponent(at[1])}`;
    const c = youtubeUrl.match(/youtube\.com\/(?:c|channel)\/([^/?#]+)/i);
    if (c?.[1] && c[1].startsWith("@")) return c[1];
  }
  return `@${slug}`;
}
