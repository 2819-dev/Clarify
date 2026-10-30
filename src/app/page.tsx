import Link from "next/link";
import { VideoTile } from "@/components/VideoTile";
import { listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const videos = await listActiveVideos();

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <h1 className="hero-brand">Clarify</h1>
        <p className="hero-line">
          Jewish &amp; family-safe videos, curated with care.
        </p>
        <p className="hero-support">
          A hand-picked catalog — no public accounts, and a clear path to report
          anything that doesn’t belong.
        </p>
        <div className="hero-actions">
          <Link href="#catalog" className="btn-primary">
            Browse the catalog
          </Link>
        </div>
      </section>

      <section id="catalog" className="section" aria-labelledby="catalog-title">
        <div className="section-heading">
          <h2 id="catalog-title">Catalog</h2>
          <p>Active videos ready to watch.</p>
        </div>
        {videos.length === 0 ? (
          <p className="empty-state">No videos in the catalog yet.</p>
        ) : (
          <div className="video-grid">
            {videos.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
