"use client";

import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";

export function WatchModActions({
  videoId,
  videoTitle,
  channelSlug,
  channelName,
}: {
  videoId: string;
  videoTitle: string;
  channelSlug?: string | null;
  channelName?: string | null;
}) {
  const canModerate = useCanModerate();
  if (!canModerate) return null;
  return (
    <div className="watch-mod-actions">
      <ModeratorMenu target="video" videoId={videoId} label={videoTitle} />
      {channelSlug ? (
        <ModeratorMenu
          target="channel"
          channelSlug={channelSlug}
          label={channelName || channelSlug}
        />
      ) : null}
    </div>
  );
}
