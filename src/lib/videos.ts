import { getSql, type Video } from "./db";

export async function listActiveVideos(): Promise<Video[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, youtube_id, title, description, channel_name, category,
           thumbnail_url, duration_seconds, embeddable, is_active, created_at
    FROM videos
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `;
  return rows as Video[];
}

export async function getActiveVideo(id: string): Promise<Video | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, youtube_id, title, description, channel_name, category,
           thumbnail_url, duration_seconds, embeddable, is_active, created_at
    FROM videos
    WHERE id = ${id} AND is_active = TRUE
    LIMIT 1
  `;
  return (rows[0] as Video | undefined) ?? null;
}

export async function deactivateVideo(videoId: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${videoId}
  `;
}
