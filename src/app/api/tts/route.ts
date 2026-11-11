import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const allowedLanguages = new Set([
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
]);

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
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const language = typeof body.language === "string" ? body.language : "Auto";
  const instructions = typeof body.instructions === "string" ? body.instructions.trim() : "";

  if (!text || text.length > 10000) {
    return NextResponse.json(
      { error: "Text is required and must be 10,000 characters or fewer." },
      { status: 400 },
    );
  }
  if (!allowedLanguages.has(language)) {
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
