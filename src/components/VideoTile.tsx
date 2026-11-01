"use client";

import Link from "next/link";
import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";
import type { Video } from "@/lib/db";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/time";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoTile({
  video,
  dense = false,
}: {
  video: Video;
  dense?: boolean;
}) {
  const canModerate = useCanModerate();
  const duration = formatDuration(video.duration_seconds);
  const isShort = Boolean(video.is_short);
  const thumb =
    video.thumbnail_url ??
    `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
  const when = video.published_at || video.created_at;
  const relative = formatRelativeTime(when);
  const absolute = formatAbsoluteTime(when);
  const initial = (video.channel_name.trim()[0] || "?").toUpperCase();

  return (
    <article
      className={`video-tile ${isShort ? "is-short" : ""} ${dense ? "is-dense" : ""}`}
    >
      <Link href={`/watch/${video.id}`} className="video-tile-thumb-link">
        <div className="video-thumb-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="video-thumb" loading="lazy" />
          {isShort ? <span className="video-badge">Shorts</span> : null}
          {!isShort && duration ? (
            <span className="video-duration">{duration}</span>
          ) : null}
        </div>
      </Link>

      <div className="video-tile-body">
        {!isShort && video.channel_slug ? (
          <Link
            href={`/channels/${video.channel_slug}`}
            className="video-tile-avatar-link"
            tabIndex={-1}
            aria-hidden
          >
            {video.channel_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.channel_avatar_url}
                alt=""
                className="video-tile-avatar"
              />
            ) : (
              <span className="video-tile-avatar fallback" aria-hidden>
                {initial}
              </span>
            )}
          </Link>
        ) : !isShort ? (
          <span className="video-tile-avatar fallback" aria-hidden>
            {initial}
          </span>
        ) : null}

        <div className="video-tile-copy">
          <div className="video-tile-top">
            <Link href={`/watch/${video.id}`} className="video-tile-main">
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
              <Link
                href={`/channels/${video.channel_slug}`}
                className="video-channel"
              >
                {video.channel_name}
              </Link>
            ) : (
              <p className="video-channel">{video.channel_name}</p>
            )}
            <p className="video-submeta">
              {relative ? (
                <time dateTime={when} title={absolute}>
                  {relative}
                </time>
              ) : null}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
