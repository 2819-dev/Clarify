import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/CommentSection";
import { LikeButton } from "@/components/LikeButton";
import { RelatedVideos } from "@/components/RelatedVideos";
import { ReportForm } from "@/components/ReportForm";
import { ShareButton } from "@/components/ShareButton";
import { SubscribeButton } from "@/components/SubscribeButton";
import { WatchActivityTracker } from "@/components/WatchActivityTracker";
import { WatchDescription } from "@/components/WatchDescription";
import { WatchModActions } from "@/components/WatchModActions";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { getContentMode } from "@/lib/content-mode-server";
import {
  getVideoLikeState,
  isSubscribed,
  listComments,
} from "@/lib/engagement";
import { consumerDescription } from "@/lib/description";
import { COMMENTS_ENABLED } from "@/lib/features";
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
    COMMENTS_ENABLED ? listComments(video.id) : Promise.resolve([]),
    user && video.channel_slug
      ? isSubscribed(user.id, video.channel_slug)
      : Promise.resolve(false),
    listRelatedVideos(video, mode, 18),
  ]);

  const when = video.published_at || null;
  const initial = (video.channel_name.trim()[0] || "?").toUpperCase();
  const isShort = Boolean(video.is_short);
  const description = consumerDescription(video.description);

  const channelAvatar = video.channel_avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={video.channel_avatar_url}
      alt=""
      className={isShort ? "shorts-meta-avatar" : "watch-owner-avatar"}
    />
  ) : (
    <span
      className={
        isShort
          ? "shorts-meta-avatar fallback"
          : "watch-owner-avatar fallback"
      }
      aria-hidden
    >
      {initial}
    </span>
  );

  const subscribe =
    video.channel_slug ? (
      <SubscribeButton
        channelSlug={video.channel_slug}
        channelName={video.channel_name}
        initialSubscribed={subscribed}
        signedIn={Boolean(user)}
      />
    ) : null;

  return (
    <article className={`watch-page ${isShort ? "is-short" : ""}`}>
      <WatchActivityTracker
        videoId={video.id}
        channelSlug={video.channel_slug}
        categorySlug={video.category_slug}
      />

      <div className="watch-primary">
        {isShort ? (
          <div className="shorts-stage">
            <div className="shorts-stage-frame">
              <YoutubePlayer
                youtubeId={video.youtube_id}
                title={video.title}
                embeddable={video.embeddable}
                isShort
              />
              <div className="shorts-stage-meta">
                <div className="shorts-meta-channel">
                  {video.channel_slug ? (
                    <Link
                      href={`/channels/${video.channel_slug}`}
                      className="shorts-meta-avatar-link"
                    >
                      {channelAvatar}
                    </Link>
                  ) : (
                    channelAvatar
                  )}
                  <div className="shorts-meta-channel-copy">
                    {video.channel_slug ? (
                      <Link
                        href={`/channels/${video.channel_slug}`}
                        className="shorts-meta-name"
                        title={
                          video.channel_username
                            ? `@${video.channel_username}`
                            : undefined
                        }
                      >
                        {video.channel_name}
                      </Link>
                    ) : (
                      <span className="shorts-meta-name">{video.channel_name}</span>
                    )}
                  </div>
                  {subscribe}
                </div>
                <h1
                  className="shorts-meta-title"
                  title={when ? formatAbsoluteTime(when) : undefined}
                >
                  {video.title}
                </h1>
              </div>
            </div>

            <aside className="shorts-stage-actions" aria-label="Video actions">
              <LikeButton
                videoId={video.id}
                initialLiked={likeState.liked}
                initialCount={likeState.count}
                signedIn={Boolean(user)}
                layout="stack"
              />
              <ShareButton title={video.title} layout="stack" />
            </aside>
          </div>
        ) : (
          <YoutubePlayer
            youtubeId={video.youtube_id}
            title={video.title}
            embeddable={video.embeddable}
            isShort={false}
          />
        )}

        <div className={`watch-copy${isShort ? " is-short-copy" : ""}`}>
          {!isShort ? (
            <>
              <h1 className="watch-title">{video.title}</h1>
              {when ? (
                <p className="watch-title-meta">
                  <time dateTime={when} title={formatAbsoluteTime(when)}>
                    {formatRelativeTime(when)}
                  </time>
                </p>
              ) : null}

              <div className="watch-owner-row">
                <div className="watch-owner">
                  {video.channel_slug ? (
                    <Link
                      href={`/channels/${video.channel_slug}`}
                      className="watch-owner-avatar-link"
                    >
                      {channelAvatar}
                    </Link>
                  ) : (
                    channelAvatar
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
                  {subscribe}
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
            </>
          ) : (
            <div className="watch-engage is-short-engage">
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
          )}

          {!isShort ? (
            <WatchDescription
              text={description}
              meta={
                <div className="watch-tags">
                  {video.category_slug ? (
                    <Link
                      href={`/categories/${video.category_slug}`}
                      className="watch-category"
                    >
                      {video.category_name || video.category}
                    </Link>
                  ) : null}
                </div>
              }
            />
          ) : description ? (
            <WatchDescription text={description} />
          ) : null}
        </div>

        {COMMENTS_ENABLED ? (
          <CommentSection
            videoId={video.id}
            initialComments={comments}
            signedIn={Boolean(user)}
          />
        ) : null}
      </div>

      <RelatedVideos videos={related} preferShorts={isShort} />
    </article>
  );
}
