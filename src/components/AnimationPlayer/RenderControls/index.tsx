"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRendering } from "@/helpers/use-rendering";
import { DownloadButton } from "./DownloadButton";
import { ErrorComp } from "./Error";
import { ProgressBar } from "./ProgressBar";
import { NarrationControls } from "@/components/AnimationPlayer/NarrationControls";

export const RenderControls: React.FC<{
  code: string;
  durationInFrames: number;
  fps: number;
  narrationAudio: string | null;
  onNarrationAudioChange: (audio: string | null) => void;
}> = ({ code, durationInFrames, fps, narrationAudio, onNarrationAudioChange }) => {
  const { renderMedia, state, undo } = useRendering({
    code,
    durationInFrames,
    fps,
    narrationAudio: narrationAudio || undefined,
  });
  const previousPropsRef = useRef({ code, durationInFrames, fps, narrationAudio });

  // Reset rendering state when code, duration, or fps changes
  useEffect(() => {
    const prev = previousPropsRef.current;
    const hasChanged =
      prev.code !== code ||
      prev.durationInFrames !== durationInFrames ||
      prev.fps !== fps ||
      prev.narrationAudio !== narrationAudio;

    if (hasChanged && state.status !== "init") {
      undo();
    }
    previousPropsRef.current = { code, durationInFrames, fps, narrationAudio };
  }, [code, durationInFrames, fps, narrationAudio, state.status, undo]);

  if (
    state.status === "init" ||
    state.status === "invoking" ||
    state.status === "error"
  ) {
    return (
      <div className="flex items-start gap-3">
        <Button
          disabled={state.status === "invoking" || !code}
          loading={state.status === "invoking"}
          onClick={renderMedia}
        >
          <Download className="w-4 h-4 mr-2" />
          {state.status === "invoking"
            ? "Starting render..."
            : "Render & Download"}
        </Button>
        {state.status === "error" && (
          <ErrorComp message={state.error.message} />
        )}
        <NarrationControls
          narrationAudio={narrationAudio}
          onNarrationAudioChange={onNarrationAudioChange}
        />
      </div>
    );
  }

  if (state.status === "rendering") {
    return (
      <div className="flex items-start gap-3">
        <ProgressBar progress={state.progress} />
        <NarrationControls
          narrationAudio={narrationAudio}
          onNarrationAudioChange={onNarrationAudioChange}
        />
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div className="flex items-start gap-3">
        <DownloadButton state={state} undo={undo} />
        <NarrationControls
          narrationAudio={narrationAudio}
          onNarrationAudioChange={onNarrationAudioChange}
        />
      </div>
    );
  }

  return null;
};
