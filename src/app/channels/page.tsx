import { Suspense } from "react";
import { CategoryRail } from "@/components/CategoryRail";
import { CatalogSearch } from "@/components/CatalogSearch";
import { ChannelCard } from "@/components/ChannelCard";
import { listCategories } from "@/lib/categories";
import {
  formatSubscriberCount,
  listChannels,
} from "@/lib/channels";
import { contentModeAdjective } from "@/lib/content-mode";
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
            {filtered.length} {contentModeAdjective(mode)} channel
            {filtered.length === 1 ? "" : "s"}
            {query ? ` matching “${q?.trim()}”` : ""}. Subscribe to keep
            favorites close at hand.
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
        <p className="empty-state">
          No channels matched your search. Try a different name.
        </p>
      ) : (
        <div className="channel-directory">
          {filtered.map((channel) => {
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
      )}
    </div>
  );
}
