import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoShelf } from "@/components/VideoShelf";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { listChannelsBySlugs } from "@/lib/channels";
import { contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import {
  getSubscriptionSlugs,
  getWatchActivity,
} from "@/lib/preferences-server";
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
  const [subSlugs, activity] = await Promise.all([
    getSubscriptionSlugs(),
    getWatchActivity(),
  ]);

  const [categories, total, shortsCount, latest, shorts] = await Promise.all([
    listCategories(mode),
    countActiveVideos(mode),
    countShorts(undefined, mode),
    listActiveVideos({ q, format, mode, limit: isSearch ? 48 : 24 }),
    format === "all" && !isSearch
      ? listActiveVideos({ format: "shorts", mode, limit: 14 })
      : Promise.resolve([]),
  ]);

  const showShelves = !isSearch && format === "all";

  const [subscriptionVideos, recommendedVideos, subscribedChannels, shelfRows] =
    showShelves
      ? await Promise.all([
          subSlugs.length
            ? listActiveVideos({
                channelSlugs: subSlugs,
                mode,
                limit: 14,
              })
            : Promise.resolve([]),
          (async () => {
            if (
              !activity.channelSlugs.length &&
              !activity.categorySlugs.length
            ) {
              return [];
            }
            const [byChannel, byCategory] = await Promise.all([
              activity.channelSlugs.length
                ? listActiveVideos({
                    channelSlugs: activity.channelSlugs.slice(0, 8),
                    mode,
                    limit: 14,
                  })
                : Promise.resolve([]),
              activity.categorySlugs.length
                ? listActiveVideos({
                    categorySlugs: activity.categorySlugs.slice(0, 6),
                    mode,
                    limit: 14,
                  })
                : Promise.resolve([]),
            ]);
            const merged: typeof byChannel = [];
            const ids = new Set<string>();
            for (const v of [...byChannel, ...byCategory]) {
              if (ids.has(v.id)) continue;
              ids.add(v.id);
              merged.push(v);
            }
            return merged;
          })(),
          listChannelsBySlugs(subSlugs.slice(0, 12), mode),
          Promise.all(
            categories.slice(0, 8).map(async (cat) => ({
              cat,
              videos: await listActiveVideos({
                category: cat.slug,
                mode,
                limit: 10,
              }),
            })),
          ),
        ])
      : [[], [], [], []];

  // Avoid duplicating the same video across top shelves when possible
  const seen = new Set<string>();
  function takeFresh<T extends { id: string }>(items: T[], n: number) {
    const out: T[] = [];
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= n) break;
    }
    return out;
  }

  const latestFresh = takeFresh(latest, 12);
  const subsFresh = takeFresh(subscriptionVideos, 12);
  const recommendedFresh = takeFresh(recommendedVideos, 12);
  const shortsFresh = takeFresh(shorts, 12);

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
          {subsFresh.length > 0 ? (
            <VideoShelf
              title="From your subscriptions"
              videos={subsFresh}
              href="/subscriptions"
            />
          ) : subscribedChannels.length === 0 ? (
            <section className="yt-shelf yt-shelf-empty-subs">
              <div className="yt-shelf-head">
                <h2 className="yt-shelf-title">Subscriptions</h2>
                <Link href="/channels" className="yt-shelf-more">
                  Browse channels
                </Link>
              </div>
              <p className="yt-home-sub">
                Subscribe to channels you like — saved on this device, no
                account needed. They’ll show up here and in the sidebar.
              </p>
            </section>
          ) : null}

          {recommendedFresh.length > 0 ? (
            <VideoShelf
              title="Recommended for you"
              videos={recommendedFresh}
            />
          ) : null}

          <VideoShelf title="Latest" videos={latestFresh} href="/" />

          {shortsFresh.length > 0 ? (
            <VideoShelf
              title="Shorts"
              videos={shortsFresh}
              href="/?format=shorts"
            />
          ) : null}

          {shelfRows.map(({ cat, videos }) => (
            <VideoShelf
              key={cat.slug}
              title={cat.name}
              videos={takeFresh(videos, 10)}
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
