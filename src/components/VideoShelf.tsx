import Link from "next/link";
import { VideoTile } from "@/components/VideoTile";
import type { Video } from "@/lib/db";

export function VideoShelf({
  title,
  href,
  videos,
  emptyLabel = "No videos yet.",
}: {
  title: string;
  href?: string;
  videos: Video[];
  emptyLabel?: string;
}) {
  if (videos.length === 0) return null;

  return (
    <section className="yt-shelf" aria-label={title}>
      <div className="yt-shelf-head">
        <h2 className="yt-shelf-title">{title}</h2>
        {href ? (
          <Link href={href} className="yt-shelf-more">
            Show more
          </Link>
        ) : null}
      </div>
      {videos.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <div className="yt-shelf-row">
          {videos.map((video) => (
            <div key={video.id} className="yt-shelf-item">
              <VideoTile video={video} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
