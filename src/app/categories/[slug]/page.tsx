import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoTile } from "@/components/VideoTile";
import { getCategory, listCategories } from "@/lib/categories";
import { getContentMode } from "@/lib/content-mode-server";
import { listFeedPrefChannelSlugs } from "@/lib/engagement";
import { getParentalStatus } from "@/lib/parental";
import { getHiddenChannelSlugs } from "@/lib/preferences-server";
import { getCurrentUser } from "@/lib/user-auth";
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
  // News tab always lists the full News catalog (Family-Friendly scope),
  // even if the viewer is currently in Jewish browsing mode.
  const isNewsTab = slug === "news";
  const listMode = isNewsTab ? "filtered" : mode;
  const railMode = isNewsTab ? "filtered" : mode;
  const user = await getCurrentUser();
  const parental = user ? await getParentalStatus(user.id) : null;
  const disabled = parental?.disabledCategories || [];
  const [category, categories, cookieHidden, dbHidden, shortsCount] =
    await Promise.all([
      getCategory(slug, listMode),
      listCategories(railMode),
      getHiddenChannelSlugs(),
      user
        ? listFeedPrefChannelSlugs(user.id, "hide")
        : Promise.resolve([] as string[]),
      countShorts(undefined, listMode),
    ]);
  const excludeChannelSlugs = [...new Set([...cookieHidden, ...dbHidden])];
  const videos = await listActiveVideos({
    category: slug,
    q,
    format,
    mode: listMode,
    limit: 60,
    excludeChannelSlugs,
  });

  if (disabled.includes(slug)) {
    const categoryName =
      category?.name ||
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return (
      <div className="yt-home">
        <div className="yt-category-hero">
          <h1 className="yt-home-title">Category unavailable</h1>
          <p className="yt-home-sub">
            A parent has turned off {categoryName} on this account.
          </p>
          <p className="back-row">
            <Link href="/" className="btn-ghost">
              Back home
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (!category || !(category.video_count && category.video_count > 0)) {
    notFound();
  }

  return (
    <div className="yt-home">
      <CategoryRail
        categories={categories.filter((c) => !disabled.includes(c.slug))}
        activeSlug={slug}
      />

      <div className="yt-category-hero">
        <h1 className="yt-home-title">{category.name}</h1>
        <p className="yt-home-sub">{category.description}</p>
        <p className="yt-home-sub">
          {category.video_count} video
          {category.video_count === 1 ? "" : "s"}
          {q ? ` · results for “${q}”` : ""}.
        </p>
      </div>

      <FormatTabs
        basePath={`/categories/${slug}`}
        active={format}
        q={q}
        shortsCount={shortsCount}
      />

      {videos.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-copy">
            No videos in this category right now. Try another category, or switch
            between Jewish and Family-Friendly.
          </p>
          <Link href="/categories" className="btn-secondary">
            All categories
          </Link>
        </div>
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
