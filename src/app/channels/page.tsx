import Link from "next/link";
import { CategoryRail } from "@/components/CategoryRail";
import { CatalogSearch } from "@/components/CatalogSearch";
import { Suspense } from "react";
import { listCategories } from "@/lib/categories";
import {
  formatSubscriberCount,
  listChannels,
} from "@/lib/channels";
import { contentModeLabel } from "@/lib/content-mode";
import { getContentMode } from "@/lib/content-mode-server";

export const dynamic = "force-dynamic";

export default async function ChannelsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const mode = await getContentMode();
  const [channels, categories] = await Promise.all([
    listChannels(mode),
    listCategories(mode),
  ]);

  const query = q?.trim().toLowerCase() || "";
  const filtered = query
    ? channels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(query) ||
          ch.slug.includes(query) ||
          (ch.description || "").toLowerCase().includes(query),
      )
    : channels;

  return (
    <div className="yt-home">
      <CategoryRail categories={categories} />
      <div className="yt-home-meta">
        <div>
          <h1 className="yt-home-title">Channels</h1>
          <p className="yt-home-sub">
            {contentModeLabel(mode)} — {filtered.length} channel
            {filtered.length === 1 ? "" : "s"} with real banners, avatars, and
            video shelves. Subscribe on a channel to pin it in your sidebar.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <CatalogSearch
          action="/channels"
          placeholder="Search channels…"
        />
      </Suspense>

      {filtered.length === 0 ? (
        <p className="empty-state">No channels matched that search.</p>
      ) : (
        <div className="channel-directory">
          {filtered.map((channel) => {
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
                      {!channel.is_jewish ? (
                        <>
                          <span aria-hidden>·</span>
                          <span>Filtered</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
