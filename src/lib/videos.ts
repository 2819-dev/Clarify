import type { ContentMode } from "./content-mode";
import { getSql, type Video } from "./db";

export type VideoQuery = {
  q?: string;
  category?: string;
  channelSlug?: string;
  /** Match any of these channel slugs (subscriptions / activity). */
  channelSlugs?: string[];
  /** Match any of these category slugs (recommended from activity). */
  categorySlugs?: string[];
  /** Exclude these category slugs (e.g. keep music off the mixed home feed). */
  excludeCategorySlugs?: string[];
  /** all | videos | shorts */
  format?: "all" | "videos" | "shorts";
  /** jewish = Jewish-only; filtered = Jewish + family-safe */
  mode?: ContentMode;
  limit?: number;
};

function jewishOnly(mode?: ContentMode): boolean {
  return mode !== "filtered";
}

export async function listActiveVideos(query: VideoQuery = {}): Promise<Video[]> {
  const sql = getSql();
  const q = query.q?.trim() || null;
  const category = query.category || null;
  const channelSlug = query.channelSlug || null;
  const channelSlugs = (query.channelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const categorySlugs = (query.categorySlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const excludeCategorySlugs = (query.excludeCategorySlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const hasChannelSlugs = channelSlugs.length > 0;
  const hasCategorySlugs = categorySlugs.length > 0;
  const hasExcludeCategories = excludeCategorySlugs.length > 0;
  const format = query.format || "all";
  const shortsOnly = format === "shorts";
  const longOnly = format === "videos";
  const onlyJewish = jewishOnly(query.mode);
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 300);
  const like = q ? `%${q}%` : null;

  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, c.username AS channel_username,
      c.avatar_url AS channel_avatar_url,
      v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      COALESCE(v.is_jewish, TRUE) AS is_jewish,
      v.embeddable, v.is_active, v.created_at,
      COALESCE(v.published_at, v.created_at) AS published_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.is_active = TRUE
      AND (${category}::text IS NULL OR v.category_slug = ${category})
      AND (${channelSlug}::text IS NULL OR c.slug = ${channelSlug})
      AND (
        ${!hasChannelSlugs}::boolean
        OR c.slug = ANY(${channelSlugs})
      )
      AND (
        ${!hasCategorySlugs}::boolean
        OR v.category_slug = ANY(${categorySlugs})
      )
      AND (
        ${!hasExcludeCategories}::boolean
        OR v.category_slug IS NULL
        OR NOT (v.category_slug = ANY(${excludeCategorySlugs}))
      )
      AND (
        ${!onlyJewish}::boolean
        OR COALESCE(v.is_jewish, TRUE) = TRUE
      )
      AND (
        ${!shortsOnly && !longOnly}::boolean
        OR (${shortsOnly}::boolean AND COALESCE(v.is_short, FALSE) = TRUE)
        OR (${longOnly}::boolean AND COALESCE(v.is_short, FALSE) = FALSE)
      )
      AND (
        ${like}::text IS NULL
        OR v.title ILIKE ${like}
        OR v.channel_name ILIKE ${like}
        OR v.category ILIKE ${like}
        OR v.category_slug ILIKE ${like}
        OR cat.name ILIKE ${like}
        OR c.name ILIKE ${like}
      )
    ORDER BY COALESCE(v.published_at, v.created_at) DESC
    LIMIT ${limit}
  `;
  return rows as Video[];
}

export async function getActiveVideo(id: string): Promise<Video | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, c.username AS channel_username,
      c.avatar_url AS channel_avatar_url,
      v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      COALESCE(v.is_jewish, TRUE) AS is_jewish,
      v.embeddable, v.is_active, v.created_at,
      COALESCE(v.published_at, v.created_at) AS published_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.id = ${id} AND v.is_active = TRUE
    LIMIT 1
  `;
  return (rows[0] as Video | undefined) ?? null;
}

/** Related rail: same channel first, then same category, then recent. */
export async function listRelatedVideos(
  video: Pick<
    Video,
    "id" | "channel_slug" | "category_slug" | "is_short" | "is_jewish"
  >,
  mode?: ContentMode,
  limit = 20,
): Promise<Video[]> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const channelSlug = video.channel_slug || null;
  const categorySlug = video.category_slug || null;
  const cap = Math.min(Math.max(limit, 1), 40);
  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, c.username AS channel_username,
      c.avatar_url AS channel_avatar_url,
      v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      COALESCE(v.is_jewish, TRUE) AS is_jewish,
      v.embeddable, v.is_active, v.created_at,
      COALESCE(v.published_at, v.created_at) AS published_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.is_active = TRUE
      AND v.id <> ${video.id}::uuid
      AND (
        ${!onlyJewish}::boolean
        OR COALESCE(v.is_jewish, TRUE) = TRUE
      )
    ORDER BY
      CASE WHEN COALESCE(v.is_short, FALSE) = ${Boolean(video.is_short)} THEN 0 ELSE 1 END,
      CASE WHEN ${channelSlug}::text IS NOT NULL AND c.slug = ${channelSlug} THEN 0 ELSE 1 END,
      CASE WHEN ${categorySlug}::text IS NOT NULL AND v.category_slug = ${categorySlug} THEN 0 ELSE 1 END,
      COALESCE(v.published_at, v.created_at) DESC
    LIMIT ${cap}
  `;
  return rows as Video[];
}

export async function countShorts(
  channelSlug?: string,
  mode?: ContentMode,
): Promise<number> {
  const sql = getSql();
  const slug = channelSlug || null;
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    WHERE v.is_active = TRUE
      AND COALESCE(v.is_short, FALSE) = TRUE
      AND (${slug}::text IS NULL OR c.slug = ${slug})
      AND (
        ${!onlyJewish}::boolean
        OR COALESCE(v.is_jewish, TRUE) = TRUE
      )
  `;
  return Number(rows[0]?.n ?? 0);
}

export async function deactivateVideo(videoId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${videoId}
  `;
}

export async function countActiveVideos(mode?: ContentMode): Promise<number> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM videos
    WHERE is_active = TRUE
      AND (
        ${!onlyJewish}::boolean
        OR COALESCE(is_jewish, TRUE) = TRUE
      )
  `;
  return Number(rows[0]?.n ?? 0);
}
