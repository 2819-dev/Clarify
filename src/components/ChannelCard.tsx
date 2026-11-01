"use client";

import Link from "next/link";
import { ModeratorMenu } from "@/components/ModeratorMenu";
import { useCanModerate } from "@/components/ModerationContext";
import type { Channel } from "@/lib/db";

export function ChannelCard({
  channel,
  subs,
  videoLabel,
}: {
  channel: Channel;
  subs: string | null;
  videoLabel: string;
}) {
  const canModerate = useCanModerate();

  return (
    <div className="channel-card-wrap">
      <Link href={`/channels/${channel.slug}`} className="channel-card">
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
              {subs ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{subs}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      {canModerate ? (
        <div className="channel-card-mod">
          <ModeratorMenu
            target="channel"
            channelSlug={channel.slug}
            label={channel.name}
          />
        </div>
      ) : null}
    </div>
  );
}
