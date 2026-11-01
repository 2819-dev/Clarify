import Link from "next/link";
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

export function SearchResultRow({ video }: { video: Video }) {
  const isShort = Boolean(video.is_short);
  const stored = video.thumbnail_url || "";
  const isGeneric =
    !stored ||
    /\/(default|mqdefault|hqdefault|sddefault|hq720|maxresdefault)\.jpg/i.test(
      stored,
    );
  const thumb = isShort
    ? isGeneric
      ? `https://i.ytimg.com/vi/${video.youtube_id}/oar2.jpg`
      : stored
    : stored || `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
  const duration = formatDuration(video.duration_seconds);
  const when = video.published_at || video.created_at;
  const relative = formatRelativeTime(when);
  const absolute = formatAbsoluteTime(when);
  const initial = (video.channel_name.trim()[0] || "?").toUpperCase();

  return (
    <article className={`search-result ${isShort ? "is-short" : ""}`}>
      <Link href={`/watch/${video.id}`} className="search-result-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" loading="lazy" />
        {!isShort && duration ? (
          <span className="video-duration">{duration}</span>
        ) : null}
      </Link>
      <div className="search-result-copy">
        <Link href={`/watch/${video.id}`} className="search-result-title">
          {video.title}
        </Link>
        <p className="search-result-meta">
          {relative ? (
            <time dateTime={when} title={absolute}>
              {relative}
            </time>
          ) : null}
          {video.category_name || video.category ? (
            <>
              <span aria-hidden>·</span>
              <span>{video.category_name || video.category}</span>
            </>
          ) : null}
        </p>
        <div className="search-result-channel">
          {video.channel_slug ? (
            <Link
              href={`/channels/${video.channel_slug}`}
              className="search-result-avatar-link"
            >
              {video.channel_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.channel_avatar_url}
                  alt=""
                  className="search-result-avatar"
                />
              ) : (
                <span className="search-result-avatar fallback" aria-hidden>
                  {initial}
                </span>
              )}
              <span>{video.channel_name}</span>
            </Link>
          ) : (
            <span className="search-result-avatar-link">
              <span className="search-result-avatar fallback" aria-hidden>
                {initial}
              </span>
              <span>{video.channel_name}</span>
            </span>
          )}
        </div>
        {video.description ? (
          <p className="search-result-desc">{video.description}</p>
        ) : null}
      </div>
    </article>
  );
}
