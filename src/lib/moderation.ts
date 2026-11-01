import { isAdminAccountEmail } from "./admin-email";
import { getSql } from "./db";
import { getCurrentUser } from "./user-auth";

export async function removeVideoFromCatalog(videoId: string): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${videoId}::uuid AND is_active = TRUE
    RETURNING id
  `;
  if (!rows[0]) throw new Error("Video not found or already removed.");
  await sql`
    UPDATE reports
    SET status = 'approved', reviewed_at = NOW()
    WHERE video_id = ${videoId}::uuid AND status = 'pending'
  `;
}

export async function hideChannel(channelSlug: string): Promise<void> {
  const sql = getSql();
  const channels = await sql`
    UPDATE channels
    SET is_active = FALSE
    WHERE slug = ${channelSlug} AND COALESCE(is_active, TRUE) = TRUE
    RETURNING id
  `;
  const channelId = (channels[0] as { id: string } | undefined)?.id;
  if (!channelId) throw new Error("Channel not found or already hidden.");
  await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE channel_id = ${channelId}::uuid AND is_active = TRUE
  `;
  await sql`
    UPDATE reports
    SET status = 'approved', reviewed_at = NOW()
    WHERE status = 'pending'
      AND video_id IN (
        SELECT id FROM videos WHERE channel_id = ${channelId}::uuid
      )
  `;
}

export async function deleteComment(commentId: string): Promise<void> {
  const sql = getSql();
  const rows = await sql`
    DELETE FROM video_comments
    WHERE id = ${commentId}::uuid
    RETURNING id
  `;
  if (!rows[0]) throw new Error("Comment not found.");
}

export async function requireModeratorUser(): Promise<{
  id: string;
  email: string;
}> {
  const user = await getCurrentUser();
  if (!user || !isAdminAccountEmail(user.email)) {
    throw new Error("Moderator access required.");
  }
  return { id: user.id, email: user.email };
}

export async function currentUserCanModerate(): Promise<boolean> {
  const user = await getCurrentUser();
  return isAdminAccountEmail(user?.email);
}
