import { getSql, type Channel } from "./db";

export async function listChannels(): Promise<Channel[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url, ch.avatar_url, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active = TRUE
    GROUP BY ch.id
    HAVING COUNT(v.id) > 0
    ORDER BY COUNT(v.id) DESC, ch.name ASC
  `;
  return rows as Channel[];
}

export async function getChannel(slug: string): Promise<Channel | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url, ch.avatar_url, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM channels ch
    LEFT JOIN videos v ON v.channel_id = ch.id AND v.is_active = TRUE
    WHERE ch.slug = ${slug}
    GROUP BY ch.id
    LIMIT 1
  `;
  return (rows[0] as Channel | undefined) ?? null;
}
