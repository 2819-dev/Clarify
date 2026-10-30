import Link from "next/link";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryChips } from "@/components/CategoryChips";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { listChannels } from "@/lib/channels";
import { countActiveVideos, listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [videos, categories, channels, total] = await Promise.all([
    listActiveVideos({ q }),
    listCategories(),
    listChannels(),
    countActiveVideos(),
  ]);

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <h1 className="hero-brand-lockup">
          <ClarifyLogo href={null} size="hero" />
        </h1>
        <p className="hero-line">
          Jewish &amp; family-safe videos, curated with care.
        </p>
        <p className="hero-support">
          Hand-picked Jewish and family-safe watching — search the catalog,
          browse channels, and report anything that doesn’t belong.
        </p>
        <div className="hero-actions">
          <Link href="#catalog" className="btn-primary">
            Browse the catalog
          </Link>
          <Link href="/channels" className="btn-secondary">
            Explore channels
          </Link>
        </div>
      </section>

      <section id="catalog" className="section" aria-labelledby="catalog-title">
        <div className="section-heading">
          <h2 id="catalog-title">{q ? `Results for “${q}”` : "Catalog"}</h2>
          <p>
            {q
              ? `${videos.length} match${videos.length === 1 ? "" : "es"}.`
              : `${total} videos · ${categories.length} categories · ${channels.length} channels — search, filter, or open a channel.`}
          </p>
        </div>

        <Suspense fallback={null}>
          <CatalogSearch />
        </Suspense>
        <CategoryChips categories={categories} preserveQuery={q} />

        {videos.length === 0 ? (
          <p className="empty-state">No videos matched that search.</p>
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
