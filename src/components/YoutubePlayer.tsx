"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ClarifyLogo } from "@/components/ClarifyLogo";

type Props = {
  youtubeId: string;
  title: string;
  /** When false, skip the iframe and show the Clarify overlay immediately. */
  embeddable?: boolean;
};

type YtPlayer = { destroy: () => void };

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: () => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYoutubeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]',
        )
      ) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);
      }
      const poll = window.setInterval(() => {
        if (window.YT?.Player) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
    });
  }
  return youtubeApiPromise;
}

/** YouTube IFrame API codes where Clarify should replace the player chrome. */
function isEmbedFailure(code: number) {
  // 2 invalid param, 5 HTML5/player error, 100 not found, 101/150 embedding disabled
  return [2, 5, 100, 101, 150].includes(code);
}

export function YoutubePlayer({
  youtubeId,
  title,
  embeddable = true,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `clarify-yt-${reactId}`;
  const playerRef = useRef<YtPlayer | null>(null);
  const [failed, setFailed] = useState(!embeddable);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!embeddable) {
      setFailed(true);
      setReady(false);
      return;
    }

    let cancelled = false;
    let readyFlag = false;
    let watchdog: number | undefined;

    async function mount() {
      setFailed(false);
      setReady(false);
      await loadYoutubeApi();
      if (cancelled || !window.YT?.Player) return;

      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }

      playerRef.current = new window.YT.Player(elementId, {
        videoId: youtubeId,
        width: "100%",
        height: "100%",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            readyFlag = true;
            setReady(true);
          },
          onError: (event) => {
            if (!cancelled && isEmbedFailure(event.data)) {
              setFailed(true);
            }
          },
        },
      });

      // Restricted videos sometimes show YouTube's unavailable UI without a
      // reliable onError. If onReady never fires, swap to the Clarify overlay.
      watchdog = window.setTimeout(() => {
        if (!cancelled && !readyFlag) {
          setFailed(true);
        }
      }, 9000);
    }

    mount();

    return () => {
      cancelled = true;
      if (watchdog) window.clearTimeout(watchdog);
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore teardown races
      }
      playerRef.current = null;
    };
  }, [youtubeId, embeddable, elementId]);

  const watchUrl = `https://www.youtube.com/watch?v=${youtubeId}`;

  if (failed) {
    return (
      <div className="player-frame clarify-unavailable" role="status">
        <div className="clarify-unavailable-inner">
          <ClarifyLogo href={null} size="md" variant="on-dark" />
          <h2>This video is not available on Clarify</h2>
          <p>
            YouTube isn’t allowing playback here. You can still open the original
            video on YouTube.
          </p>
          <a
            className="btn-primary"
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`player-frame ${ready ? "is-ready" : "is-loading"}`}
      aria-label={title}
    >
      <div id={elementId} className="yt-mount" />
    </div>
  );
}
