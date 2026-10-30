import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { VideoTile } from "@/components/VideoTile";
import { getChannel } from "@/lib/channels";
import { listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const channel = await getChannel(slug);
  if (!channel || !(channel.video_count && channel.video_count > 0)) {
    notFound();
  }

  const videos = await listActiveVideos({ channelSlug: slug, q });

  return (
    <section className="section catalog-page">
      <div className="channel-hero">
        {channel.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.avatar_url} alt="" className="channel-avatar lg" />
        ) : (
          <span className="channel-avatar lg placeholder" aria-hidden />
        )}
        <div className="section-heading">
          <p className="eyebrow">Channel</p>
          <h2>{channel.name}</h2>
          <p>{channel.description}</p>
          <div className="hero-actions">
            {channel.youtube_url ? (
              <a
                className="btn-secondary"
                href={channel.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube channel
              </a>
            ) : null}
            <Link href="/channels" className="btn-ghost">
              All channels
            </Link>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <CatalogSearch
          action={`/channels/${slug}`}
          placeholder="Search this channel…"
        />
      </Suspense>

      {videos.length === 0 ? (
        <p className="empty-state">No videos matched on this channel.</p>
      ) : (
        <div className="video-grid">
          {videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      )}
    </section>
  );
}
