import { getSql, type Video } from "./db";

export type VideoQuery = {
  q?: string;
  category?: string;
  channelSlug?: string;
  /** all | videos | shorts */
  format?: "all" | "videos" | "shorts";
  limit?: number;
};

export async function listActiveVideos(query: VideoQuery = {}): Promise<Video[]> {
  const sql = getSql();
  const q = query.q?.trim() || null;
  const category = query.category || null;
  const channelSlug = query.channelSlug || null;
  const format = query.format || "all";
  const shortsOnly = format === "shorts";
  const longOnly = format === "videos";
  const limit = Math.min(Math.max(query.limit ?? 200, 1), 300);
  const like = q ? `%${q}%` : null;

  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      v.embeddable, v.is_active, v.created_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.is_active = TRUE
      AND (${category}::text IS NULL OR v.category_slug = ${category})
      AND (${channelSlug}::text IS NULL OR c.slug = ${channelSlug})
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
    ORDER BY v.created_at DESC
    LIMIT ${limit}
  `;
  return rows as Video[];
}

export async function getActiveVideo(id: string): Promise<Video | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT
      v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
      c.slug AS channel_slug, v.category, v.category_slug, cat.name AS category_name,
      v.thumbnail_url, v.duration_seconds, COALESCE(v.is_short, FALSE) AS is_short,
      v.embeddable, v.is_active, v.created_at
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    LEFT JOIN categories cat ON cat.slug = v.category_slug
    WHERE v.id = ${id} AND v.is_active = TRUE
    LIMIT 1
  `;
  return (rows[0] as Video | undefined) ?? null;
}

export async function countShorts(channelSlug?: string): Promise<number> {
  const sql = getSql();
  const slug = channelSlug || null;
  const rows = await sql`
    SELECT COUNT(*)::int AS n
    FROM videos v
    LEFT JOIN channels c ON c.id = v.channel_id
    WHERE v.is_active = TRUE
      AND COALESCE(v.is_short, FALSE) = TRUE
      AND (${slug}::text IS NULL OR c.slug = ${slug})
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

export async function countActiveVideos(): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*)::int AS n FROM videos WHERE is_active = TRUE`;
  return Number(rows[0]?.n ?? 0);
}
