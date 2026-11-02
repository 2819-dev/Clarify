import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoShelf } from "@/components/VideoShelf";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import { contentModeAdjective } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import {
  listLikedChannelSlugs,
  listSubscribedChannelSlugs,
} from "@/lib/engagement";
import {
  getSubscriptionSlugs,
  getWatchActivity,
} from "@/lib/preferences-server";
import { getCurrentUser } from "@/lib/user-auth";
import { getParentalStatus } from "@/lib/parental";
import {
  countActiveVideos,
  countShorts,
  listActiveVideos,
  withParentalExcludes,
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
  const [dbSubs, cookieSubs, likedChannels, activity, parental] =
    await Promise.all([
      user ? listSubscribedChannelSlugs(user.id) : Promise.resolve([] as string[]),
      getSubscriptionSlugs(),
      user ? listLikedChannelSlugs(user.id) : Promise.resolve([] as string[]),
      getWatchActivity(),
      user ? getParentalStatus(user.id) : Promise.resolve(null),
    ]);
  const parentalDisabled = parental?.disabledCategories || [];

  const subSlugs = [...new Set([...dbSubs, ...cookieSubs])];
  const boostChannelSlugs = [
    ...new Set([
      ...subSlugs,
      ...likedChannels,
      ...activity.channelSlugs,
    ]),
  ].slice(0, 40);
  const boostCategorySlugs = activity.categorySlugs
    .filter((s) => s !== "music" && s !== "news")
    .slice(0, 12);

  // Music + News belong in their own sections — not the mixed For you grid.
  const homeExclude = withParentalExcludes(
    !isSearch ? ["music", "news"] : undefined,
    parentalDisabled,
  );
  const homeSort = isSearch ? ("recent" as const) : ("ranked" as const);

  const [categories, total, shortsCount, latest, shorts, trending] =
    await Promise.all([
      listCategories(mode),
      countActiveVideos(mode),
      countShorts(undefined, mode),
      listActiveVideos({
        q,
        format,
        mode,
        limit: isSearch ? 48 : 24,
        excludeCategorySlugs: homeExclude,
        sort: homeSort,
        boostChannelSlugs,
        boostCategorySlugs,
      }),
      format === "all" && !isSearch
        ? listActiveVideos({
            format: "shorts",
            mode,
            limit: 14,
            excludeCategorySlugs: ["music", "news"],
            sort: "ranked",
            boostChannelSlugs,
            boostCategorySlugs,
          })
        : Promise.resolve([]),
      format === "all" && !isSearch
        ? listActiveVideos({
            mode,
            limit: 12,
            excludeCategorySlugs: ["music", "news"],
            format: "videos",
            sort: "trending",
          })
        : Promise.resolve([]),
    ]);

  const showShelves = !isSearch && format === "all";
  const newsCategory = categories.find((c) => c.slug === "news");
  const musicCategory = categories.find((c) => c.slug === "music");
  const nonMusicCategories = categories.filter(
    (c) => c.slug !== "music" && c.slug !== "news",
  );

  const [subscriptionVideos, recommendedVideos, musicVideos, newsVideos, shelfRows] =
    showShelves
      ? await Promise.all([
          subSlugs.length
            ? listActiveVideos({
                channelSlugs: subSlugs,
                mode,
                limit: 14,
                excludeCategorySlugs: ["music", "news"],
                sort: "ranked",
                boostChannelSlugs,
                boostCategorySlugs,
              })
            : Promise.resolve([]),
          (async () => {
            if (
              !activity.channelSlugs.length &&
              !activity.categorySlugs.length &&
              !likedChannels.length
            ) {
              return [];
            }
            return listActiveVideos({
              mode,
              limit: 14,
              excludeCategorySlugs: ["music", "news"],
              sort: "ranked",
              boostChannelSlugs,
              boostCategorySlugs,
            });
          })(),
          listActiveVideos({
            category: "music",
            mode,
            limit: 12,
            sort: "ranked",
            boostChannelSlugs,
          }),
          listActiveVideos({
            category: "news",
            mode,
            limit: 12,
            sort: "ranked",
            boostChannelSlugs,
          }),
          Promise.all(
            nonMusicCategories.slice(0, 5).map(async (cat) => ({
              cat,
              videos: await listActiveVideos({
                category: cat.slug,
                mode,
                limit: 8,
                sort: "ranked",
                boostChannelSlugs,
                boostCategorySlugs,
              }),
            })),
          ),
        ])
      : [[], [], [], [], []];

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

  const trendingFresh = takeFresh(trending, 9);
  const latestFresh = takeFresh(latest, 24);
  const subsFresh = takeFresh(subscriptionVideos, 8);
  const recommendedFresh = takeFresh(recommendedVideos, 8);
  const shortsFresh = takeFresh(shorts, 12);

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
                ? `${latest.length} ${contentModeAdjective(mode)} result${latest.length === 1 ? "" : "s"}.`
                : `${total} ${contentModeAdjective(mode)} video${total === 1 ? "" : "s"}.`}
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
          <div className="empty-state">
            <p className="empty-state-copy">
              No videos matched your search. Try different words or browse
              categories.
            </p>
            <Link href="/categories" className="btn-secondary">
              Browse categories
            </Link>
          </div>
        ) : (
          <div className="video-grid">
            {latest.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        )
      ) : format !== "all" ? (
        latest.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-copy">
              No videos to show for this view. Try another filter or browse
              categories.
            </p>
            <Link href="/categories" className="btn-secondary">
              Browse categories
            </Link>
          </div>
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
          ) : null}

          {recommendedFresh.length > 0 ? (
            <VideoShelf
              title="Recommended for you"
              videos={recommendedFresh}
            />
          ) : null}

          {trendingFresh.length > 0 ? (
            <VideoShelf title="Trending" videos={trendingFresh} />
          ) : null}

          {shortsFresh.length > 0 ? (
            <VideoShelf
              title="Shorts"
              videos={shortsFresh.slice(0, 12)}
              href="/?format=shorts"
              variant="shorts"
            />
          ) : null}

          <section className="yt-shelf yt-shelf-grid" aria-label="For you">
            <div className="yt-shelf-head">
              <h2 className="yt-shelf-title">For you</h2>
              <Link href="/?format=videos" className="yt-shelf-more">
                Show more
              </Link>
            </div>
            <div className="video-grid">
              {latestFresh.map((video) => (
                <VideoTile key={video.id} video={video} />
              ))}
            </div>
          </section>

          {newsVideos.length > 0 ? (
            <VideoShelf
              title={newsCategory?.name || "News"}
              videos={takeFresh(newsVideos, 10)}
              href="/categories/news"
            />
          ) : null}

          {musicVideos.length > 0 ? (
            <VideoShelf
              title={musicCategory?.name || "Music"}
              videos={takeFresh(musicVideos, 10)}
              href="/categories/music"
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
        </div>
      )}
    </div>
  );
}
