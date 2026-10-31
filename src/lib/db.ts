import { neon } from "@neondatabase/serverless";

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return neon(url);
}

export type Category = {
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  video_count?: number;
};

export type Channel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  youtube_url: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  subscriber_count: number | null;
  is_jewish: boolean;
  created_at: string;
  video_count?: number;
};

export type Video = {
  id: string;
  youtube_id: string;
  title: string;
  description: string;
  channel_name: string;
  channel_id: string | null;
  channel_slug?: string | null;
  category: string;
  category_slug: string | null;
  category_name?: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  is_short: boolean;
  is_jewish: boolean;
  embeddable: boolean;
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
