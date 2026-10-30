import { getSql, type ReportWithVideo } from "./db";

export async function createReport(videoId: string, reason: string) {
  const sql = getSql();
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new Error("Reason is required");
  }

  const active = await sql`
    SELECT id FROM videos WHERE id = ${videoId} AND is_active = TRUE LIMIT 1
  `;
  if (!active[0]) {
    throw new Error("Video not found");
  }

  const rows = await sql`
    INSERT INTO reports (video_id, reason)
    VALUES (${videoId}, ${trimmed})
    RETURNING id, video_id, reason, status, created_at
  `;
  return rows[0];
}

export async function listPendingReports(): Promise<ReportWithVideo[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT r.id, r.video_id, r.reason, r.status, r.created_at, r.reviewed_at,
           v.title AS video_title, v.youtube_id, v.thumbnail_url
    FROM reports r
    JOIN videos v ON v.id = r.video_id
    WHERE r.status = 'pending'
    ORDER BY r.created_at ASC
  `;
  return rows as ReportWithVideo[];
}

export async function approveReport(reportId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, video_id, status FROM reports WHERE id = ${reportId} LIMIT 1
  `;
  const report = rows[0] as
    | { id: string; video_id: string; status: string }
    | undefined;
  if (!report) {
    throw new Error("Report not found");
  }
  if (report.status !== "pending") {
    throw new Error("Report already reviewed");
  }

  await sql`
    UPDATE reports
    SET status = 'approved', reviewed_at = NOW()
    WHERE id = ${reportId}
  `;
  await sql`
    UPDATE videos
    SET is_active = FALSE, updated_at = NOW()
    WHERE id = ${report.video_id}
  `;
  // Close sibling pending reports for the same removed video
  await sql`
    UPDATE reports
    SET status = 'approved', reviewed_at = NOW()
    WHERE video_id = ${report.video_id} AND status = 'pending'
  `;
}

export async function denyReport(reportId: string) {
  const sql = getSql();
  const rows = await sql`
    SELECT id, status FROM reports WHERE id = ${reportId} LIMIT 1
  `;
  const report = rows[0] as { id: string; status: string } | undefined;
  if (!report) {
    throw new Error("Report not found");
  }
  if (report.status !== "pending") {
    throw new Error("Report already reviewed");
  }

  await sql`
    UPDATE reports
    SET status = 'denied', reviewed_at = NOW()
    WHERE id = ${reportId}
  `;
}
