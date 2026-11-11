import { z } from "zod";

export const narrationClipSchema = z.object({
  startSeconds: z.number().finite().min(0),
  endSeconds: z.number().finite().positive(),
  text: z.string().trim().min(1).max(10000),
});
export const narrationPlanSchema = z.array(narrationClipSchema).min(1).max(75);
export const narrationBundleSchema = z.object({
  clips: z
    .array(
      narrationClipSchema.extend({
        audio: z.string().startsWith("data:audio/"),
      }),
    )
    .min(1)
    .max(75),
});
export const NARRATION_BUNDLE_PREFIX = "narration-clips:";

export function readNarrationPlan(code: string) {
  const match = code.match(/const\s+NARRATION_CLIPS\s*=\s*(\[[\s\S]*?\])\s*;/);
  if (!match)
    throw new Error(
      "The video is missing its clip narration plan. Regenerate the video with narration.",
    );
  const clips = narrationPlanSchema.parse(JSON.parse(match[1]));
  let end = 0;
  for (const clip of clips) {
    if (
      Math.abs(clip.startSeconds - end) > 0.001 ||
      clip.endSeconds <= clip.startSeconds
    ) {
      throw new Error(
        "Narration clips must have contiguous, increasing scene boundaries.",
      );
    }
    end = clip.endSeconds;
  }
  if (end > 300)
    throw new Error("Narrated videos must be 300 seconds or shorter.");
  return clips;
}
