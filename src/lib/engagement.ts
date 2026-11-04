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

export async function listLikedChannelSlugs(userId: string): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.slug
    FROM video_likes vl
    INNER JOIN videos v ON v.id = vl.video_id
    INNER JOIN channels ch ON ch.id = v.channel_id
    WHERE vl.user_id = ${userId}::uuid
      AND v.is_active = TRUE
      AND COALESCE(ch.is_active, TRUE) = TRUE
    GROUP BY ch.slug
    ORDER BY MAX(vl.created_at) DESC
    LIMIT 30
  `;
  return (rows as { slug: string }[]).map((r) => r.slug);
}

export async function recordVideoView(input: {
  videoId: string;
  userId?: string | null;
  anonKey?: string | null;
}): Promise<void> {
  const sql = getSql();
  const videoId = input.videoId;
  const userId = input.userId || null;
  const anonKey = input.anonKey?.trim() || null;

  // Deduplicate rapid repeats (same viewer within 30 minutes).
  if (userId) {
    const recent = await sql`
      SELECT 1 FROM video_views
      WHERE video_id = ${videoId}::uuid
        AND user_id = ${userId}::uuid
        AND created_at > NOW() - INTERVAL '30 minutes'
      LIMIT 1
    `;
    if (recent.length) return;
  } else if (anonKey) {
    const recent = await sql`
      SELECT 1 FROM video_views
      WHERE video_id = ${videoId}::uuid
        AND anon_key = ${anonKey}
        AND created_at > NOW() - INTERVAL '30 minutes'
      LIMIT 1
    `;
    if (recent.length) return;
  }

  if (userId) {
    await sql`
      INSERT INTO video_views (video_id, user_id, anon_key)
      VALUES (${videoId}::uuid, ${userId}::uuid, NULL)
    `;
  } else {
    await sql`
      INSERT INTO video_views (video_id, user_id, anon_key)
      VALUES (${videoId}::uuid, NULL, ${anonKey})
    `;
  }
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
  avatar_url?: string | null;
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
           COALESCE(c.is_hidden, FALSE) AS is_hidden, c.automod_flag,
           (u.avatar_bytes IS NOT NULL) AS has_avatar,
           u.avatar_updated_at
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
  return (rows as (VideoComment & {
    has_avatar?: boolean;
    avatar_updated_at?: string | null;
  })[]).map((row) => {
    const version = row.avatar_updated_at
      ? new Date(row.avatar_updated_at).getTime()
      : 0;
    return {
      id: row.id,
      body: row.body,
      created_at: row.created_at,
      display_name: row.display_name,
      username: row.username,
      user_id: row.user_id,
      is_hidden: row.is_hidden,
      automod_flag: row.automod_flag,
      avatar_url: row.has_avatar
        ? `/api/avatars/${row.user_id}${version ? `?v=${version}` : ""}`
        : null,
    };
  });
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
        ? "This comment couldn’t be posted."
        : verdict.message,
    );
  }
  return {
    ...inserted,
    display_name: u.display_name,
    username: u.username,
  };
}

export type ChannelFeedPreference = "more" | "hide";

export async function listFeedPrefChannelSlugs(
  userId: string,
  preference: ChannelFeedPreference,
): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT ch.slug
    FROM channel_feed_prefs p
    INNER JOIN channels ch ON ch.id = p.channel_id
    WHERE p.user_id = ${userId}::uuid
      AND p.preference = ${preference}
      AND COALESCE(ch.is_active, TRUE) = TRUE
    ORDER BY p.updated_at DESC
    LIMIT 40
  `;
  return (rows as { slug: string }[]).map((r) => r.slug);
}

export async function setChannelFeedPref(
  userId: string,
  channelSlug: string,
  preference: ChannelFeedPreference,
): Promise<ChannelFeedPreference> {
  const sql = getSql();
  const channels = await sql`
    SELECT id FROM channels WHERE slug = ${channelSlug} LIMIT 1
  `;
  const channelId = (channels[0] as { id: string } | undefined)?.id;
  if (!channelId) throw new Error("Channel not found");

  await sql`
    INSERT INTO channel_feed_prefs (user_id, channel_id, preference, updated_at)
    VALUES (${userId}::uuid, ${channelId}::uuid, ${preference}, NOW())
    ON CONFLICT (user_id, channel_id) DO UPDATE
      SET preference = EXCLUDED.preference,
          updated_at = NOW()
  `;
  return preference;
}

export async function clearChannelFeedPref(
  userId: string,
  channelSlug: string,
): Promise<void> {
  const sql = getSql();
  await sql`
    DELETE FROM channel_feed_prefs p
    USING channels ch
    WHERE p.user_id = ${userId}::uuid
      AND p.channel_id = ch.id
      AND ch.slug = ${channelSlug}
  `;
}
