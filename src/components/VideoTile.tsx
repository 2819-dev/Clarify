"use client";

import Link from "next/link";
import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";
import type { Video } from "@/lib/db";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/time";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoTile({ video }: { video: Video }) {
  const canModerate = useCanModerate();
  const duration = formatDuration(video.duration_seconds);
  const isShort = Boolean(video.is_short);
  const thumb =
    video.thumbnail_url ??
    `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
  const when = video.published_at || video.created_at;
  const relative = formatRelativeTime(when);
  const absolute = formatAbsoluteTime(when);
  const handle = video.channel_username
    ? `@${video.channel_username}`
    : null;

  return (
    <article className={`video-tile ${isShort ? "is-short" : ""}`}>
      <div className="video-tile-top">
        <Link href={`/watch/${video.id}`} className="video-tile-main">
          <div className="video-thumb-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt="" className="video-thumb" loading="lazy" />
            {isShort ? <span className="video-badge">Shorts</span> : null}
            {!isShort && duration ? (
              <span className="video-duration">{duration}</span>
            ) : null}
          </div>
          <h3 className="video-title" title={video.title}>
            {video.title}
          </h3>
        </Link>
        {canModerate ? (
          <ModeratorMenu
            target="video"
            videoId={video.id}
            label={video.title}
          />
        ) : null}
      </div>
      <div className="video-meta">
        {video.channel_slug ? (
          <Link href={`/channels/${video.channel_slug}`} className="video-channel">
            {video.channel_name}
          </Link>
        ) : (
          <p className="video-channel">{video.channel_name}</p>
        )}
        <p className="video-submeta">
          {handle ? (
            <Link
              href={`/@${video.channel_username}`}
              className="video-handle"
            >
              {handle}
            </Link>
          ) : null}
          {handle && relative ? <span aria-hidden>·</span> : null}
          {relative ? (
            <time dateTime={when} title={absolute}>
              {relative}
            </time>
          ) : null}
        </p>
      </div>
    </article>
  );
}
