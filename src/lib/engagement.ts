import { moderateText } from "./automod";
import { getSql, type Channel } from "./db";

export async function listSubscribedChannelSlugs(
  userId: string,
): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.slug
    FROM subscriptions s
    INNER JOIN channels ch ON ch.id = s.channel_id
    WHERE s.user_id = ${userId}::uuid
      AND COALESCE(ch.is_active, TRUE) = TRUE
    ORDER BY s.created_at DESC
  `;
  return (rows as { slug: string }[]).map((r) => r.slug);
}

export async function listSubscribedChannels(
  userId: string,
  modeJewishOnly: boolean,
): Promise<Channel[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.id, ch.slug, ch.name, ch.description, ch.youtube_url,
           ch.avatar_url, ch.banner_url, ch.subscriber_count,
           COALESCE(ch.is_jewish, TRUE) AS is_jewish, ch.username, ch.created_at,
           COUNT(v.id)::int AS video_count
    FROM subscriptions s
    INNER JOIN channels ch ON ch.id = s.channel_id
    LEFT JOIN videos v
      ON v.channel_id = ch.id
     AND v.is_active = TRUE
     AND (
       ${!modeJewishOnly}::boolean
       OR COALESCE(v.is_jewish, TRUE) = TRUE
     )
    WHERE s.user_id = ${userId}::uuid
      AND COALESCE(ch.is_active, TRUE) = TRUE
    GROUP BY ch.id, s.created_at
    HAVING COUNT(v.id) > 0
    ORDER BY s.created_at DESC
  `;
  return rows as Channel[];
}

export async function isSubscribed(
  userId: string,
  channelSlug: string,
): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    SELECT 1
    FROM subscriptions s
    INNER JOIN channels ch ON ch.id = s.channel_id
    WHERE s.user_id = ${userId}::uuid
      AND ch.slug = ${channelSlug}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function toggleSubscription(
  userId: string,
  channelSlug: string,
): Promise<boolean> {
  const sql = getSql();
  const channels = await sql`
    SELECT id FROM channels WHERE slug = ${channelSlug} LIMIT 1
  `;
  const channelId = (channels[0] as { id: string } | undefined)?.id;
  if (!channelId) throw new Error("Channel not found");

  const existing = await sql`
    SELECT 1 FROM subscriptions
    WHERE user_id = ${userId}::uuid AND channel_id = ${channelId}::uuid
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM subscriptions
      WHERE user_id = ${userId}::uuid AND channel_id = ${channelId}::uuid
    `;
    return false;
  }
  await sql`
    INSERT INTO subscriptions (user_id, channel_id)
    VALUES (${userId}::uuid, ${channelId}::uuid)
    ON CONFLICT DO NOTHING
  `;
  return true;
}

export async function getVideoLikeState(videoId: string, userId?: string | null) {
  const sql = getSql();
  const countRows = await sql`
    SELECT COUNT(*)::int AS n FROM video_likes WHERE video_id = ${videoId}::uuid
  `;
  let liked = false;
  if (userId) {
    const mine = await sql`
      SELECT 1 FROM video_likes
      WHERE video_id = ${videoId}::uuid AND user_id = ${userId}::uuid
      LIMIT 1
    `;
    liked = mine.length > 0;
  }
  return { count: Number(countRows[0]?.n ?? 0), liked };
}

export async function toggleLike(
  userId: string,
  videoId: string,
): Promise<{ liked: boolean; count: number }> {
  const sql = getSql();
  const existing = await sql`
    SELECT 1 FROM video_likes
    WHERE user_id = ${userId}::uuid AND video_id = ${videoId}::uuid
    LIMIT 1
  `;
  if (existing.length > 0) {
    await sql`
      DELETE FROM video_likes
      WHERE user_id = ${userId}::uuid AND video_id = ${videoId}::uuid
    `;
  } else {
    await sql`
      INSERT INTO video_likes (user_id, video_id)
      VALUES (${userId}::uuid, ${videoId}::uuid)
      ON CONFLICT DO NOTHING
    `;
  }
  return getVideoLikeState(videoId, userId);
}

export type VideoComment = {
  id: string;
  body: string;
  created_at: string;
  display_name: string;
  username: string | null;
  user_id: string;
  is_hidden?: boolean;
  automod_flag?: string | null;
};

export async function listComments(
  videoId: string,
  opts?: { includeHidden?: boolean },
): Promise<VideoComment[]> {
  const sql = getSql();
  const includeHidden = Boolean(opts?.includeHidden);
  const rows = await sql`
    SELECT c.id, c.body, c.created_at, c.user_id, u.display_name, u.username,
           COALESCE(c.is_hidden, FALSE) AS is_hidden, c.automod_flag
    FROM video_comments c
    INNER JOIN users u ON u.id = c.user_id
    WHERE c.video_id = ${videoId}::uuid
      AND (
        ${includeHidden}::boolean
        OR COALESCE(c.is_hidden, FALSE) = FALSE
      )
    ORDER BY c.created_at DESC
    LIMIT 100
  `;
  return rows as VideoComment[];
}

export async function addComment(
  userId: string,
  videoId: string,
  body: string,
): Promise<VideoComment & { automod_hidden?: boolean }> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");
  if (trimmed.length > 2000) throw new Error("Comment is too long.");
  const verdict = moderateText(trimmed);
  const hidden = !verdict.ok;
  const flag = verdict.ok ? null : verdict.flag;
  const sql = getSql();
  const rows = await sql`
    INSERT INTO video_comments (user_id, video_id, body, is_hidden, automod_flag)
    VALUES (
      ${userId}::uuid,
      ${videoId}::uuid,
      ${trimmed},
      ${hidden},
      ${flag}
    )
    RETURNING id, body, created_at, user_id, is_hidden, automod_flag
  `;
  const inserted = rows[0] as {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    is_hidden: boolean;
    automod_flag: string | null;
  };
  const users = await sql`
    SELECT display_name, username FROM users WHERE id = ${userId}::uuid LIMIT 1
  `;
  const u = users[0] as { display_name: string; username: string | null };
  if (hidden) {
    throw new Error(
      verdict.ok
        ? "Comment was hidden by AutoMod."
        : verdict.message,
    );
  }
  return {
    ...inserted,
    display_name: u.display_name,
    username: u.username,
  };
}
