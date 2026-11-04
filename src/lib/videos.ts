import type { ContentMode } from "./content-mode";
import { getSql, type Video } from "./db";

export type VideoSort = "recent" | "ranked" | "trending";

export type VideoQuery = {
  q?: string;
  category?: string;
  channelSlug?: string;
  /** Match any of these channel slugs (subscriptions / activity). */
  channelSlugs?: string[];
  /** Match any of these category slugs (recommended from activity). */
  categorySlugs?: string[];
  /** Exclude these category slugs (e.g. keep music/news off the mixed home feed). */
  excludeCategorySlugs?: string[];
  /** Exclude these channel slugs (⋯ → Don’t recommend this channel). */
  excludeChannelSlugs?: string[];
  /** all | videos | shorts */
  format?: "all" | "videos" | "shorts";
  /** jewish = Jewish-only; filtered = Jewish + family-safe */
  mode?: ContentMode;
  /** recent = publish date; ranked = personalized + popularity; trending = engagement */
  sort?: VideoSort;
  /** Channel slugs to boost for ranked sort (subscriptions / likes / watch activity). */
  boostChannelSlugs?: string[];
  /** Category slugs to boost for ranked sort. */
  boostCategorySlugs?: string[];
  /** Stronger channel boost from ⋯ → Show more content like this. */
  affinityChannelSlugs?: string[];
  /** Stronger category boost from the same action. */
  affinityCategorySlugs?: string[];
  limit?: number;
};

