import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryChips } from "@/components/CategoryChips";
import { VideoTile } from "@/components/VideoTile";
import { getCategory, listCategories } from "@/lib/categories";
import { getContentMode } from "@/lib/content-mode-server";
import { listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const mode = await getContentMode();
  const [category, categories, videos] = await Promise.all([
    getCategory(slug, mode),
    listCategories(mode),
    listActiveVideos({ category: slug, q, mode }),
  ]);
  if (!category || !(category.video_count && category.video_count > 0)) {
    notFound();
  }

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <p className="eyebrow">Category</p>
        <h2>{category.name}</h2>
        <p>{category.description}</p>
      </div>

      <Suspense fallback={null}>
        <CatalogSearch action={`/categories/${slug}`} />
      </Suspense>
      <CategoryChips
        categories={categories}
        activeSlug={slug}
        preserveQuery={q}
      />

      {videos.length === 0 ? (
        <p className="empty-state">No videos in this category for this mode.</p>
      ) : (
        <div className="video-grid">
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
    </section>
  );
}
