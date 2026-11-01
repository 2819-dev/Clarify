import Link from "next/link";
import { notFound } from "next/navigation";
import { ChannelModActions } from "@/components/ChannelModActions";
import { ChannelTabs, type ChannelTab } from "@/components/ChannelTabs";
import { SubscribeButton } from "@/components/SubscribeButton";
import { VideoTile } from "@/components/VideoTile";
import {
  channelHandle,
  formatSubscriberCount,
  getChannel,
  listChannelCategories,
} from "@/lib/channels";
import { getContentMode } from "@/lib/content-mode-server";
import { isSubscribed } from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";
import { countShorts, listActiveVideos } from "@/lib/videos";
import type { Video } from "@/lib/db";

export const dynamic = "force-dynamic";

function parseTab(raw: string | undefined, hasShorts: boolean): ChannelTab {
  if (raw === "videos" || raw === "about") return raw;
  if (raw === "shorts" && hasShorts) return "shorts";
  return "home";
}

function Shelf({
  title,
  href,
  children,
  className = "",
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`channel-shelf ${className}`}>
      <div className="channel-shelf-head">
        <h2>{title}</h2>
        {href ? (
          <Link href={href} className="channel-shelf-more">
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ShortsRow({ videos, slug }: { videos: Video[]; slug: string }) {
  if (videos.length === 0) return null;
  return (
    <Shelf title="Shorts" href={`/channels/${slug}?tab=shorts`} className="is-shorts">
      <div className="channel-shorts-row">
        {videos.map((video) => (
          <VideoTile key={video.id} video={video} />
        ))}
      </div>
    </Shelf>
  );
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabRaw } = await searchParams;
  const mode = await getContentMode();
  const channel = await getChannel(slug, mode);
  if (!channel || !(channel.video_count && channel.video_count > 0)) {
    notFound();
  }

  const user = await getCurrentUser();
  const [longVideos, shortVideos, categories, shortsCount, subscribed] =
    await Promise.all([
      listActiveVideos({ channelSlug: slug, format: "videos", limit: 48, mode }),
      listActiveVideos({ channelSlug: slug, format: "shorts", limit: 24, mode }),
      listChannelCategories(slug, mode),
      countShorts(slug, mode),
      user ? isSubscribed(user.id, slug) : Promise.resolve(false),
    ]);

  const tab = parseTab(tabRaw, shortsCount > 0);
  const handle = channelHandle(channel);
  const subs = formatSubscriberCount(channel.subscriber_count);
  const videoLabel = `${channel.video_count} video${
    channel.video_count === 1 ? "" : "s"
  }`;

  // Category shelves for Home (top categories with enough videos)
  const shelfCategories = categories.filter((c) => (c.video_count ?? 0) >= 2).slice(0, 3);
  const categoryShelves = await Promise.all(
    shelfCategories.map(async (cat) => ({
      category: cat,
      videos: (
        await listActiveVideos({
          channelSlug: slug,
          category: cat.slug,
          format: "videos",
          limit: 8,
          mode,
        })
      ).slice(0, 6),
    })),
  );

  return (
    <section className="channel-yt">
      <div
        className="channel-yt-banner"
        style={
          channel.banner_url
            ? { backgroundImage: `url(${channel.banner_url})` }
            : undefined
        }
        role="img"
        aria-label={`${channel.name} banner`}
      />

      <div className="channel-yt-inner">
        <div className="channel-yt-identity">
          {channel.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.avatar_url}
              alt=""
              className="channel-yt-avatar"
            />
          ) : (
            <span className="channel-yt-avatar placeholder" aria-hidden />
          )}

          <div className="channel-yt-identity-copy">
            <h1 className="channel-yt-name">{channel.name}</h1>
            <div className="channel-yt-meta">
              <span className="channel-yt-handle">{handle}</span>
              {subs ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{subs}</span>
                </>
              ) : null}
              <span aria-hidden>·</span>
              <span>{videoLabel}</span>
            </div>
            {channel.description ? (
              <p className="channel-yt-snippet">
                {channel.description.length > 140
                  ? `${channel.description.slice(0, 140).trim()}…`
                  : channel.description}{" "}
                <Link href={`/channels/${slug}?tab=about`} className="channel-yt-more">
                  more
                </Link>
              </p>
            ) : null}
          </div>

          <div className="channel-yt-actions">
            <SubscribeButton
              channelSlug={channel.slug}
              channelName={channel.name}
              initialSubscribed={subscribed}
              signedIn={Boolean(user)}
            />
            {channel.youtube_url ? (
              <a
                className="btn-ghost"
                href={channel.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on YouTube
              </a>
            ) : null}
            <ChannelModActions
              channelSlug={channel.slug}
              channelName={channel.name}
            />
          </div>
        </div>

        <ChannelTabs slug={slug} active={tab} shortsCount={shortsCount} />

        <div className="channel-yt-body">
          {tab === "home" ? (
            <>
              {longVideos.length > 0 ? (
                <Shelf
                  title="Videos"
                  href={`/channels/${slug}?tab=videos`}
                >
                  <div className="video-grid">
                    {longVideos.slice(0, 8).map((video) => (
                      <VideoTile key={video.id} video={video} />
                    ))}
                  </div>
                </Shelf>
              ) : null}

              <ShortsRow videos={shortVideos.slice(0, 10)} slug={slug} />

              {categoryShelves.map(({ category, videos }) =>
                videos.length > 0 ? (
                  <Shelf
                    key={category.slug}
                    title={category.name}
                    href={`/channels/${slug}?tab=videos`}
                  >
                    <div className="video-grid">
                      {videos.map((video) => (
                        <VideoTile key={video.id} video={video} />
                      ))}
                    </div>
                  </Shelf>
                ) : null,
              )}
            </>
          ) : null}

          {tab === "videos" ? (
            longVideos.length === 0 ? (
              <p className="empty-state">No videos on this channel yet.</p>
            ) : (
              <div className="video-grid">
                {longVideos.map((video) => (
                  <VideoTile key={video.id} video={video} />
                ))}
              </div>
            )
          ) : null}

          {tab === "shorts" ? (
            shortVideos.length === 0 ? (
              <p className="empty-state">No Shorts on this channel yet.</p>
            ) : (
              <div className="video-grid shorts-grid">
                {shortVideos.map((video) => (
                  <VideoTile key={video.id} video={video} />
                ))}
              </div>
            )
          ) : null}

          {tab === "about" ? (
            <div className="channel-yt-about">
              <h2>Description</h2>
              <p className="channel-yt-about-body">
                {channel.description || "No description available."}
              </p>
              <dl className="channel-yt-about-stats">
                <div>
                  <dt>Handle</dt>
                  <dd>{handle}</dd>
                </div>
                {subs ? (
                  <div>
                    <dt>Subscribers</dt>
                    <dd>{subs.replace(/ subscribers$/, "")}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>Videos on Clarify</dt>
                  <dd>{channel.video_count}</dd>
                </div>
                {shortsCount > 0 ? (
                  <div>
                    <dt>Shorts</dt>
                    <dd>{shortsCount}</dd>
                  </div>
                ) : null}
                {channel.youtube_url ? (
                  <div>
                    <dt>YouTube</dt>
                    <dd>
                      <a
                        href={channel.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {handle}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
