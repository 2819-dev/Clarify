"use client";

import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";

export function ChannelModActions({
  channelSlug,
  channelName,
}: {
  channelSlug: string;
  channelName: string;
}) {
  const canModerate = useCanModerate();
  if (!canModerate) return null;
  return (
    <ModeratorMenu
      target="channel"
      channelSlug={channelSlug}
      label={channelName}
    />
  );
}
