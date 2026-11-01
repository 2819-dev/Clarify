import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import {
  formatSubscriberCount,
  listChannelsBySlugs,
} from "@/lib/channels";
import { contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import { getSubscriptionSlugs } from "@/lib/preferences-server";
import { listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const mode = await getContentMode();
  const subSlugs = await getSubscriptionSlugs();
  const [categories, channels, videos] = await Promise.all([
    listCategories(mode),
    listChannelsBySlugs(subSlugs, mode),
    subSlugs.length
      ? listActiveVideos({ channelSlugs: subSlugs, mode, limit: 48 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} />
      <div className="yt-home-meta">
        <div>
          <h1 className="yt-home-title">Subscriptions</h1>
          <p className="yt-home-sub">
            {channels.length === 0
              ? `No subscriptions yet in ${contentModeLabel(mode)}. Subscribe on any channel page — saved on this device.`
              : `${channels.length} channel${channels.length === 1 ? "" : "s"} · ${videos.length} recent videos — ${contentModeLabel(mode)}.`}
          </p>
        </div>
      </div>

      {channels.length > 0 ? (
        <div className="channel-directory yt-subs-directory">
          {channels.map((channel) => {
            const subs = formatSubscriberCount(channel.subscriber_count);
            return (
              <Link
                key={channel.id}
                href={`/channels/${channel.slug}`}
                className="channel-card"
              >
                <div
                  className="channel-card-banner"
                  style={
                    channel.banner_url
                      ? { backgroundImage: `url(${channel.banner_url})` }
                      : undefined
                  }
                  aria-hidden
                />
                <div className="channel-card-body">
                  {channel.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={channel.avatar_url}
                      alt=""
                      className="channel-avatar"
                    />
                  ) : (
                    <span className="channel-avatar placeholder" aria-hidden />
                  )}
                  <div className="channel-card-copy">
                    <h3>{channel.name}</h3>
                    <p className="channel-card-bio">{channel.description}</p>
                    <div className="channel-card-meta">
                      <span>
                        {channel.video_count ?? 0} video
                        {(channel.video_count ?? 0) === 1 ? "" : "s"}
                      </span>
                      {subs ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>{subs}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="empty-state">
          <Link href="/channels" className="btn-primary">
            Browse channels
          </Link>
        </p>
      )}

      {videos.length > 0 ? (
        <section className="yt-shelf" aria-label="Recent from subscriptions">
          <div className="yt-shelf-head">
            <h2 className="yt-shelf-title">Recent uploads</h2>
          </div>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
