import "server-only";

import { google } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateObject, type LanguageModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

// json_object-mode providers (Groq Llama 3.x) emit a benign per-call warning
// that responseFormat schema isn't supported. We rely on prompt-embedded JSON
// + the loose-schema path instead, so silence the noise.
(globalThis as { AI_SDK_LOG_WARNINGS?: ((warnings: unknown[]) => void) | boolean }).AI_SDK_LOG_WARNINGS =
  false;

export type LlmProviderId = "groq" | "gemini" | "ollama";

/** providerOptions shape accepted by generateObject (kept in lockstep with the SDK). */
type ProviderOptions = NonNullable<Parameters<typeof generateObject>[0]["providerOptions"]>;

/**
 * Groq free tier: ~14.4k req/day on llama-3.1-8b-instant, hosted, no local
 * runtime — the default for deployments. json_schema structured outputs are
 * only on newer Groq models, so for Llama 3.x we disable them (json_object
 * mode) and lean on the loose-schema retry in llm-analyst.ts.
 */
export const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

/** Smallest/fastest stable Gemini on the free tier (20 req/day). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

/** Small open-weight model; run `ollama pull llama3.2` first. */
export const DEFAULT_OLLAMA_MODEL = "llama3.2";

/** Groq models with native json_schema structured output support. */
const GROQ_STRUCTURED_OUTPUT_MODELS = [/^moonshotai\/kimi-k2/, /^openai\/gpt-oss/];

export type ResolvedLlm = {
  provider: LlmProviderId;
  modelId: string;
  displayName: string;
  model: LanguageModel;
  /** Provider-specific options to pass through to generateObject. */
  providerOptions?: ProviderOptions;
  /**
   * Whether the model can honor a json_schema (strict) response format. When
   * false the analyst skips the strict attempt and goes straight to the loose
   * json_object path, avoiding a wasted call + SDK warning.
   */
  structuredOutputs: boolean;
};

function resolveProviderId(): LlmProviderId | null {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (explicit === "groq") return "groq";
  if (explicit === "gemini" || explicit === "google") return "gemini";
  if (explicit === "ollama" || explicit === "local") return "ollama";

  if (process.env.GROQ_API_KEY?.trim()) return "groq";
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return "gemini";
  if (process.env.OLLAMA_MODEL?.trim() || process.env.OLLAMA_BASE_URL?.trim()) {
    return "ollama";
  }
  return null;
}

export function getResolvedLlm(): ResolvedLlm | null {
  const provider = resolveProviderId();
  if (!provider) return null;

  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) return null;
    const modelId = process.env.GROQ_ANALYST_MODEL?.trim() || DEFAULT_GROQ_MODEL;
    const groq = createGroq({ apiKey });
    const supportsStructured = GROQ_STRUCTURED_OUTPUT_MODELS.some((re) => re.test(modelId));
    return {
      provider: "groq",
      modelId,
      displayName: `groq:${modelId}`,
      model: groq(modelId),
      providerOptions: supportsStructured
        ? undefined
        : { groq: { structuredOutputs: false } },
      structuredOutputs: supportsStructured,
    };
  }

  if (provider === "gemini") {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) return null;
    const modelId =
      process.env.GEMINI_ANALYST_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
    return {
      provider: "gemini",
      modelId,
      displayName: `gemini:${modelId}`,
      model: google(modelId),
      structuredOutputs: true,
    };
  }

  const modelId = process.env.OLLAMA_MODEL?.trim() || DEFAULT_OLLAMA_MODEL;
  const baseURL =
    process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434/api";
  const ollama = createOllama({ baseURL });
  return {
    provider: "ollama",
    modelId,
    displayName: `ollama:${modelId}`,
    model: ollama(modelId),
    structuredOutputs: true,
  };
}

export function isLlmAnalystConfigured(): boolean {
  return getResolvedLlm() !== null;
}

/** Probe Ollama /api/tags (best-effort; used for clearer errors only). */
export async function isOllamaReachable(): Promise<boolean> {
  const base =
    process.env.OLLAMA_BASE_URL?.trim().replace(/\/api\/?$/, "") ||
    "http://127.0.0.1:11434";
  try {
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { generateObject };
