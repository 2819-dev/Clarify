import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoTile } from "@/components/VideoTile";
import { getCategory, listCategories } from "@/lib/categories";
import { getContentMode } from "@/lib/content-mode-server";
import { countShorts, listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; format?: string }>;
}) {
  const { slug } = await params;
  const { q, format: formatRaw } = await searchParams;
  const format =
    formatRaw === "shorts" || formatRaw === "videos" ? formatRaw : "all";
  const mode = await getContentMode();
  const [category, categories, videos, shortsCount] = await Promise.all([
    getCategory(slug, mode),
    listCategories(mode),
    listActiveVideos({ category: slug, q, format, mode, limit: 60 }),
    countShorts(undefined, mode),
  ]);
  if (!category || !(category.video_count && category.video_count > 0)) {
    notFound();
  }

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} activeSlug={slug} />

      <div className="yt-category-hero">
        <p className="eyebrow">Category</p>
        <h1 className="yt-home-title">{category.name}</h1>
        <p className="yt-home-sub">{category.description}</p>
        <p className="yt-home-sub">
          {category.video_count} video
          {category.video_count === 1 ? "" : "s"} in this mode
          {q ? ` · filtered by “${q}”` : ""}.
        </p>
      </div>

      <FormatTabs
        basePath={`/categories/${slug}`}
        active={format}
        q={q}
        shortsCount={shortsCount}
      />

      <Suspense fallback={null}>
        <CatalogSearch action={`/categories/${slug}`} />
      </Suspense>

      {videos.length === 0 ? (
        <p className="empty-state">
          No videos in this category right now.
        </p>
      ) : (
        <div
          className={`video-grid ${format === "shorts" ? "shorts-grid" : ""}`}
        >
          {videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      )}

      <p className="back-row">
        <Link href="/categories" className="btn-ghost">
          All categories
        </Link>
      </p>
    </div>
  );
}
