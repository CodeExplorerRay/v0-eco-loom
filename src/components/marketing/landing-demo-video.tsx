'use client';

import { useEffect, useRef } from 'react';

export function LandingDemoVideo() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.loop = true;
    video.muted = true;

    const attemptPlayback = () => {
      void video.play().catch(() => {
        // Ignore autoplay rejections; the element remains muted and loop-ready.
      });
    };

    attemptPlayback();
    video.addEventListener('loadeddata', attemptPlayback);
    video.addEventListener('ended', attemptPlayback);
    document.addEventListener('visibilitychange', attemptPlayback);

    return () => {
      video.removeEventListener('loadeddata', attemptPlayback);
      video.removeEventListener('ended', attemptPlayback);
      document.removeEventListener('visibilitychange', attemptPlayback);
    };
  }, []);

  return (
    <div
      className="overflow-hidden rounded-[1.25rem] border border-emerald-100 bg-slate-950 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.75)]"
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        ref={videoRef}
        aria-label="Eco-Loom product demo"
        autoPlay
        className="pointer-events-none aspect-[16/10] h-full w-full select-none object-cover"
        controls={false}
        controlsList="nodownload noplaybackrate nofullscreen noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/demo-video/eco-loom-demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
