import {
  NARRATION_BUNDLE_PREFIX,
  narrationBundleSchema,
} from "@/helpers/narration-clips";
import { useEffect, useState } from "react";
import {
  Audio,
  Sequence,
  cancelRender,
  continueRender,
  delayRender,
  useVideoConfig,
} from "remotion";

// Use the same timeline fitting for the Player and the exported composition.
const FittedAudio: React.FC<{ src: string; seconds: number }> = ({
  src,
  seconds,
}) => {
  const [duration, setDuration] = useState<number | null>(null);
  const [handle] = useState(() => delayRender("Reading narration duration"));

  useEffect(() => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        cancelRender(new Error("Could not determine narration duration"));
        return;
      }
      setDuration(audio.duration);
      continueRender(handle);
    };
    audio.onerror = () =>
      cancelRender(new Error("Could not load narration audio"));
    audio.src = src;
    return () => {
      audio.onloadedmetadata = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
      continueRender(handle);
    };
  }, [src, handle]);

  if (duration === null) return null;
  return <Audio src={src} playbackRate={duration / seconds} />;
};

export const SyncedNarration: React.FC<{ src: string }> = ({ src }) => {
  const { durationInFrames, fps } = useVideoConfig();
  if (!src.startsWith(NARRATION_BUNDLE_PREFIX)) {
    return <FittedAudio key={src} src={src} seconds={durationInFrames / fps} />;
  }
  const { clips } = narrationBundleSchema.parse(
    JSON.parse(src.slice(NARRATION_BUNDLE_PREFIX.length)),
  );
  const originalDuration = clips[clips.length - 1].endSeconds;
  const scale = durationInFrames / originalDuration;
  return (
    <>
      {clips.map((clip, index) => {
        const start = Math.round(clip.startSeconds * scale);
        const end = Math.round(clip.endSeconds * scale);
        return (
          <Sequence
            key={index}
            from={start}
            durationInFrames={Math.max(1, end - start)}
          >
            <FittedAudio
              key={clip.audio}
              src={clip.audio}
              seconds={Math.max(1, end - start) / fps}
            />
          </Sequence>
        );
      })}
    </>
  );
};
