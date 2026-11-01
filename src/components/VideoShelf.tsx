import Link from "next/link";
import { VideoTile } from "@/components/VideoTile";
import type { Video } from "@/lib/db";

function ShortsMark() {
  return (
    <svg
      className="yt-shorts-mark"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.77 10.32c-.77-.32-1.2-.5-1.2-.5L18 9.06c1.84-.96 2.53-3.23 1.56-5.06s-3.24-2.53-5.07-1.56L6 6.94l-1.2-.5C3.48 5.8 1.47 6.33.74 7.82s.1 3.25 1.59 4.01l1.2.5-1.2.5c-1.49.76-2.32 2.52-1.59 4.01s2.74 2.02 4.23 1.26l1.2-.5L14.5 20.5c1.83.96 4.24.27 5.2-1.56s.27-4.1-1.56-5.07l-1.2-.5 1.2-.5c.42-.21.8-.5 1.13-.85zM10 14.65v-5.3L15 12l-5 2.65z"
      />
    </svg>
  );
}

export function VideoShelf({
  title,
  href,
  videos,
  emptyLabel = "No videos to show yet.",
  variant = "videos",
}: {
  title: string;
  href?: string;
  videos: Video[];
  emptyLabel?: string;
  variant?: "videos" | "shorts";
}) {
  if (videos.length === 0) return null;
  const isShorts = variant === "shorts";

  return (
    <section
      className={`yt-shelf${isShorts ? " is-shorts" : ""}`}
      aria-label={title}
    >
      <div className="yt-shelf-head">
        <h2 className="yt-shelf-title">
          {isShorts ? (
            <span className="yt-shorts-title">
              <ShortsMark />
              {title}
            </span>
          ) : (
            title
          )}
        </h2>
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
