import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/ReportForm";
import { YoutubePlayer } from "@/components/YoutubePlayer";
import { getActiveVideo } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getActiveVideo(id);
  if (!video) notFound();

  return (
    <article className="watch-layout">
      <YoutubePlayer
        youtubeId={video.youtube_id}
        title={video.title}
        embeddable={video.embeddable}
      />

      <div className="watch-copy">
        {video.channel_slug ? (
          <Link href={`/channels/${video.channel_slug}`} className="channel">
            {video.channel_name}
          </Link>
        ) : (
          <p className="channel">{video.channel_name}</p>
        )}
        <h1>{video.title}</h1>
        {video.category_slug ? (
          <p className="watch-category">
            <Link href={`/categories/${video.category_slug}`}>
              {video.category_name || video.category_slug}
            </Link>
          </p>
        ) : null}
        {video.description ? <p className="desc">{video.description}</p> : null}
      </div>

      <div className="watch-toolbar">
        <Link href="/#catalog" className="btn-ghost">
          ← Back to catalog
        </Link>
        <ReportForm videoId={video.id} />
      </div>
    </article>
  );
}
