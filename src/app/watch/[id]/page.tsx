import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportForm } from "@/components/ReportForm";
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
      <div className="player-frame">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtube_id}?rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

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
