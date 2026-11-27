"use client";

import { Button } from "@ui-sdk/react/button";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";

export function StoryVideo({
  videoId,
  startSeconds,
  title,
}: {
  videoId: string;
  startSeconds: number;
  title: string;
}) {
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const encodedVideoId = encodeURIComponent(videoId);
  const params = new URLSearchParams({ autoplay: "1", playsinline: "1" });
  if (startSeconds > 0) params.set("start", String(startSeconds));

  useLayoutEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.focus();

    // Next.js puede conservar el detalle oculto al navegar; el iframe seguiría reproduciendo.
    return () => setIsPlayerOpen(false);
  }, [isPlayerOpen]);

  return (
    <div className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-xl bg-black has-[iframe:focus-visible]:outline-2 has-[iframe:focus-visible]:outline-offset-3 has-[iframe:focus-visible]:outline-ring">
      {isPlayerOpen ? (
        <iframe
          ref={playerRef}
          src={`https://www.youtube-nocookie.com/embed/${encodedVideoId}?${params}`}
          title={`Reproductor de YouTube: ${title}`}
          allow="autoplay; encrypted-media; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <Button onClick={() => setIsPlayerOpen(true)} className="player-trigger">
          <Image
            src={`https://i.ytimg.com/vi/${encodedVideoId}/hqdefault.jpg`}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
          <span className="player-trigger-label relative">
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="size-4">
              <path d="M6 3.5v13L16 10 6 3.5Z" />
            </svg>
            Reproducir Historia
          </span>
        </Button>
      )}
    </div>
  );
}
