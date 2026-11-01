import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { ChannelCard } from "@/components/ChannelCard";
import { VideoTile } from "@/components/VideoTile";
import { listCategories } from "@/lib/categories";
import {
  formatSubscriberCount,
  listChannelsBySlugs,
} from "@/lib/channels";
import { contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";
import { listSubscribedChannelSlugs } from "@/lib/engagement";
import { getCurrentUser } from "@/lib/user-auth";
import { listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const mode = await getContentMode();
  const user = await getCurrentUser();
  const subSlugs = user ? await listSubscribedChannelSlugs(user.id) : [];
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
            {!user
              ? "Sign in to subscribe to channels and see them here."
              : channels.length === 0
                ? `No subscriptions yet in ${contentModeLabel(mode)}. Subscribe on any channel page.`
                : `${channels.length} channel${channels.length === 1 ? "" : "s"} · ${videos.length} recent videos — ${contentModeLabel(mode)}.`}
          </p>
        </div>
      </div>

      {!user ? (
        <p className="empty-state">
          <Link href="/signin?next=%2Fsubscriptions" className="btn-primary">
            Sign in
          </Link>
          <Link href="/signup?next=%2Fsubscriptions" className="btn-secondary">
            Create account
          </Link>
        </p>
      ) : channels.length > 0 ? (
        <div className="channel-directory yt-subs-directory">
          {channels.map((channel) => {
            const subs = formatSubscriberCount(channel.subscriber_count);
            const videoLabel = `${channel.video_count ?? 0} video${
              (channel.video_count ?? 0) === 1 ? "" : "s"
            }`;
            return (
              <ChannelCard
                key={channel.id}
                channel={channel}
                subs={subs}
                videoLabel={videoLabel}
              />
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
