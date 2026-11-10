export const MODELS = [
  { id: "gpt-6.1-sol:low", name: "GPT-6.1 Sol (Low Reasoning)" },
  { id: "gpt-6.1-sol:medium", name: "GPT-6.1 Sol (Medium Reasoning)" },
  { id: "gpt-6.1-sol:high", name: "GPT-6.1 Sol (High Reasoning)" },
  { id: "gpt-6.1-sol:xhigh", name: "GPT-6.1 Sol (XHigh Reasoning)" },
  { id: "gpt-6.1-sol:max", name: "GPT-6.1 Sol (Max Reasoning)" },
  { id: "gpt-6-astra:low", name: "GPT-6 Astra (Low Reasoning)" },
  { id: "gpt-6-astra:medium", name: "GPT-6 Astra (Medium Reasoning)" },
  { id: "gpt-6-astra:high", name: "GPT-6 Astra (High Reasoning)" },
  { id: "gpt-6-astra:xhigh", name: "GPT-6 Astra (XHigh Reasoning)" },
  { id: "gpt-6-astra:max", name: "GPT-6 Astra (Max Reasoning)" },
  { id: "gpt-5.2:none", name: "GPT-5.2 (No Reasoning)" },
  { id: "gpt-5.2:low", name: "GPT-5.2 (Low Reasoning)" },
  { id: "gpt-5.2:medium", name: "GPT-5.2 (Medium Reasoning)" },
  { id: "gpt-5.2:high", name: "GPT-5.2 (High Reasoning)" },
  { id: "gpt-5.2-pro:medium", name: "GPT-5.2 Pro (Medium)" },
  { id: "gpt-5.2-pro:high", name: "GPT-5.2 Pro (High)" },
  { id: "gpt-5.2-pro:xhigh", name: "GPT-5.2 Pro (XHigh)" },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export type StreamPhase = "idle" | "reasoning" | "generating";

export type GenerationErrorType = "validation" | "api";
