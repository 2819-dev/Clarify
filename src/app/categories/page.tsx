import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { listCategories } from "@/lib/categories";
import { contentModeAdjective } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import { listActiveVideos } from "@/lib/videos";
import { VideoShelf } from "@/components/VideoShelf";

export const dynamic = "force-dynamic";

export default async function CategoriesIndexPage() {
  const mode = await getContentMode();
  const categories = await listCategories(mode);
  const previews = await Promise.all(
    categories.slice(0, 10).map(async (cat) => ({
      cat,
      videos: await listActiveVideos({ category: cat.slug, mode, limit: 8 }),
    })),
  );

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} />
      <div className="yt-home-meta">
        <div>
          <h1 className="yt-home-title">Categories</h1>
          <p className="yt-home-sub">
            Browse {contentModeAdjective(mode)} videos by topic.
          </p>
        </div>
      </div>

      <div className="yt-category-directory">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="yt-category-card"
          >
            <h2>{cat.name}</h2>
            <p>{cat.description}</p>
            <span className="entity-count">
              {cat.video_count ?? 0} video
              {(cat.video_count ?? 0) === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>

      <div className="yt-shelves">
        {previews.map(({ cat, videos }) => (
          <VideoShelf
            key={cat.slug}
            title={cat.name}
            videos={videos}
            href={`/categories/${cat.slug}`}
          />
        ))}
      </div>
    </div>
  );
}
