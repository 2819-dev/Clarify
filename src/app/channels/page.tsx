import Link from "next/link";
import { listChannels } from "@/lib/channels";

export const dynamic = "force-dynamic";

export default async function ChannelsIndexPage() {
  const channels = await listChannels();

  return (
    <section className="section catalog-page">
      <div className="section-heading">
        <h2>Channels</h2>
        <p>Creators and collections in the Clarify catalog.</p>
      </div>
      <div className="entity-grid">
        {channels.map((channel) => (
          <Link
            key={channel.id}
            href={`/channels/${channel.slug}`}
            className="entity-tile channel-tile"
          >
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
            <div>
              <h3>{channel.name}</h3>
              <p>{channel.description}</p>
              <span className="entity-count">
                {channel.video_count ?? 0} video
                {(channel.video_count ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
