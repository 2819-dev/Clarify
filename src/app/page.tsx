import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoShelf } from "@/components/VideoShelf";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { contentModeLabel } from "@/lib/content-mode";
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
  const isSearch = Boolean(q?.trim());

  const [categories, total, shortsCount, latest, shorts] = await Promise.all([
    listCategories(mode),
    countActiveVideos(mode),
    countShorts(undefined, mode),
    listActiveVideos({ q, format, mode, limit: isSearch ? 48 : 24 }),
    format === "all" && !isSearch
      ? listActiveVideos({ format: "shorts", mode, limit: 12 })
      : Promise.resolve([]),
  ]);

  const shelfCats = categories.slice(0, 8);
  const shelves =
    !isSearch && format === "all"
      ? await Promise.all(
          shelfCats.map(async (cat) => ({
            cat,
            videos: await listActiveVideos({
              category: cat.slug,
              mode,
              limit: 10,
            }),
          })),
        )
      : [];

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} />

      <div className="yt-home-meta">
        <div>
          <h1 className="yt-home-title">
            {isSearch
              ? `Results for “${q}”`
              : format === "shorts"
                ? "Shorts"
                : "Home"}
          </h1>
          <p className="yt-home-sub">
            {isSearch
              ? `${latest.length} match${latest.length === 1 ? "" : "es"} in ${contentModeLabel(mode)}.`
              : `${total} videos · ${categories.length} categories — ${contentModeLabel(mode)}.`}
          </p>
        </div>
        <FormatTabs
          basePath="/"
          active={format}
          q={q}
          shortsCount={shortsCount}
        />
      </div>

      {isSearch || format !== "all" ? (
        latest.length === 0 ? (
          <p className="empty-state">No videos matched that search.</p>
        ) : (
          <div
            className={`video-grid ${format === "shorts" ? "shorts-grid" : ""}`}
          >
            {latest.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        )
      ) : (
        <div className="yt-shelves">
          <VideoShelf title="Latest" videos={latest.slice(0, 12)} href="/" />
          {shorts.length > 0 ? (
            <VideoShelf
              title="Shorts"
              videos={shorts}
              href="/?format=shorts"
            />
          ) : null}
          {shelves.map(({ cat, videos }) => (
            <VideoShelf
              key={cat.slug}
              title={cat.name}
              videos={videos}
              href={`/categories/${cat.slug}`}
            />
          ))}
          <p className="yt-home-browse-all">
            <Link href="/categories" className="btn-ghost">
              Browse all categories
            </Link>
            <Link href="/channels" className="btn-secondary">
              Explore channels
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
