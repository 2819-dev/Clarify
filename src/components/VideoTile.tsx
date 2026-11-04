"use client";

import Link from "next/link";
import { useState } from "react";
import { ModeratorMenu } from "@/components/ModeratorMenu";
import { RecommendMenu } from "@/components/RecommendMenu";
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
  hideChannel = false,
}: {
  video: Video;
  dense?: boolean;
  /** On channel pages, omit avatar/name (already in context). */
  hideChannel?: boolean;
}) {
  const canModerate = useCanModerate();
  const [dismissed, setDismissed] = useState(false);
  const duration = formatDuration(video.duration_seconds);
  const isShort = Boolean(video.is_short);
  const showChannel = !hideChannel && !isShort;
  // Prefer YouTube’s original-aspect Shorts thumb when we only have a 16:9 default.
  const stored = video.thumbnail_url || "";
  const isGenericYtThumb =
    !stored ||
    /\/(default|mqdefault|hqdefault|sddefault|hq720|maxresdefault)\.jpg/i.test(
      stored,
    );
  const thumb = isShort
    ? isGenericYtThumb
      ? `https://i.ytimg.com/vi/${video.youtube_id}/oar2.jpg`
      : stored
    : stored ||
      `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
  // Only show relative time from real YouTube publish dates — never catalog insert time.
  const when = video.published_at || null;
  const relative = when ? formatRelativeTime(when) : null;
  const absolute = when ? formatAbsoluteTime(when) : "";
  const initial = (video.channel_name.trim()[0] || "?").toUpperCase();

  if (dismissed) return null;

  return (
    <article
      className={`video-tile ${isShort ? "is-short" : ""} ${dense ? "is-dense" : ""}${
        hideChannel ? " hide-channel" : ""
      }`}
    >
      <Link href={`/watch/${video.id}`} className="video-tile-thumb-link">
        <div className="video-thumb-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="video-thumb"
            loading="lazy"
            onError={(event) => {
              const img = event.currentTarget;
              const fallback = `https://i.ytimg.com/vi/${video.youtube_id}/hqdefault.jpg`;
              if (img.src !== fallback) img.src = fallback;
            }}
          />
          {!isShort && duration ? (
            <span className="video-duration">{duration}</span>
          ) : null}
        </div>
      </Link>

      <div className="video-tile-body">
        {showChannel && video.channel_slug ? (
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
        ) : showChannel ? (
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
            <div className="video-tile-menus">
              <RecommendMenu
                channelSlug={video.channel_slug}
                categorySlug={video.category_slug}
                label={video.title}
                onHidden={() => setDismissed(true)}
              />
              {canModerate ? (
                <ModeratorMenu
                  target="video"
                  videoId={video.id}
                  label={video.title}
                />
              ) : null}
            </div>
          </div>
          <div className="video-meta">
            {showChannel ? (
              video.channel_slug ? (
                <Link
                  href={`/channels/${video.channel_slug}`}
                  className="video-channel"
                >
                  {video.channel_name}
                </Link>
              ) : (
                <p className="video-channel">{video.channel_name}</p>
              )
            ) : null}
            {relative && when ? (
              <p className="video-submeta">
                <time dateTime={when} title={absolute}>
                  {relative}
                </time>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
