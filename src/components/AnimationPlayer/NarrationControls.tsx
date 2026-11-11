"use client";

import { Download, Mic2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const LANGUAGES = [
  "Auto",
  "English",
  "Chinese",
  "Japanese",
  "Korean",
  "German",
  "French",
  "Russian",
  "Portuguese",
  "Spanish",
  "Italian",
];

export const NarrationControls: React.FC<{
  narrationAudio: string | null;
  onNarrationAudioChange: (audio: string | null) => void;
}> = ({ narrationAudio, onNarrationAudioChange }) => {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Auto");
  const [instructions, setInstructions] = useState(
    "A warm, clear speaking voice with a calm, natural delivery.",
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (!text.trim() || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          language,
          instructions: instructions.trim(),
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || `TTS request failed (${response.status})`);
      }
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Could not read generated audio"));
        reader.onload = () =>
          typeof reader.result === "string"
            ? resolve(reader.result)
            : reject(new Error("Could not read generated audio"));
        reader.readAsDataURL(blob);
      });
      onNarrationAudioChange(dataUrl);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not generate narration",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const download = () => {
    if (!narrationAudio) return;
    const anchor = document.createElement("a");
    anchor.href = narrationAudio;
    anchor.download = "qwen3-narration.wav";
    anchor.click();
  };

  return (
    <details className="relative">
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground hover:bg-background-elevated">
        <Mic2 className="h-4 w-4" /> Narration
        {narrationAudio ? <span className="text-primary">• Ready</span> : null}
      </summary>
      <div className="absolute bottom-12 right-0 z-20 w-[min(24rem,calc(100vw-2rem))] space-y-3 rounded-lg border border-border bg-background p-4 shadow-xl">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Narration text</label>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            maxLength={10000}
            placeholder="Write the narration for your video…"
            className="w-full resize-y rounded-md border border-border bg-background-elevated p-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background-elevated p-2 text-sm text-foreground">
              {LANGUAGES.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs text-muted-foreground">
          Voice description
          <input
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="A warm, conversational voice"
            className="mt-1 w-full rounded-md border border-border bg-background-elevated p-2 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} disabled={!text.trim() || isGenerating} loading={isGenerating}>
            <Mic2 className="mr-2 h-4 w-4" /> Generate audio
          </Button>
          {narrationAudio ? (
            <>
              <Button variant="outline" onClick={download}>
                <Download className="mr-2 h-4 w-4" /> Download WAV
              </Button>
              <Button variant="ghost" onClick={() => onNarrationAudioChange(null)} aria-label="Remove narration">
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">Generated audio is embedded in the video preview and render.</p>
      </div>
    </details>
  );
};
