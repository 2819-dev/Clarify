import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export type Video = {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  channel_name: string;
  category: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_active: boolean;
  created_at: string;
};

export type ReportStatus = "pending" | "approved" | "denied";

export type Report = {
  id: string;
  video_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  reviewed_at: string | null;
};

export type ReportWithVideo = Report & {
  video_title: string;
  youtube_id: string;
  thumbnail_url: string | null;
};
