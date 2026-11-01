import Link from "next/link";
import type { Video } from "@/lib/db";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoTile({ video }: { video: Video }) {
  const duration = formatDuration(video.duration_seconds);
  const isShort = Boolean(video.is_short);
  const thumb =
    video.thumbnail_url ??
    `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;

  return (
    <article className={`video-tile ${isShort ? "is-short" : ""}`}>
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
      <div className="video-meta">
        {video.channel_slug ? (
          <Link href={`/channels/${video.channel_slug}`} className="video-channel">
            {video.channel_name}
          </Link>
        ) : (
          <p className="video-channel">{video.channel_name}</p>
        )}
        {video.category_slug ? (
          <Link
            href={`/categories/${video.category_slug}`}
            className="video-category"
          >
            {video.category_name || video.category}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
