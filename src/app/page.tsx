import Link from "next/link";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryChips } from "@/components/CategoryChips";
import { ClarifyLogo } from "@/components/ClarifyLogo";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { listChannels } from "@/lib/channels";
import { contentModeDescription, contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import {
  countActiveVideos,
  countShorts,
  listActiveVideos,
} from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; format?: string }>;
}) {
  const { q, format: formatRaw } = await searchParams;
  const format =
    formatRaw === "shorts" || formatRaw === "videos" ? formatRaw : "all";
  const mode = await getContentMode();
  const [videos, categories, channels, total, shortsCount] = await Promise.all([
    listActiveVideos({ q, format, mode }),
    listCategories(mode),
    listChannels(mode),
    countActiveVideos(mode),
    countShorts(undefined, mode),
  ]);

  return (
    <>
      <section className="hero" aria-label="Welcome">
        <h1 className="hero-brand-lockup">
          <ClarifyLogo href={null} size="hero" />
        </h1>
        <p className="hero-line">
          {mode === "filtered"
            ? "Family-safe watching, curated with care."
            : "Jewish & family-safe videos, curated with care."}
        </p>
        <p className="hero-support">
          {contentModeDescription(mode)} Toggle{" "}
          <strong>Jewish Content</strong> or <strong>Filtered Content</strong>{" "}
          anytime — search, browse channels, and report anything that doesn’t
          belong.
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
              ? `${videos.length} match${videos.length === 1 ? "" : "es"} in ${contentModeLabel(mode)}.`
              : `${total} videos · ${categories.length} categories · ${channels.length} channels — ${contentModeLabel(mode)}.`}
          </p>
        </div>

        <FormatTabs
          basePath="/"
          active={format}
          q={q}
          shortsCount={shortsCount}
        />

        <Suspense fallback={null}>
          <CatalogSearch />
        </Suspense>
        <CategoryChips
          categories={categories}
          preserveQuery={q}
          preserveFormat={format}
        />

        {videos.length === 0 ? (
          <p className="empty-state">No videos matched that search.</p>
        ) : (
          <div
            className={`video-grid ${format === "shorts" ? "shorts-grid" : ""}`}
          >
            {videos.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
