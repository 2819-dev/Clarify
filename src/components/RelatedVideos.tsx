import Link from "next/link";
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

export function RelatedVideos({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return null;

  return (
    <aside className="watch-related" aria-label="Related videos">
      <ul className="watch-related-list">
        {videos.map((video) => {
          const thumb =
            video.thumbnail_url ??
            `https://i.ytimg.com/vi/${video.youtube_id}/mqdefault.jpg`;
          const duration = formatDuration(video.duration_seconds);
          const when = formatRelativeTime(
            video.published_at || video.created_at,
          );
          return (
            <li key={video.id}>
              <Link href={`/watch/${video.id}`} className="watch-related-item">
                <div className="watch-related-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb} alt="" loading="lazy" />
                  {duration ? (
                    <span className="video-duration">{duration}</span>
                  ) : null}
                  {video.is_short ? (
                    <span className="video-badge">Shorts</span>
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
