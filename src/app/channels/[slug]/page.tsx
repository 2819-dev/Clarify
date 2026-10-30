import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CatalogSearch } from "@/components/CatalogSearch";
import { CategoryChips } from "@/components/CategoryChips";
import { FormatTabs } from "@/components/FormatTabs";
import { VideoTile } from "@/components/VideoTile";
import {
  formatSubscriberCount,
  getChannel,
  listChannelCategories,
} from "@/lib/channels";
import { countShorts, listActiveVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; category?: string; format?: string }>;
}) {
  const { slug } = await params;
  const { q, category, format: formatRaw } = await searchParams;
  const format =
    formatRaw === "shorts" || formatRaw === "videos" ? formatRaw : "all";
  const channel = await getChannel(slug);
  if (!channel || !(channel.video_count && channel.video_count > 0)) {
    notFound();
  }

  const [videos, categories, shortsCount] = await Promise.all([
    listActiveVideos({ channelSlug: slug, q, category, format }),
    listChannelCategories(slug),
    countShorts(slug),
  ]);

  const subs = formatSubscriberCount(channel.subscriber_count);
  const videoLabel = `${channel.video_count} video${
    channel.video_count === 1 ? "" : "s"
  } on Clarify`;

  return (
    <section className="channel-page">
      <div className="channel-profile">
        <div
          className="channel-banner"
          style={
            channel.banner_url
              ? { backgroundImage: `url(${channel.banner_url})` }
              : undefined
          }
          role="img"
          aria-label={`${channel.name} banner`}
        />

        <div className="channel-profile-main">
          {channel.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={channel.avatar_url}
              alt=""
              className="channel-avatar xl"
            />
          ) : (
            <span className="channel-avatar xl placeholder" aria-hidden />
          )}

          <div className="channel-profile-copy">
            <p className="eyebrow">Channel</p>
            <h1 className="channel-display-name">{channel.name}</h1>
            <div className="channel-meta-row">
              <span>{videoLabel}</span>
              {subs ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{subs}</span>
                </>
              ) : null}
              {shortsCount > 0 ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{shortsCount} Shorts</span>
                </>
              ) : null}
            </div>
            <p className="channel-bio">{channel.description}</p>
            <div className="hero-actions channel-profile-actions">
              {channel.youtube_url ? (
                <a
                  className="btn-secondary"
                  href={channel.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open on YouTube
                </a>
              ) : null}
              <Link href="/channels" className="btn-ghost">
                All channels
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="channel-videos section">
        <div className="section-heading">
          <h2>Videos</h2>
          <p>
            {category
              ? `Showing ${categories.find((c) => c.slug === category)?.name ?? category} from this channel.`
              : "Browse this channel’s Clarify collection — filter by format or category."}
          </p>
        </div>

        <FormatTabs
          basePath={`/channels/${slug}`}
          active={format}
          q={q}
          category={category}
          shortsCount={shortsCount}
        />

        <Suspense fallback={null}>
          <CatalogSearch
            action={`/channels/${slug}`}
            placeholder="Search this channel…"
          />
        </Suspense>

        {categories.length > 1 ? (
          <CategoryChips
            categories={categories}
            activeSlug={category}
            basePath={`/channels/${slug}`}
            preserveQuery={q}
            preserveFormat={format}
            mode="query"
          />
        ) : null}

        {videos.length === 0 ? (
          <p className="empty-state">No videos matched on this channel.</p>
        ) : (
          <div className={`video-grid ${format === "shorts" ? "shorts-grid" : ""}`}>
            {videos.map((video) => (
              <VideoTile key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
