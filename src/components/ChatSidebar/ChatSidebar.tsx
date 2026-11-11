"use client";

import {
  NARRATION_BUNDLE_PREFIX,
  narrationBundleSchema,
  readNarrationPlan,
} from "@/helpers/narration-clips";
import { Button } from "@/components/ui/button";
import { useGenerationApi } from "@/hooks/useGenerationApi";
import { cn } from "@/lib/utils";
import { estimateDurationInFrames } from "@/helpers/animation-duration";
import type {
  AssistantMetadata,
  ConversationContextMessage,
  ConversationMessage,
  EditOperation,
  ErrorCorrectionContext,
} from "@/types/conversation";
import {
  MODELS,
  type GenerationErrorType,
  type ModelId,
  type StreamPhase,
} from "@/types/generation";
import { PanelLeftClose, PanelLeftOpen, RotateCcw } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { ChatHistory } from "./ChatHistory";
import {
  ChatInput,
  VOICEOVER_INTENT,
  type VoiceoverRequest,
} from "./ChatInput";

type NarrationStatus = "idle" | "waiting" | "generating" | "ready" | "error";

export interface ChatSidebarRef {
  triggerGeneration: (options?: {
    silent?: boolean;
    attachedImages?: string[];
  }) => void;
}

interface ChatSidebarProps {
  messages: ConversationMessage[];
  pendingMessage?: {
    skills?: string[];
    startedAt: number;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  hasManualEdits: boolean;
  // Generation callbacks
  onCodeGenerated?: (code: string) => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  onStreamPhaseChange?: (phase: StreamPhase) => void;
  onError?: (
    error: string,
    type: GenerationErrorType,
    failedEdit?: EditOperation,
  ) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  currentCode?: string;
  conversationHistory?: ConversationContextMessage[];
  previouslyUsedSkills?: string[];
  isFollowUp?: boolean;
  onMessageSent?: (prompt: string, attachedImages?: string[]) => void;
  onGenerationComplete?: (
    code: string,
    summary?: string,
    metadata?: AssistantMetadata,
  ) => void;
  onErrorMessage?: (
    message: string,
    errorType: "edit_failed" | "api" | "validation",
  ) => void;
  errorCorrection?: ErrorCorrectionContext;
  onPendingMessage?: (skills?: string[]) => void;
  onClearPendingMessage?: () => void;
  // Frame capture props
  Component?: ComponentType | null;
  fps?: number;
  durationInFrames?: number;
  onDurationChange?: (duration: number) => void;
  currentFrame?: number;
  onNarrationAudioChange?: (audio: string | null) => void;
  onNarrationStatusChange?: (
    status: NarrationStatus,
    error?: string | null,
  ) => void;
}

export const ChatSidebar = forwardRef<ChatSidebarRef, ChatSidebarProps>(
  function ChatSidebar(
    {
      messages,
      pendingMessage,
      isCollapsed,
      onToggleCollapse,
      hasManualEdits,
      onCodeGenerated,
      onStreamingChange,
      onStreamPhaseChange,
      onError,
      prompt,
      onPromptChange,
      currentCode,
      conversationHistory = [],
      previouslyUsedSkills = [],
      isFollowUp = false,
      onMessageSent,
      onGenerationComplete,
      onErrorMessage,
      errorCorrection,
      onPendingMessage,
      onClearPendingMessage,
      Component,
      fps = 30,
      durationInFrames = 150,
      onDurationChange,
      currentFrame = 0,
      onNarrationAudioChange,
      onNarrationStatusChange,
    },
    ref,
  ) {
    const [model, setModel] = useState<ModelId>(MODELS[0].id);
    const promptRef = useRef<string>("");
    const narrationRequestRef = useRef(0);

    const { isLoading, runGeneration } = useGenerationApi();

    // Keep prompt ref in sync for use in triggerGeneration
    useEffect(() => {
      promptRef.current = prompt;
    }, [prompt]);

    const handleGeneration = async (options?: {
      silent?: boolean;
      attachedImages?: string[];
      voiceover?: VoiceoverRequest;
    }) => {
      const currentPrompt = promptRef.current;
      if (!currentPrompt.trim() || isLoading) return;
      const requestId = ++narrationRequestRef.current;
      const voiceover =
        options?.voiceover ??
        (VOICEOVER_INTENT.test(currentPrompt)
          ? { prompt: currentPrompt }
          : undefined);

      const generationDurationInFrames = isFollowUp
        ? durationInFrames
        : estimateDurationInFrames(currentPrompt, fps);
      if (!isFollowUp) onDurationChange?.(generationDurationInFrames);

      if (voiceover) {
        onNarrationAudioChange?.(null);
        onNarrationStatusChange?.("waiting", null);
      } else {
        onNarrationAudioChange?.(null);
        onNarrationStatusChange?.("idle", null);
      }

      onPromptChange(""); // Clear input immediately

      await runGeneration(
        currentPrompt,
        model,
        {
          currentCode,
          conversationHistory,
          previouslyUsedSkills,
          isFollowUp,
          hasManualEdits,
          errorCorrection,
          frameImages: options?.attachedImages,
          durationInFrames: generationDurationInFrames,
          fps,
        },
        {
          onCodeGenerated,
          onStreamingChange,
          onStreamPhaseChange,
          onMessageSent: (message, attachedImages) => {
            onMessageSent?.(message, attachedImages);
          },
          onGenerationComplete: (generatedCode, summary, metadata) => {
            onGenerationComplete?.(generatedCode, summary, metadata);
            if (voiceover) {
              onNarrationStatusChange?.("generating", null);
              void (async () => {
                try {
                  // Generated scenes, rather than the pre-generation estimate,
                  // determine the shared visual and speech timeline.
                  const clips = readNarrationPlan(generatedCode);
                  const sceneDuration = clips[clips.length - 1].endSeconds;
                  onDurationChange?.(Math.round(sceneDuration * fps));
                  const response = await fetch("/api/tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      prompt: voiceover.prompt,
                      videoCode: generatedCode,
                      durationSeconds: sceneDuration,
                    }),
                  });
                  if (!response.ok) {
                    const result = await response.json().catch(() => null);
                    throw new Error(
                      result?.error ||
                        `TTS request failed (${response.status})`,
                    );
                  }
                  if (
                    response.headers
                      .get("content-type")
                      ?.includes("application/json")
                  ) {
                    const bundle = narrationBundleSchema.parse(
                      await response.json(),
                    );
                    if (requestId !== narrationRequestRef.current) return;
                    onNarrationAudioChange?.(
                      NARRATION_BUNDLE_PREFIX + JSON.stringify(bundle),
                    );
                    onNarrationStatusChange?.("ready", null);
                    return;
                  }
                  const audioBlob = await response.blob();
                  const audioData = await new Promise<string>(
                    (resolve, reject) => {
                      const reader = new FileReader();
                      reader.onerror = () =>
                        reject(new Error("Could not read generated audio"));
                      reader.onload = () =>
                        typeof reader.result === "string"
                          ? resolve(reader.result)
                          : reject(new Error("Could not read generated audio"));
                      reader.readAsDataURL(audioBlob);
                    },
                  );
                  if (requestId !== narrationRequestRef.current) return;
                  onNarrationAudioChange?.(audioData);
                  onNarrationStatusChange?.("ready", null);
                } catch (error) {
                  if (requestId !== narrationRequestRef.current) return;
                  onNarrationStatusChange?.(
                    "error",
                    error instanceof Error
                      ? error.message
                      : "Could not generate voiceover",
                  );
                }
              })();
            }
          },
          onError: (message, type, failedEdit) => {
            onError?.(message, type, failedEdit);
            if (voiceover) {
              onNarrationStatusChange?.(
                "error",
                "Animation generation failed, so the voiceover was not generated.",
              );
            }
          },
          onErrorMessage,
          onPendingMessage,
          onClearPendingMessage,
        },
        options,
      );
    };

    // Expose triggerGeneration via ref
    useImperativeHandle(ref, () => ({
      triggerGeneration: handleGeneration,
    }));

    return (
      <div
        className={cn(
          "flex flex-col bg-background transition-all duration-300",
          isCollapsed
            ? "w-12 shrink-0"
            : "w-full h-[40vh] min-[1000px]:h-auto min-[1000px]:w-[40%] min-[1000px]:min-w-[320px] min-[1000px]:max-w-[520px] shrink",
        )}
      >
        {isCollapsed ? (
          <div className="flex justify-center px-4 mb-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          /* Chat area with subtle backdrop */
          <div className="flex-1 flex flex-col min-h-0 ml-12 mr-8 mb-8 rounded-xl bg-muted/20 border border-border/30 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-4 pb-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Assistant Chat
              </h2>
              <div className="flex items-center gap-1 -mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Start over? This will reset your animation.",
                      )
                    ) {
                      window.location.href = "/";
                    }
                  }}
                  title="Start over"
                  className="text-muted-foreground hover:text-foreground text-xs gap-1 h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleCollapse}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ChatHistory messages={messages} pendingMessage={pendingMessage} />

            {/* Input */}
            <ChatInput
              prompt={prompt}
              onPromptChange={onPromptChange}
              model={model}
              onModelChange={setModel}
              isLoading={isLoading}
              onSubmit={(attachedImages, voiceover) =>
                handleGeneration({ attachedImages, voiceover })
              }
              Component={Component}
              fps={fps}
              durationInFrames={durationInFrames}
              currentFrame={currentFrame}
            />
          </div>
        )}
      </div>
    );
  },
);
