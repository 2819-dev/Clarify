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
        <p className="channel">{video.channel_name}</p>
        <h1>{video.title}</h1>
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
