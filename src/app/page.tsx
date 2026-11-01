import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { SearchResultRow } from "@/components/SearchResultRow";
import { VideoShelf } from "@/components/VideoShelf";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import { listSubscribedChannelSlugs } from "@/lib/engagement";
import { getWatchActivity } from "@/lib/preferences-server";
import { getCurrentUser } from "@/lib/user-auth";
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
  const user = await getCurrentUser();
  const [subSlugs, activity] = await Promise.all([
    user ? listSubscribedChannelSlugs(user.id) : Promise.resolve([] as string[]),
    getWatchActivity(),
  ]);

  const [categories, total, shortsCount, latest, shorts] = await Promise.all([
    listCategories(mode),
    countActiveVideos(mode),
    countShorts(undefined, mode),
    listActiveVideos({ q, format, mode, limit: isSearch ? 48 : 24 }),
    format === "all" && !isSearch
      ? listActiveVideos({ format: "shorts", mode, limit: 10 })
      : Promise.resolve([]),
  ]);

  const showShelves = !isSearch && format === "all";

  const [subscriptionVideos, recommendedVideos, shelfRows] = showShelves
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
        Promise.all(
          categories.slice(0, 5).map(async (cat) => ({
            cat,
            videos: await listActiveVideos({
              category: cat.slug,
              mode,
              limit: 8,
            }),
          })),
        ),
      ])
    : [[], [], []];

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

  const latestFresh = takeFresh(latest, 24);
  const subsFresh = takeFresh(subscriptionVideos, 8);
  const recommendedFresh = takeFresh(recommendedVideos, 8);
  const shortsFresh = takeFresh(shorts, 10);

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} />

      <div className={`yt-home-meta ${!isSearch && format === "all" ? "is-minimal" : ""}`}>
        {isSearch || format !== "all" ? (
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
                : `${total} videos — ${contentModeLabel(mode)}.`}
            </p>
          </div>
        ) : (
          <div />
        )}
        {isSearch || format !== "all" ? (
          <FormatTabs
            basePath="/"
            active={format}
            q={q}
            shortsCount={shortsCount}
          />
        ) : null}
      </div>

      {isSearch ? (
        latest.length === 0 ? (
          <p className="empty-state">
            No videos matched your search. Try different words or browse
            categories.
          </p>
        ) : (
          <div className="search-results">
            {latest.map((video) => (
              <SearchResultRow key={video.id} video={video} />
            ))}
          </div>
        )
      ) : format !== "all" ? (
        latest.length === 0 ? (
          <p className="empty-state">
            No videos to show for this view. Try another filter or browse
            categories.
          </p>
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
          ) : (
            <section className="yt-shelf yt-shelf-empty-subs">
              <div className="yt-shelf-head">
                <h2 className="yt-shelf-title">Subscriptions</h2>
                <Link
                  href={user ? "/channels" : "/signin?next=%2Fchannels"}
                  className="yt-shelf-more"
                >
                  {user ? "Browse channels" : "Sign in"}
                </Link>
              </div>
              <p className="yt-home-sub">
                {user
                  ? "Subscribe to channels you enjoy — they’ll appear here and in your sidebar."
                  : "Sign in to subscribe, like videos, and leave comments."}
              </p>
            </section>
          )}

          {recommendedFresh.length > 0 ? (
            <VideoShelf
              title="Recommended for you"
              videos={recommendedFresh}
            />
          ) : null}

          {shortsFresh.length > 0 ? (
            <VideoShelf
              title="Shorts"
              videos={shortsFresh}
              href="/?format=shorts"
              variant="shorts"
            />
          ) : null}

          <section className="yt-shelf yt-shelf-grid" aria-label="Latest">
            <div className="yt-shelf-head">
              <h2 className="yt-shelf-title">Latest</h2>
            </div>
            <div className="video-grid">
              {latestFresh.map((video) => (
                <VideoTile key={video.id} video={video} />
              ))}
            </div>
          </section>

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
              Browse categories
            </Link>
            <Link href="/channels" className="btn-secondary">
              Browse channels
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
