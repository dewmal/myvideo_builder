const DEFAULT_DURATION_SECONDS = 8;
const WORDS_PER_MINUTE = 150;
const MAX_DURATION_SECONDS = 5 * 60;

export function estimateDurationInFrames(prompt: string, fps: number): number {
  const rangeMatches = Array.from(
    prompt.matchAll(/\b(\d{1,2}):(\d{2})\s*(?:[-–—]|to)\s*(\d{1,2}):(\d{2})\b/gi),
  );

  let durationSeconds = DEFAULT_DURATION_SECONDS;
  const lastRange = rangeMatches.at(-1);
  if (lastRange) {
    durationSeconds = Number(lastRange[3]) * 60 + Number(lastRange[4]);
  } else {
    const requestedDurations = Array.from(
      prompt.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/gi),
    );
    const requestedDuration = requestedDurations.at(-1);

    if (requestedDuration) {
      durationSeconds = Number(requestedDuration[1]) * 60;
    } else {
      const seconds = Array.from(
        prompt.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/gi),
      ).at(-1);
      const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
      if (seconds) {
        durationSeconds = Number(seconds[1]);
      } else if (wordCount > 80) {
        durationSeconds = (wordCount / WORDS_PER_MINUTE) * 60;
      }
    }
  }

  return Math.round(
    Math.max(DEFAULT_DURATION_SECONDS, Math.min(durationSeconds, MAX_DURATION_SECONDS)) *
      fps,
  );
}
