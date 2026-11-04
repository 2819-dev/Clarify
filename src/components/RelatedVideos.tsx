"use client";

import Link from "next/link";
import { useState } from "react";
import { RecommendMenu } from "@/components/RecommendMenu";
import { ShortsIcon } from "@/components/ShortsIcon";
import type { Video } from "@/lib/db";
import { formatRelativeTime } from "@/lib/time";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function RelatedRow({
  video,
  treatAsShort,
}: {
  video: Video;
  treatAsShort: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const stored = video.thumbnail_url || "";
  const isGeneric =
    !stored ||
    /\/(default|mqdefault|hqdefault|sddefault|hq720|maxresdefault)\.jpg/i.test(
      stored,
    );
  const thumb = treatAsShort
    ? isGeneric
      ? `https://i.ytimg.com/vi/${video.youtube_id}/oar2.jpg`
      : stored
    : stored ||
      `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
  const duration = formatDuration(video.duration_seconds);
  const when = video.published_at
    ? formatRelativeTime(video.published_at)
    : null;
  const meta = [video.channel_name, when].filter(Boolean).join(" · ");

  return (
    <li className="watch-related-row">
      <Link
        href={`/watch/${video.id}`}
        className={`watch-related-item${treatAsShort ? " is-short" : ""}`}
      >
        <div className="watch-related-thumb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" loading="lazy" />
          {!treatAsShort && duration ? (
            <span className="video-duration">{duration}</span>
          ) : null}
        </div>
        <div className="watch-related-copy">
          <p className="watch-related-title">{video.title}</p>
          {meta ? <p className="watch-related-meta">{meta}</p> : null}
        </div>
      </Link>
      <div className="watch-related-menu">
        <RecommendMenu
          channelSlug={video.channel_slug}
          categorySlug={video.category_slug}
          label={video.title}
          onHidden={() => setDismissed(true)}
        />
      </div>
    </li>
  );
}

export function RelatedVideos({
  videos,
  preferShorts = false,
}: {
  videos: Video[];
  preferShorts?: boolean;
}) {
  if (videos.length === 0) return null;

  const shortsOnly = preferShorts
    ? videos.filter((video) => Boolean(video.is_short))
    : [];
  const ordered =
    preferShorts && shortsOnly.length > 0
      ? shortsOnly
      : preferShorts
        ? [...videos].sort(
            (a, b) => Number(Boolean(b.is_short)) - Number(Boolean(a.is_short)),
          )
        : videos;

  return (
    <aside
      className={`watch-related${preferShorts ? " is-shorts-rail" : ""}`}
      aria-label={preferShorts ? "More Shorts" : "Related videos"}
    >
      <p className="watch-related-heading">
        {preferShorts ? (
          <>
            <ShortsIcon className="yt-shorts-mark" size={20} />
            More Shorts
          </>
        ) : (
          "Related"
        )}
      </p>
      <ul className="watch-related-list">
        {ordered.map((video) => (
          <RelatedRow
            key={video.id}
            video={video}
            treatAsShort={preferShorts || Boolean(video.is_short)}
          />
        ))}
      </ul>
    </aside>
  );
}