/** Merge parental disabled categories into exclude list. */
export function withParentalExcludes(
  base: string[] | undefined,
  disabled: string[] | undefined,
): string[] | undefined {
  const merged = [...(base || []), ...(disabled || [])]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return merged.length ? [...new Set(merged)] : undefined;
}

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
  const excludeChannelSlugs = (query.excludeChannelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const boostChannelSlugs = (query.boostChannelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const boostCategorySlugs = (query.boostCategorySlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const affinityChannelSlugs = (query.affinityChannelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
  const affinityCategorySlugs = (query.affinityCategorySlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const hasChannelSlugs = channelSlugs.length > 0;
  const hasCategorySlugs = categorySlugs.length > 0;
  const hasExcludeCategories = excludeCategorySlugs.length > 0;
  const hasExcludeChannels = excludeChannelSlugs.length > 0;
  const hasBoostChannels = boostChannelSlugs.length > 0;
  const hasBoostCategories = boostCategorySlugs.length > 0;
  const hasAffinityChannels = affinityChannelSlugs.length > 0;
  const hasAffinityCategories = affinityCategorySlugs.length > 0;
  const format = query.format || "all";
  const shortsOnly = format === "shorts";
  const longOnly = format === "videos";
  const onlyJewish = jewishOnly(query.mode);
  const sort = query.sort || "recent";
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 300);
  const like = q ? `%${q}%` : null;

  if (sort === "trending") {
    const rows = await sql`
      SELECT
        v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
        c.slug AS channel_slug, c.username AS channel_username,
        c.avatar_url AS channel_avatar_url,
        v.category, v.category_slug, cat.name AS category_name,
        v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
        COALESCE(v.is_jewish, TRUE) AS is_jewish,
        v.embeddable, v.is_active, v.created_at,
        v.published_at,
        (
          COALESCE(vw.views_7d, 0) * 4
          + COALESCE(lk.likes_7d, 0) * 12
          + COALESCE(cm.comments_7d, 0) * 18
          + LN(GREATEST(COALESCE(c.subscriber_count, 0), 0) + 1) * 0.35
          + GREATEST(
              0,
              8 - EXTRACT(EPOCH FROM (NOW() - COALESCE(v.published_at, v.created_at))) / 86400.0
            )
          + CASE WHEN v.published_at IS NOT NULL THEN 3 ELSE 0 END
        ) AS trend_score
      FROM videos v
      LEFT JOIN channels c ON c.id = v.channel_id
      LEFT JOIN categories cat ON cat.slug = v.category_slug
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS views_7d
        FROM video_views vv
        WHERE vv.video_id = v.id
          AND vv.created_at > NOW() - INTERVAL '7 days'
      ) vw ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS likes_7d
        FROM video_likes vl
        WHERE vl.video_id = v.id
          AND vl.created_at > NOW() - INTERVAL '7 days'
      ) lk ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS comments_7d
        FROM video_comments vc
        WHERE vc.video_id = v.id
          AND vc.created_at > NOW() - INTERVAL '7 days'
          AND COALESCE(vc.is_hidden, FALSE) = FALSE
      ) cm ON TRUE
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
          ${!hasExcludeChannels}::boolean
          OR c.slug IS NULL
          OR NOT (c.slug = ANY(${excludeChannelSlugs}))
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
      ORDER BY trend_score DESC, COALESCE(v.published_at, v.created_at) DESC
      LIMIT ${limit}
    `;
    return rows as Video[];
  }

  if (sort === "ranked") {
    const rows = await sql`
      SELECT
        v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
        c.slug AS channel_slug, c.username AS channel_username,
        c.avatar_url AS channel_avatar_url,
        v.category, v.category_slug, cat.name AS category_name,
        v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
        COALESCE(v.is_jewish, TRUE) AS is_jewish,
        v.embeddable, v.is_active, v.created_at,
        v.published_at,
        (
          CASE
            WHEN ${hasAffinityChannels}::boolean AND c.slug = ANY(${affinityChannelSlugs}) THEN 80
            WHEN ${hasBoostChannels}::boolean AND c.slug = ANY(${boostChannelSlugs}) THEN 48
            ELSE 0
          END
          + CASE
            WHEN ${hasAffinityCategories}::boolean AND v.category_slug = ANY(${affinityCategorySlugs}) THEN 28
            WHEN ${hasBoostCategories}::boolean AND v.category_slug = ANY(${boostCategorySlugs}) THEN 18
            ELSE 0
          END
          + COALESCE(vw.views_14d, 0) * 2.5
          + COALESCE(lk.likes_all, 0) * 8
          + COALESCE(cm.comments_all, 0) * 10
          + LN(GREATEST(COALESCE(c.subscriber_count, 0), 0) + 1) * 0.45
          + GREATEST(
              0,
              14 - EXTRACT(EPOCH FROM (NOW() - COALESCE(v.published_at, v.created_at))) / 86400.0
            ) * 1.2
          + CASE WHEN v.published_at IS NOT NULL THEN 6 ELSE 0 END
        ) AS rank_score
      FROM videos v
      LEFT JOIN channels c ON c.id = v.channel_id
      LEFT JOIN categories cat ON cat.slug = v.category_slug
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS views_14d
        FROM video_views vv
        WHERE vv.video_id = v.id
          AND vv.created_at > NOW() - INTERVAL '14 days'
      ) vw ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS likes_all
        FROM video_likes vl
        WHERE vl.video_id = v.id
      ) lk ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS comments_all
        FROM video_comments vc
        WHERE vc.video_id = v.id
          AND COALESCE(vc.is_hidden, FALSE) = FALSE
      ) cm ON TRUE
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
          ${!hasExcludeChannels}::boolean
          OR c.slug IS NULL
          OR NOT (c.slug = ANY(${excludeChannelSlugs}))
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
      ORDER BY rank_score DESC, COALESCE(v.published_at, v.created_at) DESC
      LIMIT ${limit}
    `;
    return rows as Video[];
  }

  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, c.username AS channel_username,
      c.avatar_url AS channel_avatar_url,
      v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      COALESCE(v.is_jewish, TRUE) AS is_jewish,
      v.embeddable, v.is_active, v.created_at,
      v.published_at
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
        ${!hasExcludeChannels}::boolean
        OR c.slug IS NULL
        OR NOT (c.slug = ANY(${excludeChannelSlugs}))
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
    ORDER BY
      CASE WHEN v.published_at IS NULL THEN 1 ELSE 0 END,
      COALESCE(v.published_at, v.created_at) DESC
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
      v.published_at
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
  options?: {
    excludeChannelSlugs?: string[];
    affinityChannelSlugs?: string[];
    affinityCategorySlugs?: string[];
  },
): Promise<Video[]> {
  const sql = getSql();
  const onlyJewish = jewishOnly(mode);
  const channelSlug = video.channel_slug || null;
  const categorySlug = video.category_slug || null;
  const excludeChannelSlugs = (options?.excludeChannelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 40);
  const affinityChannelSlugs = (options?.affinityChannelSlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 30);
  const affinityCategorySlugs = (options?.affinityCategorySlugs || [])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
  const hasExcludeChannels = excludeChannelSlugs.length > 0;
  const hasAffinityChannels = affinityChannelSlugs.length > 0;
  const hasAffinityCategories = affinityCategorySlugs.length > 0;
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
      v.published_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.is_active = TRUE
      AND v.id <> ${video.id}::uuid
      AND (
        ${!onlyJewish}::boolean
        OR COALESCE(v.is_jewish, TRUE) = TRUE
      )
      AND (
        ${!hasExcludeChannels}::boolean
        OR c.slug IS NULL
        OR NOT (c.slug = ANY(${excludeChannelSlugs}))
      )
    ORDER BY
      CASE WHEN COALESCE(v.is_short, FALSE) = ${Boolean(video.is_short)} THEN 0 ELSE 1 END,
      CASE WHEN ${channelSlug}::text IS NOT NULL AND c.slug = ${channelSlug} THEN 0 ELSE 1 END,
      CASE
        WHEN ${hasAffinityChannels}::boolean AND c.slug = ANY(${affinityChannelSlugs}) THEN 0
        ELSE 1
      END,
      CASE WHEN ${categorySlug}::text IS NOT NULL AND v.category_slug = ${categorySlug} THEN 0 ELSE 1 END,
      CASE
        WHEN ${hasAffinityCategories}::boolean AND v.category_slug = ANY(${affinityCategorySlugs}) THEN 0
        ELSE 1
      END,
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
