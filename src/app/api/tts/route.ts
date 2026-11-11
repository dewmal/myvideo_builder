import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const allowedLanguages = [
  "Auto",
  "Chinese",
  "English",
  "German",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Russian",
  "Spanish",
  "French",
] as const;
const allowedLanguageSet = new Set<string>(allowedLanguages);

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  let text = typeof body.text === "string" ? body.text.trim() : "";
  let language = typeof body.language === "string" ? body.language : "Auto";
  let instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";

  // When a voiceover is requested in the main video prompt, draft spoken copy
  // from that request instead of requiring a second script field.
  if (!text && typeof body.prompt === "string" && body.prompt.trim()) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is needed to turn the video request into narration." },
        { status: 503 },
      );
    }
    try {
      const openai = createOpenAI({ apiKey });
      const result = await generateObject({
        model: openai("gpt-5.2"),
        system: `Create voiceover narration from the user's video creation request. Return only the spoken words, the best matching supported language, and a concise Qwen voice description. If the request contains explicit quoted voiceover copy, preserve those words. Otherwise write natural narration that complements the requested video, using the requested facts, tone, and voice direction. Do not read out animation, camera, color, timing, or other production instructions. Keep it concise for a short video (about 25–55 spoken words unless the user specifies a different duration). Do not invent factual claims.`,
        prompt: body.prompt.trim(),
        schema: z.object({
          text: z.string().min(1).max(10000),
          language: z.enum(allowedLanguages),
          instructions: z.string().min(1).max(1000),
        }),
      });
      text = result.object.text.trim();
      language = result.object.language;
      instructions = result.object.instructions.trim();
    } catch (error) {
      console.error("Voiceover drafting failed:", error);
      return NextResponse.json(
        { error: "Could not prepare voiceover from the video request." },
        { status: 502 },
      );
    }
  }

  if (!text || text.length > 10000) {
    return NextResponse.json(
      { error: "Text is required and must be 10,000 characters or fewer." },
      { status: 400 },
    );
  }
  if (!allowedLanguageSet.has(language)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 });
  }

  const serviceUrl = (process.env.QWEN_TTS_BASE_URL || "http://127.0.0.1:8091").replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${serviceUrl}/v1/audio/speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: text, language, instructions }),
      signal: AbortSignal.timeout(280_000),
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Qwen3-TTS took too long to respond."
      : `Could not reach the local Qwen3-TTS Python service at ${serviceUrl}. Start it and try again.`;
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      { error: detail.slice(0, 500) || `Qwen3-TTS returned HTTP ${response.status}.` },
      { status: 502 },
    );
  }

  const audio = await response.arrayBuffer();
  if (audio.byteLength === 0 || audio.byteLength > 40 * 1024 * 1024) {
    return NextResponse.json({ error: "Qwen3-TTS returned an empty or oversized audio file." }, { status: 502 });
  }

  return new Response(audio, {
    headers: {
      "Content-Type": response.headers.get("content-type") || "audio/wav",
      "Content-Disposition": 'attachment; filename="qwen3-narration.wav"',
      "Cache-Control": "no-store",
    },
  });
}
