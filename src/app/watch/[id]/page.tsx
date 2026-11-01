import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/CommentSection";
import { LikeButton } from "@/components/LikeButton";
import { RelatedVideos } from "@/components/RelatedVideos";
import { ReportForm } from "@/components/ReportForm";
import { ShareButton } from "@/components/ShareButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { WatchActivityTracker } from "@/components/WatchActivityTracker";
import { WatchModActions } from "@/components/WatchModActions";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { getContentMode } from "@/lib/content-mode-server";
import {
  getVideoLikeState,
  isSubscribed,
  listComments,
} from "@/lib/engagement";
import { formatAbsoluteTime, formatRelativeTime } from "@/lib/time";
import { getCurrentUser } from "@/lib/user-auth";
import { getActiveVideo, listRelatedVideos } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getActiveVideo(id);
  if (!video) notFound();

  const mode = await getContentMode();
  const user = await getCurrentUser();
  const [likeState, comments, subscribed, related] = await Promise.all([
    getVideoLikeState(video.id, user?.id),
    listComments(video.id),
    user && video.channel_slug
      ? isSubscribed(user.id, video.channel_slug)
      : Promise.resolve(false),
    listRelatedVideos(video, mode, 18),
  ]);

  const when = video.published_at || video.created_at;
  const initial = (video.channel_name.trim()[0] || "?").toUpperCase();

  return (
    <article className={`watch-page ${video.is_short ? "is-short" : ""}`}>
      <WatchActivityTracker
        channelSlug={video.channel_slug}
        categorySlug={video.category_slug}
      />

      <div className="watch-primary">
        <YoutubePlayer
          youtubeId={video.youtube_id}
          title={video.title}
          embeddable={video.embeddable}
          isShort={Boolean(video.is_short)}
        />

        <div className="watch-copy">
          <h1 className="watch-title">{video.title}</h1>
          <p className="watch-title-meta">
            <time dateTime={when} title={formatAbsoluteTime(when)}>
              {formatRelativeTime(when)}
            </time>
            {video.category_name || video.category ? (
              <>
                <span aria-hidden>·</span>
                <span>{video.category_name || video.category}</span>
              </>
            ) : null}
          </p>

          <div className="watch-owner-row">
            <div className="watch-owner">
              {video.channel_slug ? (
                <Link
                  href={`/channels/${video.channel_slug}`}
                  className="watch-owner-avatar-link"
                >
                  {video.channel_avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={video.channel_avatar_url}
                      alt=""
                      className="watch-owner-avatar"
                    />
                  ) : (
                    <span className="watch-owner-avatar fallback" aria-hidden>
                      {initial}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="watch-owner-avatar fallback" aria-hidden>
                  {initial}
                </span>
              )}
              <div className="watch-owner-copy">
                {video.channel_slug ? (
                  <Link
                    href={`/channels/${video.channel_slug}`}
                    className="channel"
                  >
                    {video.channel_name}
                  </Link>
                ) : (
                  <p className="channel">{video.channel_name}</p>
                )}
                {video.channel_username ? (
                  <div className="watch-byline">
                    <Link
                      href={`/@${video.channel_username}`}
                      className="watch-handle"
                    >
                      @{video.channel_username}
                    </Link>
                  </div>
                ) : null}
              </div>
              {video.channel_slug ? (
                <SubscribeButton
                  channelSlug={video.channel_slug}
                  channelName={video.channel_name}
                  initialSubscribed={subscribed}
                  signedIn={Boolean(user)}
                />
              ) : null}
            </div>

            <div className="watch-engage">
              <LikeButton
                videoId={video.id}
                initialLiked={likeState.liked}
                initialCount={likeState.count}
                signedIn={Boolean(user)}
              />
              <ShareButton title={video.title} />
              <WatchModActions
                videoId={video.id}
                videoTitle={video.title}
                channelSlug={video.channel_slug}
                channelName={video.channel_name}
              />
              <div className="watch-report-inline">
                <ReportForm videoId={video.id} />
              </div>
            </div>
          </div>

          <div className="watch-desc-card">
            <div className="watch-tags">
              {video.is_short ? (
                <span className="watch-short-pill">Shorts</span>
              ) : null}
              {video.category_slug ? (
                <Link
                  href={`/categories/${video.category_slug}`}
                  className="watch-category"
                >
                  {video.category_name || video.category}
                </Link>
              ) : null}
            </div>
            {video.description ? (
              <p className="desc">{video.description}</p>
            ) : (
              <p className="desc is-muted">No description available.</p>
            )}
          </div>
        </div>

        <CommentSection
          videoId={video.id}
          initialComments={comments}
          signedIn={Boolean(user)}
        />
      </div>

      <RelatedVideos
        videos={related}
        preferShorts={Boolean(video.is_short)}
      />
    </article>
  );
}
