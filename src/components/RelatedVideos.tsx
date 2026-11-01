import Link from "next/link";
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

export function RelatedVideos({
  videos,
  preferShorts = false,
}: {
  videos: Video[];
  preferShorts?: boolean;
}) {
  if (videos.length === 0) return null;

  const ordered = preferShorts
    ? [...videos].sort(
        (a, b) => Number(Boolean(b.is_short)) - Number(Boolean(a.is_short)),
      )
    : videos;

  return (
    <aside
      className={`watch-related${preferShorts ? " is-shorts-rail" : ""}`}
      aria-label={preferShorts ? "More Shorts" : "Related videos"}
    >
      {preferShorts ? (
        <p className="watch-related-heading">
          <ShortsIcon className="yt-shorts-mark" size={20} />
          More Shorts
        </p>
      ) : null}
      <ul className="watch-related-list">
        {ordered.map((video) => {
          const stored = video.thumbnail_url || "";
          const isGeneric =
            !stored ||
            /\/(default|mqdefault|hqdefault|sddefault|hq720|maxresdefault)\.jpg/i.test(
              stored,
            );
          const thumb = video.is_short
            ? isGeneric
              ? `https://i.ytimg.com/vi/${video.youtube_id}/oar2.jpg`
              : stored
            : stored ||
              `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
          const duration = formatDuration(video.duration_seconds);
          const when = formatRelativeTime(
            video.published_at || video.created_at,
          );
          return (
            <li key={video.id}>
              <Link
                href={`/watch/${video.id}`}
                className={`watch-related-item${video.is_short ? " is-short" : ""}`}
              >
                <div className="watch-related-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" loading="lazy" />
                  {!video.is_short && duration ? (
                    <span className="video-duration">{duration}</span>
                  ) : null}
                </div>
                <div className="watch-related-copy">
                  <p className="watch-related-title">{video.title}</p>
                  <p className="watch-related-channel">{video.channel_name}</p>
                  {when ? (
                    <p className="watch-related-meta">{when}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
