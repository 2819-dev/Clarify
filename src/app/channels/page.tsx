import Link from "next/link";
import {
  formatSubscriberCount,
  listChannels,
} from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function ChannelsIndexPage() {
  const channels = await listChannels();

  return (
    <section className="section catalog-page">
      <div className="section-heading channels-index-heading">
        <h2>Channels</h2>
        <p>
          Creators in the Clarify catalog — open a channel for its YouTube-style
          page with banner, bio, Home shelves, Videos, Shorts, and About.
        </p>
      </div>

      <div className="channel-directory">
        {channels.map((channel) => {
          const subs = formatSubscriberCount(channel.subscriber_count);
          const videoLabel = `${channel.video_count ?? 0} video${
            (channel.video_count ?? 0) === 1 ? "" : "s"
          }`;
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
                    <span>{videoLabel}</span>
                    {subs ? <span aria-hidden>·</span> : null}
                    {subs ? <span>{subs}</span> : null}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
